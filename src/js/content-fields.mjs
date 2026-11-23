export const DEFAULT_MESSENGER = "https://m.me/1058779830861330";
export const DAY_LABELS = {
  all: "Всеки ден",
  weekdays: "Понеделник–петък",
  weekend: "Събота–неделя",
  mon: "Понеделник",
  tue: "Вторник",
  wed: "Сряда",
  thu: "Четвъртък",
  fri: "Петък",
  sat: "Събота",
  sun: "Неделя",
};
export const PORTION_UNITS = { g: "г", kg: "кг", ml: "мл", l: "л", pcs: "бр." };
export function parsePortion(value = "") {
  const m = String(value)
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(кг|kg|гр\.?|г|g|мл|ml|л|l|бр\.?|броя|pcs)$/i);
  if (!m) return null;
  const unit = {
    кг: "kg",
    kg: "kg",
    гр: "g",
    "гр.": "g",
    г: "g",
    g: "g",
    мл: "ml",
    ml: "ml",
    л: "l",
    l: "l",
    бр: "pcs",
    "бр.": "pcs",
    броя: "pcs",
    pcs: "pcs",
  }[m[2].toLowerCase()];
  return { quantity: Number(m[1].replace(",", ".")), unit };
}
export function formatPortion(portion) {
  return portion && portion.quantity > 0
    ? `${String(portion.quantity).replace(".", ",")} ${PORTION_UNITS[portion.unit] || portion.unit}`
    : "";
}
export function parseTimeSlots(value) {
  const text = Array.isArray(value) ? value.map(v=>typeof v==='string'?v:v?.title||'').join("\n") : String(value || "");
  const matches = [
    ...text.matchAll(
      /\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*[–—-]\s*([01]?\d|2[0-3])[:.]([0-5]\d)/g,
    ),
  ];
  return matches.map((m) => ({
    days: "all",
    start: m[1].padStart(2, "0") + ":" + m[2],
    end: m[3].padStart(2, "0") + ":" + m[4],
  }));
}
export function formatTimeSlot(slot) {
  return `${slot.days && slot.days !== "all" ? DAY_LABELS[slot.days] + " · " : ""}${slot.start} – ${slot.end} ч.`;
}
export function timeSlotsFor(data) {
  return data.timeSlots?.length
    ? data.timeSlots
    : parseTimeSlots(
        data.inclusions?.length ? data.inclusions : data.workingHours || "",
      );
}
export function sectionChoices(category, products = []) {
  return [
    ...new Set(
      [
        ...(category?.data.sections || []),
        ...products
          .filter((p) => p.data.categoryId === category?.id && !p.deletedAt)
          .map((p) => p.data.section),
      ].filter(Boolean),
    ),
  ];
}
export function reorderItems(items, source, target) {
  const from = items.findIndex((i) => i.id === source),
    to = items.findIndex((i) => i.id === target);
  if (from < 0 || to < 0 || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
export function categorySlug(value){const map={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya'};return [...String(value).toLowerCase()].map(c=>map[c]??c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'category';}
