import { HttpError, type Env } from "./auth";
const stamp = () => new Date().toISOString();
export async function indexReleases(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT r.id,r.object_key FROM releases r LEFT JOIN release_indexed i ON i.release_id=r.id WHERE i.release_id IS NULL LIMIT 6",
  ).all<{ id: string; object_key: string }>();
  for (const r of rows.results) {
    const file = await env.MEDIA.get(r.object_key);
    if (!file)
      throw new HttpError(
        503,
        "Историята временно не е достъпна. Опитай отново.",
      );
    const snapshot = JSON.parse(await file.text());
    await env.DB.batch([
      env.DB.prepare(
        "INSERT OR IGNORE INTO release_entities SELECT ?,json_extract(value,'$.id') FROM json_each(?)",
      ).bind(r.id, JSON.stringify(snapshot.content)),
      env.DB.prepare("INSERT OR IGNORE INTO release_indexed VALUES(?)").bind(
        r.id,
      ),
    ]);
  }
  return !!(await env.DB.prepare(
    "SELECT r.id FROM releases r LEFT JOIN release_indexed i ON i.release_id=r.id WHERE i.release_id IS NULL LIMIT 1",
  ).first());
}
export async function purgePlan(env: Env, id: string, version: number) {
  if (typeof id !== "string" || !Number.isInteger(version))
    throw new HttpError(400, "Невалиден запис.");
  if (await indexReleases(env)) return { indexing: true };
  const entity = await env.DB.prepare("SELECT * FROM entities WHERE id=?")
    .bind(id)
    .first<any>();
  if (!entity || !entity.deleted_at)
    throw new HttpError(409, "Окончателно се изтриват само записи от кошчето.");
  if (entity.version !== version)
    throw new HttpError(409, "Записът е променен. Презареди.");
  const refs = await env.DB.prepare(
    "SELECT id FROM entities WHERE (json_extract(data,'$.categoryId')=? OR json_extract(data,'$.albumId')=? OR json_extract(data,'$.galleryAlbumId')=?) LIMIT 1",
  )
    .bind(id, id, id)
    .first();
  if (refs)
    throw new HttpError(
      409,
      "Първо изтрий или премести записите в категорията/албума, включително тези в кошчето.",
    );
  const state = await env.DB.prepare(
    "SELECT * FROM site_state WHERE id=1",
  ).first<any>();
  const releases = await env.DB.prepare(
    "SELECT release_id FROM release_entities WHERE entity_id=? ORDER BY release_id",
  )
    .bind(id)
    .all<{ release_id: string }>();
  const releaseIds = releases.results.map((r) => r.release_id);
  if (releaseIds.includes(state.active_release))
    throw new HttpError(
      409,
      "Записът още присъства в сайта. Първо публикувай премахването му, след това го изтрий окончателно.",
    );
  const data = JSON.parse(entity.data);
  return {
    indexing: false,
    id,
    version,
    title: data.title,
    revision: state.draft_revision,
    activeRelease: state.active_release,
    releaseIds,
    imageIds: [
      ...new Set([data.imageId, data.coverId].filter(Boolean)),
    ] as string[],
  };
}
export async function cleanupObjects(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT object_key FROM object_deletions ORDER BY created_at LIMIT 10",
  ).all<{ object_key: string }>();
  for (const row of rows.results) {
    await env.MEDIA.delete(row.object_key);
    await env.DB.prepare("DELETE FROM object_deletions WHERE object_key=?")
      .bind(row.object_key)
      .run();
  }
  const pending = await env.DB.prepare(
    "SELECT count(*) AS n FROM object_deletions",
  ).first<{ n: number }>();
  return { pending: pending?.n || 0 };
}
export async function removeUnusedMedia(env: Env, id: string) {
  const row = await env.DB.prepare("SELECT * FROM media WHERE id=?")
    .bind(id)
    .first<any>();
  if (!row) return false;
  const results = await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM media WHERE id=? AND object_key=? AND NOT EXISTS(SELECT 1 FROM entities WHERE json_extract(data,'$.imageId')=? OR json_extract(data,'$.coverId')=?) AND NOT EXISTS(SELECT 1 FROM release_media WHERE media_id=?)",
    ).bind(id, row.object_key, id, id, id),
    env.DB.prepare(
      "INSERT OR IGNORE INTO object_deletions SELECT ?,? WHERE changes()=1",
    ).bind(row.object_key, stamp()),
  ]);
  return !!results[0].meta.changes;
}
export async function purgeEntity(env: Env, actor: string, input: any) {
  const plan = await purgePlan(env, input.id, input.version);
  if (plan.indexing)
    throw new HttpError(409, "Историята още се подготвя. Опитай отново.");
  if (input.confirmation !== plan.title)
    throw new HttpError(400, "Въведи точно заглавието за потвърждение.");
  if (
    input.revision !== plan.revision ||
    JSON.stringify(input.releaseIds) !== JSON.stringify(plan.releaseIds)
  )
    throw new HttpError(
      409,
      "Съдържанието е променено. Прегледай изтриването отново.",
    );
  const guard = crypto.randomUUID(),
    ids = JSON.stringify(plan.releaseIds);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO revision_guard VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM entities WHERE id=? AND version=? AND deleted_at IS NOT NULL) AND (SELECT draft_revision FROM site_state WHERE id=1)=? AND (SELECT active_release FROM site_state WHERE id=1) IS ? THEN 1 ELSE 0 END)",
      ).bind(guard, plan.id, plan.version, plan.revision, plan.activeRelease),
      env.DB.prepare(
        "INSERT OR IGNORE INTO object_deletions SELECT object_key,? FROM releases WHERE id IN(SELECT value FROM json_each(?))",
      ).bind(stamp(), ids),
      env.DB.prepare(
        "DELETE FROM release_media WHERE release_id IN(SELECT value FROM json_each(?))",
      ).bind(ids),
      env.DB.prepare(
        "DELETE FROM releases WHERE id IN(SELECT value FROM json_each(?))",
      ).bind(ids),
      env.DB.prepare(
        "DELETE FROM entities WHERE id=? AND version=? AND deleted_at IS NOT NULL",
      ).bind(plan.id, plan.version),
      env.DB.prepare(
        "UPDATE site_state SET published_revision=CASE WHEN published_revision=draft_revision THEN draft_revision+1 ELSE published_revision END,draft_revision=draft_revision+1 WHERE id=1",
      ),
      env.DB.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").bind(
        crypto.randomUUID(),
        "purge",
        plan.id,
        actor,
        stamp(),
      ),
      env.DB.prepare("DELETE FROM revision_guard WHERE id=?").bind(guard),
    ]);
  } catch {
    throw new HttpError(409, "Има нова промяна. Прегледай изтриването отново.");
  }
  let removedImages = 0;
  if (input.includeImages)
    for (const id of plan.imageIds || [])
      if (await removeUnusedMedia(env, id)) removedImages++;
  let pending = 0;
  try {
    pending = (await cleanupObjects(env)).pending;
  } catch {
    pending = -1;
  }
  return { ok: true, removedImages, cleanupPending: pending !== 0 };
}
