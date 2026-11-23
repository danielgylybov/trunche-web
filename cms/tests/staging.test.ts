import { describe, it, expect } from "vitest";
import worker from "../worker/index";
import type { Env } from "../worker/auth";
const env = {
  ENVIRONMENT: "staging",
  ADMIN_ORIGIN: "https://trunche-cms-dev.demo.workers.dev",
  PUBLIC_ORIGIN: "https://trunche-cms-dev.demo.workers.dev",
  ACCESS_TEAM_DOMAIN: "https://demo.cloudflareaccess.com",
  ACCESS_AUDIENCE: "dev-audience",
  DB: {
    prepare: () => {
      throw new Error("Unauthenticated request must not reach D1");
    },
  },
  MEDIA: {},
  ASSETS: {
    fetch: () => {
      throw new Error("Must not serve assets");
    },
  },
} as unknown as Env;
const ctx = { waitUntil: () => {} } as unknown as ExecutionContext;
describe("private staging boundary", () => {
  for (const path of [
    "/",
    "/site/index.html",
    "/api/content",
    "/media/" + "a".repeat(64),
    "/api/admin/state",
  ])
    it("requires a signed Access token for " + path, async () => {
      const response = await worker.fetch(
        new Request(env.ADMIN_ORIGIN + path),
        env,
        ctx,
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
  it("never uses the loopback development bypass in staging", async () => {
    const response = await worker.fetch(
      new Request("http://127.0.0.1/site/index.html"),
      { ...env, DEV_AUTH: "local-only" },
      ctx,
    );
    expect(response.status).toBe(503);
  });
});
