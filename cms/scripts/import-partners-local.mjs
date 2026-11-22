// Imports legacy partner images from the repository into local R2; no remote writes.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "legacy-export.json"), "utf8"),
);
const base = "http://127.0.0.1:8787/api/admin/",
  origin = "http://127.0.0.1:5173";
const state = await (await fetch(base + "state")).json();
if (!state.user.local) throw new Error("Local migration only.");
for (const entry of source.partnerImages) {
  const url = new URL(entry.source);
  if (url.hostname !== "trunche.com") {
    console.log("Needs a fresh image:", entry.entityId);
    continue;
  }
  const entity = state.entities.find((e) => e.id === entry.entityId);
  if (entity.data.imageId) continue;
  const bytes = fs.readFileSync(path.join(root, "..", url.pathname));
  const uploaded = await fetch(base + "upload", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "image/jpeg" },
    body: bytes,
  });
  const media = await uploaded.json();
  if (!uploaded.ok) throw new Error(media.error);
  const result = await fetch(base + "entities/product/" + entity.id, {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { ...entity.data, imageId: media.id },
      version: entity.version,
    }),
  });
  if (!result.ok) throw new Error(await result.text());
  console.log("Imported partner:", entity.data.title);
}
