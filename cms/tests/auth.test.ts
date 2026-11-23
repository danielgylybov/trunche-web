import { describe, it, expect, afterEach, vi } from "vitest";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { authenticate, isLocal, verifyOrigin, type Env } from "../worker/auth";
const env = (extra: Partial<Env> = {}): Env => ({
  ENVIRONMENT: "production",
  ADMIN_ORIGIN: "https://admin.trunche.com",
  PUBLIC_ORIGIN: "https://trunche.com",
  ACCESS_TEAM_DOMAIN: "https://trunche.cloudflareaccess.com",
  ACCESS_AUDIENCE: "audience",
  MEDIA: {} as any,
  ASSETS: {} as any,
  DB: {
    prepare: () => ({
      bind: () => ({ first: async () => ({ role: "editor" }) }),
    }),
  } as any,
  ...extra,
});
afterEach(() => vi.unstubAllGlobals());
describe("Access isolation", () => {
  it("permits local auth only on loopback in the explicit development environment", async () => {
    const local = env({ ENVIRONMENT: "development", DEV_AUTH: "local-only" });
    expect(isLocal(new Request("http://127.0.0.1:8787"), local)).toBe(true);
    expect(isLocal(new Request("https://example.com"), local)).toBe(false);
    await expect(
      authenticate(
        new Request("https://example.com"),
        env({ DEV_AUTH: "local-only" }),
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("requires a signed token and never trusts an email header", async () => {
    await expect(
      authenticate(
        new Request("https://admin.trunche.com", {
          headers: {
            "Cf-Access-Authenticated-User-Email": "owner@example.com",
          },
        }),
        env(),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("checks origin on changes", () => {
    expect(() =>
      verifyOrigin(
        new Request("https://admin.trunche.com/api/admin/publish", {
          method: "POST",
          headers: {
            Origin: "https://evil.example",
            "Content-Type": "application/json",
          },
        }),
        env(),
      ),
    ).toThrow();
  });
  it("verifies signature, audience, expiry and database membership", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    jwk.kid = "test";
    jwk.alg = "RS256";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ keys: [jwk] }), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const token = async (aud = "audience", expiry = "5m") =>
      new SignJWT({ email: "EDITOR@EXAMPLE.COM" })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer("https://trunche.cloudflareaccess.com")
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime(expiry)
        .sign(privateKey);
    const req = (jwt: string) =>
      new Request("https://admin.trunche.com/api/admin/state", {
        headers: { "Cf-Access-Jwt-Assertion": jwt },
      });
    await expect(
      authenticate(req(await token()), env()),
    ).resolves.toMatchObject({
      email: "editor@example.com",
      role: "editor",
      local: false,
    });
    await expect(
      authenticate(req(await token("wrong")), env()),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      authenticate(req(await token("audience", "-1s")), env()),
    ).rejects.toMatchObject({ status: 401 });
    const unapproved = env({
      MEDIA: {} as any,
      ASSETS: {} as any,
      DB: {
        prepare: () => ({ bind: () => ({ first: async () => null }) }),
      } as any,
    });
    await expect(
      authenticate(req(await token()), unapproved),
    ).rejects.toMatchObject({ status: 403 });
  });
});
