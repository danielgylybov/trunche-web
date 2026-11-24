import {
  purgePlan,
  purgeEntity,
  cleanupObjects,
  removeUnusedMedia,
} from "./purge";
import { ZodError } from "zod";
import { imageSize } from "image-size";
import {
  authenticate,
  HttpError,
  isLocal,
  verifyOrigin,
  type Env,
} from "./auth";
import { validateEntity, type Entity, type EntityType } from "./model";
import { publicSnapshot } from "./content";
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
const rowEntity = (r: any): Entity => ({
  id: r.id,
  type: r.type,
  data: JSON.parse(r.data),
  version: r.version,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});
async function bodyBytes(request: Request, limit: number) {
  if (Number(request.headers.get("Content-Length") || 0) > limit)
    throw new HttpError(413, "Файлът е прекалено голям.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Липсва съдържание.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, "Файлът е прекалено голям.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return all;
}
async function readJSON(request: Request) {
  try {
    return JSON.parse(
      new TextDecoder().decode(await bodyBytes(request, 256000)),
    );
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Невалидни данни.");
  }
}
async function list(env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM entities ORDER BY type,json_extract(data,'$.sortOrder'),id LIMIT 2001",
  ).all();
  if (results.length > 2000)
    throw new HttpError(413, "Достигнат е лимитът от 2000 записа.");
  return results.map(rowEntity);
}
async function auditStmt(
  env: Env,
  action: string,
  actor: string,
  id: string | null = null,
) {
  return env.DB.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").bind(
    uid(),
    action,
    id,
    actor,
    now(),
  );
}
async function quota(env: Env) {
  const day = now().slice(0, 10);
  const result = await env.DB.prepare(
    "INSERT INTO usage(day,write_count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET write_count=write_count+1 WHERE write_count<5000 RETURNING write_count",
  )
    .bind(day)
    .first();
  if (!result)
    throw new HttpError(
      429,
      "Дневният лимит за промени е достигнат. Опитай утре.",
    );
}
function security(response: Response) {
  const r = new Response(response.body, response);
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "same-origin");
  r.headers.set("X-Frame-Options", "DENY");
  return r;
}
async function mediaResponse(
  env: Env,
  id: string,
  privateView: boolean,
  request: Request,
) {
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new HttpError(404, "Снимката не е намерена.");
  const row = await env.DB.prepare(
    privateView
      ? "SELECT * FROM media WHERE id=? AND state='ready'"
      : "SELECT m.* FROM media m WHERE m.id=? AND m.state='ready' AND EXISTS(SELECT 1 FROM release_media rm WHERE rm.media_id=m.id)",
  )
    .bind(id)
    .first<any>();
  if (!row) throw new HttpError(404, "Снимката не е намерена.");
  const file = await env.MEDIA.get(row.object_key);
  if (!file) throw new HttpError(404, "Снимката не е налична.");
  const headers = new Headers({
    "Content-Type": row.mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": privateView
      ? "private,no-store"
      : "public,max-age=60",
    ETag: file.httpEtag,
  });
  if (!privateView && request.headers.get("If-None-Match") === file.httpEtag)
    return new Response(null, { status: 304, headers });
  return new Response(file.body, { headers });
}
async function publicRoute(request: Request, env: Env, path: string) {
  const headers: Record<string, string> = {
    "Cache-Control": "public,max-age=30",
    "Access-Control-Allow-Origin": new URL(env.PUBLIC_ORIGIN).origin,
    Vary: "Origin",
  };
  if (path === "/api/content") {
    const state = await env.DB.prepare(
      "SELECT active_release FROM site_state WHERE id=1",
    ).first<any>();
    if (!state?.active_release)
      throw new HttpError(404, "Още няма публикувано съдържание.");
    const release = await env.DB.prepare("SELECT * FROM releases WHERE id=?")
      .bind(state.active_release)
      .first<any>();
    const file = await env.MEDIA.get(release.object_key);
    if (!file) throw new HttpError(503, "Публикацията временно не е достъпна.");
    const etag = '"' + release.id + '"';
    if (request.headers.get("If-None-Match") === etag)
      return new Response(null, {
        status: 304,
        headers: { ...headers, ETag: etag },
      });
    return new Response(file.body, {
      headers: { ...headers, "Content-Type": "application/json", ETag: etag },
    });
  }
  if (path.startsWith("/media/")) {
    const response = await mediaResponse(env, path.slice(7), false, request);
    for (const [k, v] of Object.entries(headers))
      if (k !== "Cache-Control") response.headers.set(k, v);
    return response;
  }
  throw new HttpError(404, "Не е намерено.");
}
async function checkReferences(
  env: Env,
  type: EntityType,
  data: Record<string, any>,
) {
  for (const [id, expected] of [
    [data.categoryId, "category"],
    [data.albumId, "album"],
    [data.galleryAlbumId, "album"],
  ] as const)
    if (id) {
      const row = await env.DB.prepare(
        "SELECT id FROM entities WHERE id=? AND type=? AND deleted_at IS NULL",
      )
        .bind(id, expected)
        .first();
      if (!row)
        throw new HttpError(400, "Избери съществуваща категория или албум.");
    }
  if (type === "product" && data.section) {
    const category = await env.DB.prepare(
      "SELECT data FROM entities WHERE id=?",
    )
      .bind(data.categoryId)
      .first<{ data: string }>();
    const categoryData = JSON.parse(category!.data);
    let allowed = categoryData.sections;
    if (!allowed) {
      const legacy = await env.DB.prepare(
        "SELECT DISTINCT json_extract(data,'$.section') AS section FROM entities WHERE type='product' AND json_extract(data,'$.categoryId')=?",
      )
        .bind(data.categoryId)
        .all<{ section: string }>();
      allowed = legacy.results.map((r) => r.section);
    }
    if (!allowed.includes(data.section))
      throw new HttpError(
        400,
        "Избери подкатегория от списъка или я добави в редакцията на категорията.",
      );
  }
  for (const id of [data.imageId, data.coverId])
    if (id) {
      const row = await env.DB.prepare(
        "SELECT id FROM media WHERE id=? AND state='ready'",
      )
        .bind(id)
        .first();
      if (!row) throw new HttpError(400, "Снимката не е готова.");
    }
  if(type==='page'||type==='settings') {
    const duplicate=await env.DB.prepare("SELECT id FROM entities WHERE type=? AND deleted_at IS NULL AND (?='settings' OR json_extract(data,'$.key')=?)").bind(type,type,data.key||null).first<any>();
    return duplicate?.id as string|undefined;
  }
  if (type === "category") {
    const slug = await env.DB.prepare(
      "SELECT id FROM entities WHERE type='category' AND deleted_at IS NULL AND json_extract(data,'$.slug')=?",
    )
      .bind(data.slug)
      .first<any>();
    return slug?.id as string | undefined;
  }
}
function referenceGuard(data: Record<string, any>) {
  const checks = [
    ["categoryId", "entities", "type='category' AND deleted_at IS NULL"],
    ["albumId", "entities", "type='album' AND deleted_at IS NULL"],
    ["galleryAlbumId", "entities", "type='album' AND deleted_at IS NULL"],
    ["imageId", "media", "state='ready'"],
    ["coverId", "media", "state='ready'"],
  ];
  return {
    sql: checks
      .map(
        ([, table, where]) =>
          `(? IS NULL OR EXISTS(SELECT 1 FROM ${table} WHERE id=? AND ${where}))`,
      )
      .join(" AND "),
    bindings: checks.flatMap(([key]) => [data[key] || null, data[key] || null]),
  };
}
async function saveEntity(
  request: Request,
  env: Env,
  actor: string,
  type: EntityType,
  id?: string,
) {
  const input = await readJSON(request);
  const data = validateEntity(type, input.data);
  const duplicate = await checkReferences(env, type, data);
  if (duplicate && duplicate !== id)
    throw new HttpError(409, type==='category'?"Този адрес на категория вече съществува.":"Този блок вече съществува. Отвори го от списъка за редакция.");
  if (type === "category" && id && Array.isArray((data as any).sections)) {
    const children = await env.DB.prepare(
      "SELECT data FROM entities WHERE type='product' AND json_extract(data,'$.categoryId')=?",
    )
      .bind(id)
      .all<{ data: string }>();
    if (
      children.results.some((row) => {
        const section = JSON.parse(row.data).section;
        return section && !(data as any).sections.includes(section);
      })
    )
      throw new HttpError(
        409,
        "Има предложения в премахнатата подкатегория, включително в кошчето. Първо ги премести или изтрий окончателно.",
      );
  }
  const references = referenceGuard(data);
  const stamp = now(),
    recordId = id || uid();
  if (id) {
    if (!Number.isInteger(input.version))
      throw new HttpError(400, "Липсва версия на записа.");
    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE entities SET data=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND type=? AND version=? AND deleted_at IS NULL AND ${references.sql}`,
      ).bind(
        JSON.stringify(data),
        stamp,
        actor,
        id,
        type,
        input.version,
        ...references.bindings,
      ),
      env.DB.prepare(
        "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1 AND changes()=1",
      ),
    ]);
    if (!results[0].meta.changes)
      throw new HttpError(
        409,
        "Записът е променен или премахнат. Презареди списъка, преди да опиташ пак.",
      );
    await (await auditStmt(env, "update", actor, id)).run();
  } else {
    const count = await env.DB.prepare(
      "SELECT count(*) AS n FROM entities",
    ).first<{ n: number }>();
    if ((count?.n || 0) >= 2000)
      throw new HttpError(413, "Достигнат е лимитът от 2000 записа.");
    const created = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO entities(id,type,data,updated_at,updated_by) SELECT ?,?,?,?,? WHERE ${references.sql}`,
      ).bind(
        recordId,
        type,
        JSON.stringify(data),
        stamp,
        actor,
        ...references.bindings,
      ),
      env.DB.prepare(
        "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1 AND changes()=1",
      ),
      await auditStmt(env, "create", actor, recordId),
    ]);
    if (!created[0].meta.changes)
      throw new HttpError(
        409,
        "Свързана категория или снимка е премахната. Презареди.",
      );
  }
  return json(
    rowEntity(
      await env.DB.prepare("SELECT * FROM entities WHERE id=?")
        .bind(recordId)
        .first(),
    ),
    id ? 200 : 201,
  );
}
async function upload(request: Request, env: Env, actor: string) {
  const mime = request.headers.get("Content-Type")?.split(";")[0] || "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new HttpError(415, "Избери JPEG, PNG или WebP снимка.");
  const bytes = await bodyBytes(request, 2_000_000);
  let dimensions;
  try {
    dimensions = imageSize(bytes);
  } catch {
    throw new HttpError(400, "Файлът не е валидна снимка.");
  }
  const actual = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[
    dimensions.type as string
  ];
  if (
    actual !== mime ||
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width > 2500 ||
    dimensions.height > 2500
  )
    throw new HttpError(
      400,
      "Снимката трябва да е до 2500 px и в правилния формат.",
    );
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const existing = await env.DB.prepare("SELECT * FROM media WHERE id=?")
    .bind(hash)
    .first<any>();
  if (existing?.state === "ready")
    return json({
      id: hash,
      url: "/api/admin/media/" + hash,
      width: existing.width,
      height: existing.height,
    });
  if (existing?.state === "pending")
    throw new HttpError(
      409,
      "Тази снимка се обработва. Опитай отново след малко.",
    );
  if (existing?.state === "failed")
    await env.DB.prepare("DELETE FROM media WHERE id=? AND state='failed'")
      .bind(hash)
      .run();
  const key = "images/" + hash + "/" + uid(),
    day = now().slice(0, 10);
  const reserved = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO usage(day) VALUES(?) ON CONFLICT DO NOTHING",
    ).bind(day),
    env.DB.prepare(
      "INSERT INTO media SELECT ?,?,?,?,?,?,?,?,'pending' WHERE (SELECT COALESCE(SUM(size),0) FROM media)+?<=8000000000 AND (SELECT count(*) FROM media)<2000 AND (SELECT upload_count FROM usage WHERE day=?)<500",
    ).bind(
      hash,
      key,
      mime,
      bytes.length,
      dimensions.width,
      dimensions.height,
      now(),
      actor,
      bytes.length,
      day,
    ),
    env.DB.prepare(
      "UPDATE usage SET upload_count=upload_count+1 WHERE day=? AND changes()=1",
    ).bind(day),
  ]);
  if (!reserved[1].meta.changes)
    throw new HttpError(429, "Достигнат е лимитът за снимки или място.");
  try {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
    await env.DB.prepare("UPDATE media SET state='ready' WHERE id=?")
      .bind(hash)
      .run();
  } catch {
    await env.MEDIA.delete(key).catch(() => {});
    await env.DB.prepare("UPDATE media SET state='failed' WHERE id=?")
      .bind(hash)
      .run();
    throw new HttpError(503, "Качването прекъсна. Опитай отново.");
  }
  return json(
    {
      id: hash,
      url: "/api/admin/media/" + hash,
      width: dimensions.width,
      height: dimensions.height,
    },
    201,
  );
}
async function publish(request: Request, env: Env, actor: string) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new HttpError(400, "Липсва ключ на публикацията.");
  const previous = await env.DB.prepare(
    "SELECT id FROM releases WHERE request_key=?",
  )
    .bind(key)
    .first<any>();
  if (previous) return json({ releaseId: previous.id });
  const limits = await env.DB.prepare(
    "SELECT count(*) AS total,sum(created_at>=?) AS today FROM releases",
  )
    .bind(now().slice(0, 10))
    .first<{ total: number; today: number }>();
  if ((limits?.total || 0) >= 100 || (limits?.today || 0) >= 20)
    throw new HttpError(
      429,
      "Достигнат е лимитът за публикации (20 дневно / 100 запазени версии).",
    );

  const input = await readJSON(request);
  const state = await env.DB.prepare(
    "SELECT * FROM site_state WHERE id=1",
  ).first<any>();
  if (input.revision !== state.draft_revision)
    throw new HttpError(
      409,
      "Съдържанието е променено. Прегледай новите промени преди публикуване.",
    );
  const entities = (await list(env)).filter((e) => !e.deletedAt);
  if (!entities.some((e) => e.type === "category"))
    throw new HttpError(400, "Добави поне една категория.");
  const media = await env.DB.prepare(
    "SELECT id FROM media WHERE state='ready'",
  ).all<{ id: string }>();
  let snapshot;
  try {
    snapshot = publicSnapshot(
      entities,
      new Set(media.results.map((m) => m.id)),
    );
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
  const id = uid(),
    objectKey = "releases/" + id + ".json",
    stamp = now();
  const payload = JSON.stringify({
    ...snapshot,
    releaseId: id,
    publishedAt: stamp,
  });
  if (new TextEncoder().encode(payload).length > 1_000_000)
    throw new HttpError(413, "Публикацията е прекалено голяма.");
  await env.MEDIA.put(objectKey, payload, {
    httpMetadata: { contentType: "application/json" },
  });
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO revision_guard VALUES(?,CASE WHEN (SELECT draft_revision FROM site_state WHERE id=1)=? THEN 1 ELSE 0 END)",
      ).bind(id, state.draft_revision),
      env.DB.prepare("INSERT INTO releases VALUES(?,?,?,?,?,?)").bind(
        id,
        objectKey,
        stamp,
        actor,
        key,
        state.draft_revision,
      ),
      env.DB.prepare(
        "INSERT INTO release_entities SELECT ?,json_extract(value,'$.id') FROM json_each(?)",
      ).bind(id, JSON.stringify(snapshot.content)),
      env.DB.prepare("INSERT INTO release_indexed VALUES(?)").bind(id),
      env.DB.prepare(
        "INSERT INTO release_media(release_id,media_id) SELECT ?,value FROM json_each(?)",
      ).bind(id, JSON.stringify(snapshot.mediaIds)),
      env.DB.prepare(
        "UPDATE site_state SET active_release=?,published_revision=? WHERE id=1",
      ).bind(id, state.draft_revision),
      await auditStmt(env, "publish", actor, id),
      env.DB.prepare("DELETE FROM revision_guard WHERE id=?").bind(id),
    ]);
  } catch {
    await env.MEDIA.delete(objectKey).catch(() => {});
    const retried = await env.DB.prepare(
      "SELECT id FROM releases WHERE request_key=?",
    )
      .bind(key)
      .first<any>();
    if (retried) return json({ releaseId: retried.id });
    throw new HttpError(
      409,
      "Има нова промяна или друга публикация. Презареди и опитай отново.",
    );
  }
  return json({ releaseId: id, publishedAt: stamp });
}
async function adminRoute(request: Request, env: Env, path: string) {
  const user = await authenticate(request, env);
  verifyOrigin(request, env);
  if (!["GET", "HEAD"].includes(request.method)) await quota(env);
  if (path === "/api/admin/state" && request.method === "GET") {
    const state = await env.DB.prepare(
      "SELECT * FROM site_state WHERE id=1",
    ).first<any>();
    const media = await env.DB.prepare(
      "SELECT id,mime,size,width,height,created_at FROM media WHERE state='ready' ORDER BY created_at DESC LIMIT 2000",
    ).all();
    let publishedContent: any[] = [];
    if (state?.active_release) {
      const release = await env.DB.prepare(
        "SELECT object_key FROM releases WHERE id=?",
      )
        .bind(state.active_release)
        .first<{ object_key: string }>();
      const file = release ? await env.MEDIA.get(release.object_key) : null;
      if (!file)
        throw new HttpError(
          503,
          "Публикуваната версия временно не е достъпна.",
        );
      publishedContent = JSON.parse(await file.text()).content;
    }
    return json({
      publishedContent,
      user: { ...user, environment: env.ENVIRONMENT },
      entities: await list(env),
      media: media.results,
      state,
      releases: (
        await env.DB.prepare(
          "SELECT id,created_at,created_by FROM releases ORDER BY created_at DESC LIMIT 20",
        ).all()
      ).results,
    });
  }
  if (
    [
      "/api/admin/purge-plan",
      "/api/admin/purge",
      "/api/admin/cleanup",
    ].includes(path) &&
    request.method === "POST"
  ) {
    if (user.role !== "owner")
      throw new HttpError(
        403,
        "Само собственикът може да изтрива окончателно.",
      );
    if (path.endsWith("/cleanup")) return json(await cleanupObjects(env));
    const input = await readJSON(request);
    return json(
      path.endsWith("/purge-plan")
        ? await purgePlan(env, input.id, input.version)
        : await purgeEntity(env, user.email, input),
    );
  }
  if (path.startsWith("/api/admin/media/") && request.method === "DELETE") {
    if (user.role !== "owner")
      throw new HttpError(
        403,
        "Само собственикът може да изтрива окончателно.",
      );
    const input = await readJSON(request),
      id = path.slice("/api/admin/media/".length);
    if (input.confirmation !== "ИЗТРИЙ")
      throw new HttpError(400, "Потвърди изтриването.");
    if (!(await removeUnusedMedia(env, id)))
      throw new HttpError(
        409,
        "Снимката се използва в запис, кошчето или запазена публикация. Първо премахни връзките към нея.",
      );
    let pending = false;
    try {
      pending = (await cleanupObjects(env)).pending > 0;
    } catch {
      pending = true;
    }
    return json({ ok: true, cleanupPending: pending });
  }
  if (path === "/api/admin/reorder" && request.method === "POST") {
    const input = await readJSON(request);
    if (
      !Array.isArray(input.items) ||
      input.items.length > 500 ||
      !input.items.length
    )
      throw new HttpError(400, "Невалидна подредба.");
    const seen = new Set<string>();
    for (const item of input.items) {
      if (
        typeof item.id !== "string" ||
        !Number.isInteger(item.version) ||
        seen.has(item.id)
      )
        throw new HttpError(400, "Невалидна подредба.");
      seen.add(item.id);
    }
    const items = JSON.stringify(input.items);
    const guardId = uid();
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO revision_guard VALUES(?,CASE WHEN
 (SELECT count(*) FROM entities e JOIN json_each(?) j ON e.id=json_extract(j.value,'$.id') AND e.version=json_extract(j.value,'$.version') WHERE e.deleted_at IS NULL)=?
 AND (SELECT count(DISTINCT e.type) FROM entities e JOIN json_each(?) j ON e.id=json_extract(j.value,'$.id'))=1 AND (SELECT count(DISTINCT coalesce(json_extract(e.data,'$.albumId'),json_extract(e.data,'$.categoryId'),'')) FROM entities e JOIN json_each(?) j ON e.id=json_extract(j.value,'$.id'))=1 THEN 1 ELSE 0 END)`,
        ).bind(guardId, items, input.items.length, items, items),
        env.DB.prepare(
          `UPDATE entities SET data=json_set(data,'$.sortOrder',(SELECT CAST(j.key AS INTEGER) FROM json_each(?) j WHERE json_extract(j.value,'$.id')=entities.id)),version=version+1,updated_at=?,updated_by=? WHERE id IN(SELECT json_extract(value,'$.id') FROM json_each(?))`,
        ).bind(items, now(), user.email, items),
        env.DB.prepare(
          "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1",
        ),
        await auditStmt(env, "reorder", user.email),
        env.DB.prepare("DELETE FROM revision_guard WHERE id=?").bind(guardId),
      ]);
    } catch {
      throw new HttpError(409, "Подредбата е променена. Презареди.");
    }
    return json({ ok: true });
  }
  if (path === "/api/admin/restore" && request.method === "POST") {
    const input = await readJSON(request);
    if (typeof input.id !== "string" || !Number.isInteger(input.version))
      throw new HttpError(400, "Невалиден запис.");
    const row = await env.DB.prepare(
      "SELECT * FROM entities WHERE id=? AND deleted_at IS NOT NULL",
    )
      .bind(input.id)
      .first<any>();
    if (!row) throw new HttpError(404, "Записът не е в кошчето.");
    const duplicate = await checkReferences(
      env,
      row.type,
      JSON.parse(row.data),
    );
    if (duplicate && duplicate !== input.id)
      throw new HttpError(409, "Този адрес на категория вече съществува.");
    const references = referenceGuard(JSON.parse(row.data));
    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE entities SET deleted_at=NULL,version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=? AND deleted_at IS NOT NULL AND ${references.sql}`,
      ).bind(
        now(),
        user.email,
        input.id,
        input.version,
        ...references.bindings,
      ),
      env.DB.prepare(
        "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1 AND changes()=1",
      ),
    ]);
    if (!results[0].meta.changes)
      throw new HttpError(409, "Записът е променен.");
    return json({ ok: true });
  }
  if (path === "/api/admin/rollback" && request.method === "POST") {
    if (user.role !== "owner")
      throw new HttpError(
        403,
        "Само собственикът може да възстанови публикация.",
      );
    const input = await readJSON(request);
    const release = await env.DB.prepare("SELECT * FROM releases WHERE id=?")
      .bind(input.releaseId)
      .first<any>();
    if (!release) throw new HttpError(404, "Публикацията не съществува.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE site_state SET active_release=?,published_revision=? WHERE id=1",
      ).bind(release.id, release.draft_revision),
      await auditStmt(env, "rollback", user.email, release.id),
    ]);
    return json({ releaseId: release.id });
  }
  if (path === "/api/admin/upload" && request.method === "POST")
    return upload(request, env, user.email);
  if (path.startsWith("/api/admin/media/") && request.method === "GET")
    return mediaResponse(
      env,
      path.slice("/api/admin/media/".length),
      true,
      request,
    );
  if (path === "/api/admin/preview" && request.method === "GET") {
    const media = await env.DB.prepare(
      "SELECT id FROM media WHERE state='ready'",
    ).all<{ id: string }>();
    return json(
      publicSnapshot(
        (await list(env)).filter((e) => !e.deletedAt),
        new Set(media.results.map((m) => m.id)),
      ),
    );
  }
  if (path === "/api/admin/publish" && request.method === "POST")
    return publish(request, env, user.email);
  if (path === "/api/admin/export" && request.method === "GET") {
    if (user.role !== "owner")
      throw new HttpError(403, "Само собственикът може да експортира.");
    return json({
      schemaVersion: 1,
      exportedAt: now(),
      entities: await list(env),
      media: (await env.DB.prepare("SELECT * FROM media").all()).results,
    });
  }
  const entityMatch = path.match(
    /^\/api\/admin\/entities\/(category|product|album|photo|page|announcement|settings)(?:\/([a-zA-Z0-9-]{1,80}))?$/,
  );
  if (entityMatch) {
    const type = entityMatch[1] as EntityType,
      id = entityMatch[2];
    if (request.method === "POST" && !id)
      return saveEntity(request, env, user.email, type);
    if (request.method === "PUT" && id)
      return saveEntity(request, env, user.email, type, id);
    if (request.method === "DELETE" && id) {
      const input = await readJSON(request);
      const references = await env.DB.prepare(
        "SELECT id FROM entities WHERE deleted_at IS NULL AND (json_extract(data,'$.categoryId')=? OR json_extract(data,'$.albumId')=? OR json_extract(data,'$.galleryAlbumId')=?) LIMIT 1",
      )
        .bind(id, id, id)
        .first();
      if (references)
        throw new HttpError(
          409,
          "Първо премести съдържанието или премахни връзките от предложенията към тази категория/албум.",
        );
      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE entities SET deleted_at=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND type=? AND version=? AND deleted_at IS NULL",
        ).bind(now(), now(), user.email, id, type, input.version),
        env.DB.prepare(
          "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1 AND changes()=1",
        ),
      ]);
      if (!results[0].meta.changes)
        throw new HttpError(409, "Записът е променен. Презареди и опитай пак.");
      await (await auditStmt(env, "trash", user.email, id)).run();
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Тази операция не съществува.");
}
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      const path = new URL(request.url).pathname;
      if (path === "/api/content" || path.startsWith("/media/")) {
        if (env.ENVIRONMENT === "staging") await authenticate(request, env);
        if (request.method !== "GET" && request.method !== "HEAD")
          throw new HttpError(405, "Непозволен метод.");
        const useCache =
          env.ENVIRONMENT === "production" && !new URL(request.url).search;
        const cacheKey = new Request(request.url, { method: "GET" });
        let response = useCache
          ? await (caches as CacheStorage & { default: Cache }).default.match(
              cacheKey,
            )
          : undefined;
        if (!response) {
          response = security(await publicRoute(request, env, path));
          if (useCache && response.ok)
            ctx.waitUntil(
              (caches as CacheStorage & { default: Cache }).default.put(
                cacheKey,
                response.clone(),
              ),
            );
        }
        return request.method === "HEAD"
          ? new Response(null, response)
          : response;
      }
      if (path.startsWith("/api/admin/"))
        return security(await adminRoute(request, env, path));
      if (path.startsWith("/api/")) throw new HttpError(404, "Не е намерено.");
      await authenticate(request, env);
      return security(await env.ASSETS.fetch(request));
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          {
            error: error.issues.map((i) => i.message).join(" "),
            issues: error.issues,
          },
          400,
        );
      console.error(
        "CMS operation failed",
        error instanceof Error ? error.message : "unknown",
      );
      return json(
        {
          error:
            "Операцията не завърши. Промените във формата са запазени. Опитай отново.",
        },
        500,
      );
    }
  },
};
