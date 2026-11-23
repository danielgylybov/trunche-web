import { createRemoteJWKSet, jwtVerify } from "jose";
export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  DEV_AUTH?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUDIENCE?: string;
  ADMIN_ORIGIN: string;
  PUBLIC_ORIGIN: string;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export function isLocal(request: Request, env: Env) {
  const u = new URL(request.url);
  return (
    env.ENVIRONMENT === "development" &&
    env.DEV_AUTH === "local-only" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)
  );
}
export async function authenticate(request: Request, env: Env) {
  if (isLocal(request, env))
    return { email: "local@trunche.test", role: "owner" as const, local: true };
  if (env.DEV_AUTH)
    throw new HttpError(503, "Невалидна конфигурация за достъп.");
  const team = env.ACCESS_TEAM_DOMAIN?.trim(),
    audience = env.ACCESS_AUDIENCE?.trim();
  if (
    !team ||
    !audience ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)
  )
    throw new HttpError(503, "Входът още не е конфигуриран.");
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new HttpError(401, "Влез в админ панела.");
  let email: string;
  try {
    if (!keys.has(team))
      keys.set(
        team,
        createRemoteJWKSet(new URL(team + "/cdn-cgi/access/certs")),
      );
    const { payload } = await jwtVerify(token, keys.get(team)!, {
      issuer: team,
      audience,
      algorithms: ["RS256"],
    });
    if (typeof payload.email !== "string") throw new Error();
    email = payload.email.toLowerCase();
  } catch {
    throw new HttpError(401, "Сесията изтече. Влез отново.");
  }
  const member = await env.DB.prepare(
    "SELECT role FROM members WHERE email=? AND active=1",
  )
    .bind(email)
    .first<{ role: "owner" | "editor" }>();
  if (!member) throw new HttpError(403, "Този профил няма редакторски достъп.");
  return { email, role: member.role, local: false };
}
export function verifyOrigin(request: Request, env: Env) {
  if (["GET", "HEAD"].includes(request.method)) return;
  const origin = request.headers.get("Origin");
  const expected = new URL(env.ADMIN_ORIGIN).origin;
  if (origin !== expected)
    throw new HttpError(403, "Непозволен източник на заявката.");
  if (
    !request.headers.get("Content-Type")?.startsWith("application/json") &&
    !request.headers.get("Content-Type")?.startsWith("image/")
  )
    throw new HttpError(415, "Неподдържан тип на заявката.");
}
