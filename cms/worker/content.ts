import type { Entity } from "./model";
export function publicSnapshot(entities: Entity[], readyMedia: Set<string>) {
  const categories = new Set(
    entities.filter((e) => e.type === "category").map((e) => e.id),
  );
  const albums = new Set(
    entities.filter((e) => e.type === "album").map((e) => e.id),
  );
  for (const e of entities) {
    if (e.type === "product" && !categories.has(e.data.categoryId))
      throw new Error(`„${e.data.title}“ няма съществуваща категория.`);
    if (e.type === "photo" && !albums.has(e.data.albumId))
      throw new Error(`„${e.data.title}“ няма съществуващ албум.`);
    for (const id of [e.data.imageId, e.data.coverId])
      if (id && !readyMedia.has(id))
        throw new Error(`Снимката към „${e.data.title}“ още не е готова.`);
  }
  const visible = entities.filter((e) => e.data.visible !== false);
  const visibleCategories = new Set(
    visible.filter((e) => e.type === "category").map((e) => e.id),
  );
  const visibleAlbums = new Set(
    visible.filter((e) => e.type === "album").map((e) => e.id),
  );
  const content = visible
    .filter(
      (e) =>
        (e.type !== "product" || visibleCategories.has(e.data.categoryId)) &&
        (e.type !== "photo" || visibleAlbums.has(e.data.albumId)),
    )
    .map((e) => ({ id: e.id, type: e.type, data: e.data }));
  const mediaIds = [
    ...new Set(
      content
        .flatMap((e) => [e.data.imageId, e.data.coverId])
        .filter((id): id is string => typeof id === "string" && !!id),
    ),
  ];
  return { schemaVersion: 1, currency: "EUR", content, mediaIds };
}
