import fs from "node:fs";
import {parse} from "jsonc-parser";
const errors=[];
const config = parse(
  fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"), errors, {allowTrailingComma:true}
);
if(errors.length)throw new Error("Invalid wrangler configuration.");
const failures = [];
if (config.vars?.ENVIRONMENT !== "production" || config.vars?.DEV_AUTH)
  failures.push("Production must not enable local authentication.");
if (!config.vars?.ACCESS_TEAM_DOMAIN || !config.vars?.ACCESS_AUDIENCE)
  failures.push(
    "Configure the Cloudflare Access team URL and application audience.",
  );
if (
  config.d1_databases?.some(
    (db) => !db.database_id || db.database_id.startsWith("00000000"),
  )
)
  failures.push("Replace the placeholder D1 database ID.");
if (
  !config.routes?.some(
    (route) => route.custom_domain && route.pattern === "admin.trunche.com",
  )
)
  failures.push(
    "Configure the protected admin.trunche.com custom domain route.",
  );
if (config.workers_dev !== false || config.preview_urls !== false)
  failures.push(
    "Disable workers.dev and preview URLs to prevent Access bypass.",
  );
if (failures.length) {
  console.error(
    "Deployment is not configured:\n" +
      failures.map((f) => "• " + f).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Production configuration checks passed. Access policy, membership and billing still require account verification.",
);
