import { describe, it, expect } from "vitest";
const enabled = process.env.CMS_INTEGRATION === "1";
const base = "http://127.0.0.1:8787";
async function call(
  path: string,
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: "http://127.0.0.1:5173",
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = (await r.json()) as any;
  return { status: r.status, body };
}
describe.skipIf(!enabled)("real local D1 and R2 API", () => {
  it("persists drafts, rejects conflicts, protects media and publishes atomically", async () => {
    const title = "Проверка " + crypto.randomUUID();
    let response = await call("/api/admin/entities/category", "POST", {
      data: {
        title,
        slug: "qa-" + crypto.randomUUID(),
        icon: "cake",
        visible: true,
        sortOrder: 999,
      },
    });
    expect(response.status).toBe(201);
    const category = response.body;
    response = await call("/api/admin/entities/product", "POST", {
      data: {
        title: "Тестова пица",
        categoryId: category.id,
        priceCents: 1450,
        visible: true,
      },
    });
    expect(response.status).toBe(201);
    let product = response.body;
    response = await call("/api/admin/entities/product/" + product.id, "PUT", {
      data: { ...product.data, title: "Променена пица" },
      version: product.version,
    });
    expect(response.status).toBe(200);
    const updated = response.body;
    const stale = await call(
      "/api/admin/entities/product/" + product.id,
      "PUT",
      { data: product.data, version: product.version },
    );
    expect(stale.status).toBe(409);
    product = updated;
    const hostile = await call(
      "/api/admin/entities/product/" + product.id,
      "PUT",
      { data: product.data, version: product.version },
      { Origin: "https://other.example" },
    );
    expect(hostile.status).toBe(403);
    const png = Uint8Array.from(
      Buffer.concat([
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
          "base64",
        ),
        Buffer.from(crypto.randomUUID()),
      ]),
    );
    const upload = await fetch(base + "/api/admin/upload", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:5173", "Content-Type": "image/png" },
      body: png,
    });
    expect(upload.status).toBeLessThan(300);
    const media = (await upload.json()) as any;
    expect((await fetch(base + "/media/" + media.id)).status).toBe(404);
    response = await call("/api/admin/entities/product/" + product.id, "PUT", {
      data: { ...product.data, imageId: media.id },
      version: product.version,
    });
    expect(response.status).toBe(200);
    product = response.body;
    const reordered = await call("/api/admin/reorder", "POST", {
      items: [{ id: product.id, version: product.version }],
    });
    expect(reordered.status).toBe(200);
    const staleOrder = await call("/api/admin/reorder", "POST", {
      items: [{ id: product.id, version: product.version }],
    });
    expect(staleOrder.status).toBe(409);
    product.version++;
    const state = (await call("/api/admin/state")).body;
    const key = crypto.randomUUID();
    const published = await call(
      "/api/admin/publish",
      "POST",
      { revision: state.state.draft_revision },
      { "Idempotency-Key": key },
    );
    expect(published.status).toBe(200);
    const content = await call("/api/content");
    expect(content.body.releaseId).toBe(published.body.releaseId);
    expect(
      content.body.content.find((e: any) => e.id === product.id).data
        .priceCents,
    ).toBe(1450);
    expect(JSON.stringify(content.body)).not.toContain("local@trunche.test");
    expect((await fetch(base + "/media/" + media.id)).status).toBe(200);
    const repeated = await call(
      "/api/admin/publish",
      "POST",
      { revision: state.state.draft_revision },
      { "Idempotency-Key": key },
    );
    expect(repeated.body.releaseId).toBe(published.body.releaseId);
    const deleted = await call(
      "/api/admin/entities/product/" + product.id,
      "DELETE",
      { version: product.version },
    );
    expect(deleted.status).toBe(200);
    const check = (await call("/api/content")).body;
    expect(check.releaseId).toBe(published.body.releaseId);
    expect(check.content.some((e: any) => e.id === product.id)).toBe(true);
    const restored = await call("/api/admin/restore", "POST", {
      id: product.id,
      version: product.version + 1,
    });
    expect(restored.status).toBe(200);
    await call("/api/admin/entities/product/" + product.id, "DELETE", {
      version: product.version + 2,
    });
    await call("/api/admin/entities/category/" + category.id, "DELETE", {
      version: category.version,
    });
  }, 30000);
});
