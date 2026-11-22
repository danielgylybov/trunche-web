import type { Entity, EntityType } from "../worker/model";
export type Media = {
  id: string;
  mime: string;
  size: number;
  width: number;
  height: number;
};
export type State = {
  user: {
    email: string;
    role: "owner" | "editor";
    local: boolean;
    environment?: string;
  };
  entities: Entity[];
  media: Media[];
  state: {
    active_release: string | null;
    draft_revision: number;
    published_revision: number;
  };
  releases: { id: string; created_at: string; created_by: string }[];
};
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetch("/api/admin/" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const type = response.headers.get("Content-Type") || "";
  if (!type.includes("application/json"))
    throw new APIError(
      "Сесията изтече. Презареди страницата, за да влезеш отново.",
      401,
    );
  const data: any = await response.json();
  if (!response.ok)
    throw new APIError(data.error || "Операцията не завърши.", response.status);
  return data;
}
export const save = (
  type: EntityType,
  data: Record<string, any>,
  entity?: Entity,
) =>
  api<Entity>(
    "entities/" + type + (entity ? "/" + entity.id : ""),
    entity ? "PUT" : "POST",
    { data, version: entity?.version },
  );
export async function compressPhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Избери JPEG, PNG или WebP снимка.");
  if (file.size > 20_000_000) throw new Error("Избери снимка до 20 MB.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error("Снимката е над 40 мегапиксела.");
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузърът не може да обработи снимката.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Снимката не можа да се обработи.")),
        "image/webp",
        0.84,
      ),
    );
    if (blob.size > 2_000_000)
      throw new Error(
        "Снимката остава прекалено голяма. Избери по-малък файл.",
      );
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function uploadPhoto(
  file: File,
  onProgress: (n: number) => void,
): Promise<{ id: string; url: string }> {
  const blob = await compressPhoto(file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.timeout = 60000;
    xhr.ontimeout = () =>
      reject(new Error("Качването отне прекалено дълго. Опитай отново."));
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Връзката прекъсна. Опитай отново."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300)
          reject(
            new APIError(data.error || "Качването не завърши.", xhr.status),
          );
        else resolve(data);
      } catch {
        reject(new Error("Сесията изтече. Презареди страницата."));
      }
    };
    xhr.send(blob);
  });
}
