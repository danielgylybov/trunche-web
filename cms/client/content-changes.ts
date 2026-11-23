import { normalizeOffer } from "../../src/js/menu-view.mjs";
import type { Entity } from "../worker/model";
export const fieldLabels: Record<string, string> = {
  title: "Заглавие",
  kind: "Вид предложение",
  categoryId: "Категория",
  section: "Подкатегория",
  sections: "Подкатегории",
  timeSlots: "Часове и дни",
  portionSpec: "Количество и мерна единица",
  imagePosition: "Наместване на снимката",
  messenger: "Messenger",
  description: "Описание",
  priceCents: "Цена",
  portion: "Порция",
  inclusions: "Списък / часове",
  variants: "Варианти и цени",
  note: "Бележка",
  imageId: "Снимка",
  visible: "Видимост",
  sortOrder: "Подредба",
  slug: "Адрес",
  icon: "Икона",
  albumId: "Албум",
  alt: "Описание на снимката",
  caption: "Надпис",
  coverId: "Корица",
  key: "Страница",
  body: "Съдържание",
  message: "Съобщение",
  start: "Начална дата",
  end: "Крайна дата",
  banner: "Банер",
  modal: "Прозорец",
  frequency: "Честота",
  buttonEnabled:"Бутон за връзка",
  buttonLabel: "Текст на бутона",
  buttonUrl: "Връзка",
  phone: "Телефон",
  website: "Уебсайт",
  facebook: "Facebook",
  instagram: "Instagram",
  address: "Адрес",
  contactEmail: "Имейл",
  workingHours: "Работно време",
};
const stable = (value: any): string =>
  JSON.stringify(
    value && typeof value === "object"
      ? Array.isArray(value)
        ? value.map((v) => JSON.parse(stable(v)))
        : Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, JSON.parse(stable(value[k]))]),
          )
      : (value ?? null),
  );
export function changedFields(
  before: Record<string, any> = {},
  after: Record<string, any> = {},
) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => stable(before[key]) !== stable(after[key]),
  );
}
export type PublishedRecord = {
  id: string;
  type: string;
  data: Record<string, any>;
};
export type ContentChange = {
  id: string;
  type: string;
  title: string;
  action: "added" | "updated" | "removed";
  fields: string[];
  before?: Record<string, any>;
  after?: Record<string, any>;
};
export function visibleDraft(entities: Entity[]): PublishedRecord[] {
  const active = entities.filter(
    (e) => !e.deletedAt && e.data.visible !== false,
  );
  const categories = new Set(
      active.filter((e) => e.type === "category").map((e) => e.id),
    ),
    albums = new Set(active.filter((e) => e.type === "album").map((e) => e.id));
  return active
    .filter(
      (e) =>
        (e.type !== "product" || categories.has(e.data.categoryId)) &&
        (e.type !== "photo" || albums.has(e.data.albumId)),
    )
    .map((e) => ({
      id: e.id,
      type: e.type,
      data: e.type === "product" ? normalizeOffer(e.data) : e.data,
    }));
}
export function contentChanges(
  entities: Entity[],
  published: PublishedRecord[],
): ContentChange[] {
  const next = new Map(visibleDraft(entities).map((e) => [e.id, e]));
  const previous = new Map(
    published.map((e) => [
      e.id,
      { ...e, data: e.type === "product" ? normalizeOffer(e.data) : e.data },
    ]),
  );
  const changes: ContentChange[] = [];
  for (const id of new Set([...next.keys(), ...previous.keys()])) {
    const before = previous.get(id),
      after = next.get(id);
    const fields = changedFields(before?.data, after?.data);
    if (!before || !after || fields.length)
      changes.push({
        id,
        type: (after || before)!.type,
        title: (after || before)!.data.title,
        action: !before ? "added" : !after ? "removed" : "updated",
        fields,
        before: before?.data,
        after: after?.data,
      });
  }
  return changes;
}
export function recordStatus(entity: Entity, published: PublishedRecord[]) {
  const before = published.find((e) => e.id === entity.id);
  if (entity.data.visible === false && before)
    return "Ще се скрие след публикуване";
  if (!before)
    return entity.data.visible === false
      ? "Скрито · извън сайта"
      : "Ново · непубликувано";
  const after =
    entity.type === "product" ? normalizeOffer(entity.data) : entity.data;
  return changedFields(
    entity.type === "product" ? normalizeOffer(before.data) : before.data,
    after,
  ).length
    ? "Непубликувани промени"
    : "Публикувано";
}
