import { describe, it, expect } from "vitest";
import {
  parsePortion,
  formatPortion,
  parseTimeSlots,
  timeSlotsFor,
  formatTimeSlot,
  reorderItems,
  sectionChoices,
  DEFAULT_MESSENGER,
} from "../../src/js/content-fields.mjs";
import { validateEntity } from "../worker/model";
import { normalizeOffer, renderOffer } from "../../src/js/menu-view.mjs";
import { Window } from "happy-dom";
describe("structured content migration and validation", () => {
  it("reads old portions and time ranges without dropping data", () => {
    expect(parsePortion("1,5кг")).toEqual({ quantity: 1.5, unit: "kg" });
    expect(formatPortion({ quantity: 800, unit: "g" })).toBe("800 г");
    expect(
      parseTimeSlots(["10:30-12:00 / 12:00-13:30", "17:00–18:30"]),
    ).toHaveLength(3);
    const old = {
      title: "Работно време",
      kind: "hours",
      categoryId: "rules",
      inclusions: ["10:00 – 14:00ч", "16:30 – 20:30ч"],
    };
    const normalized = normalizeOffer(old);
    expect(normalized.timeSlots).toHaveLength(2);
    expect(normalized.inclusions).toEqual([]);
    expect(formatTimeSlot(normalized.timeSlots[0])).toContain("10:00 – 14:00");
  });
  it("rejects invalid times, ranges, crop positions and units", () => {
    for (const data of [
      { timeSlots: [{ start: "25:00", end: "26:00" }] },
      { timeSlots: [{ start: "14:00", end: "10:00" }] },
      { imagePosition: { x: -1, y: 50 } },
      { portionSpec: { quantity: 0, unit: "g" } },
      { portionSpec: { quantity: 5, unit: "unknown" } },
    ])
      expect(() =>
        validateEntity("product", {
          title: "Тест",
          categoryId: "food",
          ...data,
        }),
      ).toThrow();
  });
  it("uses the approved Messenger destination by default", () => {
    expect(
      validateEntity("announcement", {
        title: "Отпуск",
        message: "Текст",
        start: "2026-11-23",
        end: "2026-11-30",
      }),
    ).toMatchObject({buttonUrl:DEFAULT_MESSENGER});
    expect(validateEntity("settings", { title: "Трънче" })).toMatchObject({messenger:DEFAULT_MESSENGER});
  });
  it("keeps category sections selectable and reorders without mutating input", () => {
    const category = { id: "food", data: { sections: ["Плата"] } };
    expect(
      sectionChoices(category, [
        { data: { categoryId: "food", section: "Салати" } },
        { data: { categoryId: "other", section: "Други" } },
      ]),
    ).toEqual(["Плата", "Салати"]);
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderItems(items, "a", "c").map((i) => i.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(items[0].id).toBe("a");
    expect(reorderItems(items, "missing", "a")).toBe(items);
  });
  it("renders crop position on the same image used by the public card", () => {
    const previous = globalThis.document;
    globalThis.document = new Window().document as unknown as Document;
    try {
      const card = renderOffer(
        {
          kind: "product",
          title: "Пица",
          imageId: "photo",
          imagePosition: { x: 20, y: 80 },
        },
        { mediaURL: (id) => "/media/" + id },
      );
      expect(card.querySelector("img")?.style.objectPosition).toBe("20% 80%");
    } finally {
      globalThis.document = previous;
    }
  });
});
