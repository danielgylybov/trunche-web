// Copies content and referenced image files from the running local CMS into an ignored bundle.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  target = path.join(root, ".wrangler", "staging-import");
const local = "http://127.0.0.1:8787/api/admin/";
const response = await fetch(local + "state");
if (!response.ok) throw new Error("Start the local CMS API.");
const state = await response.json();
if (!state.user.local)
  throw new Error(
    "Only the loopback development CMS can be exported by this script.",
  );
const entities = state.entities.filter((e) => !e.deletedAt);
const ids = new Set(
  entities.flatMap((e) => [e.data.imageId, e.data.coverId]).filter(Boolean),
);
const media = state.media.filter((m) => ids.has(m.id));
if (media.length !== ids.size)
  throw new Error("Some referenced images are not ready.");
fs.mkdirSync(path.join(target, "images"), { recursive: true });
for (const m of media) {
  const file = path.join(target, "images", m.id);
  if (
    fs.existsSync(file) &&
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") ===
      m.id
  )
    continue;
  const image = await fetch(local + "media/" + m.id);
  if (!image.ok) throw new Error("Image download failed: " + m.id);
  const bytes = Buffer.from(await image.arrayBuffer());
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== m.id)
    throw new Error("Image checksum mismatch.");
  fs.writeFileSync(file, bytes);
}
fs.writeFileSync(
  path.join(target, "manifest.json"),
  JSON.stringify(
    { schemaVersion: 1, exportedAt: new Date().toISOString(), entities, media },
    null,
    2,
  ),
);
console.log(
  "Staging import bundle:",
  entities.length,
  "active records and",
  media.length,
  "verified image files. No memberships or credentials exported.",
);
