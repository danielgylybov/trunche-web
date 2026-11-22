import fs from "node:fs";
import { parse } from "jsonc-parser";
const file = new URL("../wrangler.staging.jsonc", import.meta.url);
if (!fs.existsSync(file))
  throw new Error(
    "Create wrangler.staging.jsonc from the staging example and configure the account.",
  );
const errors = [];
const config = parse(fs.readFileSync(file, "utf8"), errors, {
  allowTrailingComma: true,
});
const v = config.vars || {};
const failures = [];
if (errors.length) failures.push("Invalid JSONC.");
if (
  config.name !== "trunche-cms-dev" ||
  v.ENVIRONMENT !== "staging" ||
  v.DEV_AUTH
)
  failures.push("Use the isolated staging Worker without local auth.");
if (
  config.preview_urls !== false ||
  config.workers_dev !== true ||
  config.routes?.length
)
  failures.push(
    "Use one workers.dev staging hostname without production routes or extra previews.",
  );
if (
  !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
    v.ACCESS_TEAM_DOMAIN || "",
  ) ||
  !v.ACCESS_AUDIENCE
)
  failures.push("Configure Access for the staging Worker.");
if (
  !/^https:\/\/trunche-cms-dev\.[a-z0-9-]+\.workers\.dev$/.test(
    v.ADMIN_ORIGIN || "",
  ) ||
  v.ADMIN_ORIGIN.includes("YOUR_SUBDOMAIN") ||
  v.PUBLIC_ORIGIN !== v.ADMIN_ORIGIN
)
  failures.push("Set both origins to the real staging hostname.");
if (
  config.d1_databases?.length !== 1 ||
  config.d1_databases[0].database_name !== "trunche-cms-dev" ||
  !config.d1_databases[0].database_id ||
  config.d1_databases[0].database_id.startsWith("00000000")
)
  failures.push("Use a separate real dev D1 database.");
if (
  config.r2_buckets?.length !== 1 ||
  config.r2_buckets[0].bucket_name !== "trunche-cms-dev-media"
)
  failures.push("Use a separate dev R2 bucket.");
if (failures.length) throw new Error(failures.join("\n"));
console.log(
  "Staging configuration passed. Verify the actual Access allowlist in the account before sharing the URL.",
);
