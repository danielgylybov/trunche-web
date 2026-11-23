import { describe, it, expect } from "vitest";
const enabled = process.env.CMS_INTEGRATION === "1",
  base = "http://127.0.0.1:8787";
async function api(path: string, method = "GET", data?: any) {
  const r = await fetch(base + "/api/admin/" + path, {
    method,
    headers: {
      Origin: "http://127.0.0.1:5173",
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: r.status, body: (await r.json()) as any };
}
async function publish() {
  const s = (await api("state")).body;
  const r = await fetch(base + "/api/admin/publish", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ revision: s.state.draft_revision }),
  });
  expect(r.status).toBe(200);
  return ((await r.json()) as any).releaseId;
}
async function plan(e: any) {
  for (let i = 0; i < 30; i++) {
    const r = await api("purge-plan", "POST", { id: e.id, version: e.version });
    if (r.status !== 200 || !r.body.indexing) return r;
  }
  throw new Error("Index did not complete");
}
async function trash(e: any) {
  expect(
    (
      await api("entities/" + e.type + "/" + e.id, "DELETE", {
        version: e.version,
      })
    ).status,
  ).toBe(200);
  return { ...e, version: e.version + 1 };
}
async function purge(e: any) {
  const p = await plan(e);
  expect(p.status).toBe(200);
  const r = await api("purge", "POST", {
    ...p.body,
    confirmation: p.body.title,
    includeImages: true,
  });
  expect(r.status).toBe(200);
  return r.body;
}
describe.skipIf(!enabled)("safe final deletion with real D1/R2", () => {
  it("protects active/shared content, purges trash and invalidates historical rollback", async () => {
    const png = Buffer.concat([
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
        "base64",
      ),
      Buffer.from(crypto.randomUUID()),
    ]);
    const uploaded = await fetch(base + "/api/admin/upload", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:5173", "Content-Type": "image/png" },
      body: png,
    });
    expect(uploaded.status).toBeLessThan(300);
    const image = (await uploaded.json()) as any;
    const a = (
        await api("entities/album", "POST", {
          data: { title: "QA purge " + crypto.randomUUID() },
        })
      ).body,
      b = (
        await api("entities/album", "POST", {
          data: { title: "QA purge " + crypto.randomUUID() },
        })
      ).body;
    let p = (
        await api("entities/photo", "POST", {
          data: {
            title: "QA one",
            albumId: a.id,
            imageId: image.id,
            alt: "QA image",
          },
        })
      ).body,
      q = (
        await api("entities/photo", "POST", {
          data: {
            title: "QA two",
            albumId: a.id,
            imageId: image.id,
            alt: "QA image",
          },
        })
      ).body,
      r = (
        await api("entities/photo", "POST", {
          data: {
            title: "QA three",
            albumId: b.id,
            imageId: image.id,
            alt: "QA image",
          },
        })
      ).body;
    expect(
      (
        await api("reorder", "POST", {
          items: [
            { id: p.id, version: p.version },
            { id: r.id, version: r.version },
          ],
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api("reorder", "POST", {
          items: [
            { id: q.id, version: q.version },
            { id: p.id, version: p.version },
          ],
        })
      ).status,
    ).toBe(200);
    p.version++;
    q.version++;
    const old = await publish();
    p = await trash(p);
    expect((await plan(p)).status).toBe(409);
    expect(
      (await api("media/" + image.id, "DELETE", { confirmation: "ИЗТРИЙ" }))
        .status,
    ).toBe(409);
    await publish();
    let preview = await plan(p);
    expect(preview.body.releaseIds).toContain(old);
    expect(
      (await api("purge", "POST", { ...preview.body, confirmation: "wrong" }))
        .status,
    ).toBe(400);
    expect(
      (
        await api("purge", "POST", {
          ...preview.body,
          revision: -1,
          confirmation: preview.body.title,
        })
      ).status,
    ).toBe(409);
    expect((await purge(p)).removedImages).toBe(0);
    expect((await api("rollback", "POST", { releaseId: old })).status).toBe(
      404,
    );
    expect((await fetch(base + "/api/admin/media/" + image.id)).status).toBe(
      200,
    );
    q = await trash(q);
    r = await trash(r);
    await publish();
    expect((await purge(q)).removedImages).toBe(0);
    expect((await purge(r)).removedImages).toBe(1);
    expect((await fetch(base + "/api/admin/media/" + image.id)).status).toBe(
      404,
    );
    const ta = await trash(a),
      tb = await trash(b);
    await publish();
    await purge(ta);
    await purge(tb);
    const state = (await api("state")).body;
    expect(
      state.entities.some((e: any) =>
        [p.id, q.id, r.id, a.id, b.id].includes(e.id),
      ),
    ).toBe(false);
  }, 60000);
});
