// Writes ONLY to the explicitly named dev D1/R2 resources. No production reset/deletion.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "jsonc-parser";
const root = path.resolve(import.meta.dirname, ".."),
  configPath = path.join(root, "wrangler.staging.jsonc");
const config = parse(fs.readFileSync(configPath, "utf8"));
if (
  config.name !== "trunche-cms-dev" ||
  config.vars.ENVIRONMENT !== "staging" ||
  config.d1_databases[0].database_name !== "trunche-cms-dev" ||
  config.r2_buckets[0].bucket_name !== "trunche-cms-dev-media"
)
  throw new Error("Import is restricted to dev resources.");
const owner = process.argv[2]?.trim().toLowerCase();
if (!owner || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner))
  throw new Error("Provide the approved staging owner email.");
const bundle = path.join(root, ".wrangler", "staging-import");
const manifest = JSON.parse(
  fs.readFileSync(path.join(bundle, "manifest.json"), "utf8"),
);
if (manifest.schemaVersion !== 1) throw new Error("Unsupported import bundle.");
const wrangler = path.join(
  root,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
function cli(args) {
  const r = spawnSync(
    process.execPath,
    [wrangler, ...args, "--config", configPath],
    { cwd: root, stdio: "inherit" },
  );
  if (r.status !== 0)
    throw new Error(
      "Wrangler command failed; import stopped. Re-running does not overwrite existing content.",
    );
}
let uploaded = 0;
for (const m of manifest.media) {
  if (!/^[a-f0-9]{64}$/.test(m.id)) throw new Error("Invalid image hash.");
  cli([
    "r2",
    "object",
    "put",
    "trunche-cms-dev-media/images/" + m.id,
    "--file",
    path.join(bundle, "images", m.id),
    "--content-type",
    m.mime,
    "--remote",
  ]);
  uploaded++;
  if (uploaded % 10 === 0)
    console.log("Uploaded", uploaded, "of", manifest.media.length);
}
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const stamp = new Date().toISOString();
const statements = manifest.media.map(
  (m) =>
    `INSERT OR IGNORE INTO media(id,object_key,mime,size,width,height,created_at,created_by,state) VALUES(${[m.id, "images/" + m.id, m.mime, m.size, m.width, m.height, stamp, "staging-import", "ready"].map(quote).join(",")});`,
);
statements.push(
  ...manifest.entities.map(
    (e) =>
      `INSERT OR IGNORE INTO entities(id,type,data,updated_at,updated_by) VALUES(${[e.id, e.type, JSON.stringify(e.data), stamp, "staging-import"].map(quote).join(",")});`,
  ),
);
statements.push(
  `INSERT OR IGNORE INTO members(email,role,active) VALUES(${quote(owner)},'owner',1);`,
  "UPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1;",
);
const file = path.join(bundle, "import.sql");
fs.writeFileSync(file, statements.join("\n"));
cli(["d1", "execute", "trunche-cms-dev", "--remote", "--file", file]);
console.log(
  "Dev content imported as drafts. Publish after signing in to the dev admin.",
);
