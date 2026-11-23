import { describe, it, expect } from "vitest";
import { parseEuro, validateEntity, type Entity } from "../worker/model";
import { publicSnapshot } from "../worker/content";
const entity = (
  id: string,
  type: Entity["type"],
  data: Record<string, any>,
): Entity => ({
  id,
  type,
  data,
  version: 1,
  updatedAt: "2026-11-23T00:00:00Z",
  deletedAt: null,
});
describe("EUR-only money", () => {
  it("converts strings into exact integer cents", () => {
    expect(parseEuro("14,50")).toBe(1450);
    expect(parseEuro("14.5")).toBe(1450);
    expect(parseEuro("0,29")).toBe(29);
    expect(parseEuro("0")).toBe(0);
  });
  it("rejects ambiguous, negative and excessively precise amounts", () => {
    for (const v of ["-1", "14,505", "1,000.50", "NaN", "1e3", ""])
      expect(() => parseEuro(v)).toThrow();
  });
});
describe("validated content", () => {
  it("rejects unsafe contact protocols and fractional cents", () => {
    expect(() =>
      validateEntity("product", {
        title: "Тест",
        categoryId: "food",
        website: "javascript:alert(1)",
      }),
    ).toThrow();
    expect(() =>
      validateEntity("product", {
        title: "Тест",
        categoryId: "food",
        priceCents: 10.5,
      }),
    ).toThrow();
  });
  it("rejects invalid announcement periods", () => {
    expect(() =>
      validateEntity("announcement", {
        title: "Отпуск",
        message: "Текст",
        start: "2026-11-30",
        end: "2026-11-20",
      }),
    ).toThrow();
  });
});
describe("public snapshots", () => {
  const category = entity("food", "category", {
    title: "Храна",
    visible: true,
  });
  it("does not leak author metadata or hidden content", () => {
    const hidden = entity("hidden", "product", {
      title: "Чернова",
      categoryId: "food",
      visible: false,
      imageId: null,
    });
    const publicProduct = entity("public", "product", {
      title: "Пица",
      categoryId: "food",
      visible: true,
      imageId: "photo",
    });
    const snapshot = publicSnapshot(
      [category, hidden, publicProduct],
      new Set(["photo"]),
    );
    expect(snapshot.content.map((e) => e.id)).toEqual(["food", "public"]);
    expect(JSON.stringify(snapshot)).not.toContain("updatedAt");
    expect(snapshot.mediaIds).toEqual(["photo"]);
  });
  it("rejects missing parent categories and unfinished photos", () => {
    expect(() =>
      publicSnapshot(
        [entity("p", "product", { title: "Пица", categoryId: "missing" })],
        new Set(),
      ),
    ).toThrow();
    expect(() =>
      publicSnapshot(
        [
          category,
          entity("p", "product", {
            title: "Пица",
            categoryId: "food",
            imageId: "missing",
          }),
        ],
        new Set(),
      ),
    ).toThrow();
  });
  it("hides products when their parent category is hidden", () => {
    expect(
      publicSnapshot(
        [
          { ...category, data: { ...category.data, visible: false } },
          entity("p", "product", {
            title: "Пица",
            categoryId: "food",
            visible: true,
          }),
        ],
        new Set(),
      ).content,
    ).toHaveLength(0);
  });
});
