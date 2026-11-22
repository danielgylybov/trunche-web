import { z } from "zod";
const text = (max = 200) => z.string().trim().max(max);
const safeLink = z.union([
  z.literal(""),
  z
    .url()
    .refine(
      (v) => ["https:", "http:"].includes(new URL(v).protocol),
      "Използвай https:// адрес.",
    ),
]);
const base = z.object({
  title: text().min(1, "Въведи име."),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});
export const schemas = {
  category: base.extend({
    slug: text(80).regex(/^[a-z0-9-]+$/),
    description: text(1000).default(""),
    icon: z
      .enum(["cake", "pizza", "sweet", "drink", "party", "rules"])
      .default("cake"),
  }),
  product: base.extend({
    categoryId: text(80).min(1),
    section: text().default(""),
    description: text(4000).default(""),
    priceCents: z.number().int().min(0).max(100000000).nullable().default(null),
    portion: text().default(""),
    kind: z
      .enum(["product", "package", "partner", "info", "hours", "rich"])
      .default("product"),
    inclusions: z.array(text(2000)).max(80).default([]),
    variants: z
      .array(
        z.object({
          title: text().min(1),
          priceCents: z.number().int().min(0).max(100000000).nullable(),
          detail: text(500).default(""),
        }),
      )
      .max(30)
      .default([]),
    note: text(4000).default(""),
    imageId: text(80).nullable().default(null),
    phone: text(40).default(""),
    website: safeLink.default(""),
    facebook: safeLink.default(""),
  }),
  album: base.extend({
    description: text(2000).default(""),
    coverId: text(80).nullable().default(null),
  }),
  photo: base.extend({
    albumId: text(80).min(1),
    imageId: text(80).min(1),
    alt: text(500).min(1, "Опиши снимката."),
    caption: text(1000).default(""),
  }),
  page: base.extend({
    key: z.enum(["home", "about", "contacts", "terms"]),
    body: text(20000),
    description: text(500).default(""),
  }),
  announcement: base
    .extend({
      message: text(4000),
      start: z.iso.date(),
      end: z.iso.date(),
      banner: z.boolean().default(true),
      modal: z.boolean().default(false),
      frequency: z
        .enum(["always", "once_per_session", "once_per_day", "once_per_period"])
        .default("once_per_day"),
      buttonLabel: text().default("Свържи се с нас"),
      buttonUrl: safeLink.default(""),
    })
    .refine((v) => v.end >= v.start, {
      message: "Крайната дата трябва да е след началната.",
      path: ["end"],
    }),
  settings: z.object({
    title: text().min(1),
    phone: text(40).default(""),
    address: text(500).default(""),
    facebook: safeLink.default(""),
    instagram: safeLink.default(""),
    contactEmail: z.union([z.literal(""), z.email()]).default(""),
    workingHours: text(2000).default(""),
  }),
};
export type EntityType = keyof typeof schemas;
export type Entity = {
  id: string;
  type: EntityType;
  data: Record<string, any>;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
};
export function validateEntity(type: string, data: unknown) {
  if (!(type in schemas)) throw new Error("Непознат вид съдържание.");
  return schemas[type as EntityType].parse(data);
}
export function parseEuro(value: string) {
  const v = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v))
    throw new Error("Въведи цена, например 14,50.");
  const [whole, cents = ""] = v.split(".");
  const n = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 100000000)
    throw new Error("Цената е прекалено голяма.");
  return n;
}
export const money = (cents: number | null) =>
  cents === null
    ? "По запитване"
    : new Intl.NumberFormat("bg-BG", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);
