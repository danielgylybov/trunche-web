import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "legacy-export.json"), "utf8"),
);
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const sql =
  source.entities
    .map(
      (e) =>
        `INSERT OR IGNORE INTO entities(id,type,data,updated_at,updated_by) VALUES(${quote(e.id)},${quote(e.type)},${quote(JSON.stringify(e.data))},${quote(source.exportedAt)},'legacy-import');`,
    )
    .join("\n") +
  "\nUPDATE site_state SET draft_revision=draft_revision+1 WHERE id=1;";
const file = path.join(root, ".wrangler", "seed-local.sql");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, sql);
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/wrangler/bin/wrangler.js"),
    "d1",
    "execute",
    "trunche-cms",
    "--local",
    "--env",
    "local",
    "--file",
    file,
  ],
  { cwd: root, stdio: "inherit" },
);
process.exit(result.status || 0);
