// Read-only download from the legacy public gallery; writes ONLY to the local CMS.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "legacy-export.json"), "utf8"),
);
const origin = "http://127.0.0.1:5173",
  base = "http://127.0.0.1:8787";
async function api(route, body) {
  const response = await fetch(base + "/api/admin/" + route, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
const state = await api("state");
if (!state.user.local) throw new Error("Local migration only.");
const existing = new Set(
  state.entities.filter((e) => e.type === "photo").map((e) => e.data.title),
);
let count = 0;
const limit = Number(process.argv[2] || source.galleryFiles.length);
for (const file of source.galleryFiles.slice(0, limit)) {
  const title = file.name + " · " + file.id.slice(-6);
  if (existing.has(title)) continue;
  let bytes, response;
  for (const size of [1600, 1200, 960, 640]) {
    response = await fetch(
      "https://drive.google.com/thumbnail?id=" +
        encodeURIComponent(file.id) +
        "&sz=w" +
        size,
    );
    if (!response.ok) throw new Error("Public legacy image unavailable.");
    bytes = await response.arrayBuffer();
    if (bytes.byteLength <= 2_000_000) break;
  }
  if (!bytes || !response || bytes.byteLength > 2_000_000)
    throw new Error("Legacy image needs manual optimization.");
  const uploaded = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type":
        response.headers.get("Content-Type")?.split(";")[0] || "image/jpeg",
    },
    body: bytes,
  });
  const media = await uploaded.json();
  if (!uploaded.ok) throw new Error(media.error);
  await api("entities/photo", {
    data: {
      title,
      albumId: file.albumId,
      imageId: media.id,
      alt: file.alt,
      caption: "",
      sortOrder: file.sortOrder,
      visible: true,
    },
  });
  count++;
  if (count % 10 === 0) console.log("Imported", count, "photos");
}
console.log(
  "Imported",
  count,
  "photos into local D1/R2. The public website was not changed.",
);
