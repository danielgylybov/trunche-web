import {pageSections} from "../../src/js/page-fields.mjs";
import { z } from "zod";
import { normalizeOffer } from "../../src/js/menu-view.mjs";
import { DEFAULT_MESSENGER } from "../../src/js/content-fields.mjs";
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
const timeSlot = z
  .object({
    days: z
      .enum([
        "all",
        "weekdays",
        "weekend",
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
        "sun",
      ])
      .default("all"),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((v) => v.end > v.start, {
    message: "Крайният час трябва да е след началния.",
  });
const timeSlots = z.array(timeSlot).max(40).default([]);
const availabilityPeriod = z.object({
  id: text(80).min(1), start: z.iso.date(), end: z.iso.date(),
  allDay: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("10:00"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("14:00"),
}).refine(v=>v.end>=v.start,{message:"Крайната дата трябва да е след началната.",path:["end"]})
.refine(v=>v.allDay || v.endTime>v.startTime,{message:"Крайният час трябва да е след началния.",path:["endTime"]});
const crop = z
  .object({
    x: z.number().min(0).max(100).default(50),
    y: z.number().min(0).max(100).default(50),
  })
  .default({ x: 50, y: 50 });
export const schemas = {
  category: base.extend({
    sections: z
      .array(text().min(1))
      .max(60)
      .refine(
        (v) => new Set(v).size === v.length,
        "Подкатегориите трябва да са различни.",
      )
      .optional(),
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
    portionSpec: z
      .object({
        quantity: z.number().positive().max(100000),
        unit: z.enum(["g", "kg", "ml", "l", "pcs"]),
      })
      .nullable()
      .default(null),
    timeSlots,
    imagePosition: crop,
    kind: z
      .enum(["product", "package", "partner", "info", "hours", "rich"])
      .default("product"),
    inclusions: z.array(z.union([text(2000),z.object({title:text(2000).min(1),priceCents:z.number().int().min(0).max(100000000).nullable().default(null),portionSpec:z.object({quantity:z.number().positive().max(100000),unit:z.enum(['g','kg','ml','l','pcs'])}).nullable().default(null)})])).max(80).default([]),
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
    key: z.enum(["home", "about", "contacts", "terms", "gallery", "invitation", "footer"]),
    ...Object.fromEntries([...new Set(Object.values(pageSections).flatMap(s=>s.fields.map(f=>f.key)))].filter(k=>!["title","body","description"].includes(k)).map(k=>[k,text(2000).optional()])),
    body: text(20000).default(""),
    description: text(500).default(""),
  }),
  announcement: base
    .extend({
      message: text(4000),
      blocksCalendar: z.boolean().optional(),
      start: z.iso.date(),
      end: z.iso.date(),
      banner: z.boolean().default(true),
      modal: z.boolean().default(false),
      frequency: z
        .enum(["always", "once_per_session", "once_per_day", "once_per_period"])
        .default("once_per_day"),
      buttonLabel: text().default("Пиши ни в Messenger"),
      buttonEnabled:z.boolean().default(true),
      buttonUrl: safeLink.default(DEFAULT_MESSENGER),
    })
    .refine((v) => v.end >= v.start, {
      message: "Крайната дата трябва да е след началната.",
      path: ["end"],
    }),
  settings: z.object({
    calendarEnabled: z.boolean().default(false),
    availability: z.array(availabilityPeriod).max(300).refine(v=>new Set(v.map(p=>p.id)).size===v.length,"Периодите трябва да имат различни идентификатори.").default([]),
    title: text().min(1),
    phone: text(40).default(""),
    address: text(500).default(""),
    facebook: safeLink.default(""),
    instagram: safeLink.default(""),
    contactEmail: z.union([z.literal(""), z.email()]).default(""),
    mapQuery: text(500).optional(),
    workingHours: text(2000).default(""),
    timeSlots,
    messenger: safeLink.default(DEFAULT_MESSENGER),
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
  const validated = schemas[type as EntityType].parse(data);
  return type === "product" ? normalizeOffer(validated) : validated;
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
    ? ""
    : new Intl.NumberFormat("bg-BG", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);
