import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Window } from "happy-dom";
import {
  normalizeOffer,
  offerKind,
  renderOffer,
} from "../../src/js/menu-view.mjs";
import { validateEntity, type Entity } from "../worker/model";
import {
  changedFields,
  contentChanges,
  recordStatus,
} from "../client/content-changes";
const base = {
  title: "Важно",
  categoryId: "food",
  kind: "info",
  visible: true,
  priceCents: 1450,
  imageId: "image",
  portion: "800 г",
  variants: [{ title: "90 мин", priceCents: 10000, detail: "" }],
  inclusions: ["Първа точка"],
  note: "Важен текст",
};
beforeEach(() => vi.stubGlobal("document", new Window().document));
afterEach(() => vi.unstubAllGlobals());
describe("type-specific offers shared by admin and site", () => {
  for (const kind of ["info", "hours", "rich"])
    it("removes commercial fields and keeps text for " + kind, () => {
      const data = validateEntity("product", { ...base, kind });
      expect(data).toMatchObject({
        priceCents: null,
        imageId: null,
        portion: "",
        variants: [],
        description: "Важен текст",
      });
      const card = renderOffer(data, { mediaURL: (id) => "/media/" + id });
      expect(card.querySelector(".menu-price")).toBeNull();
      expect(card.querySelector("img")).toBeNull();
      expect(card.textContent).toContain("Важен текст");
      expect(card.textContent).not.toContain("По запитване");
    });
  it("preserves unpriced products with priced variants", () => {
    const data = normalizeOffer({
      ...base,
      title: "Брускети",
      kind: "product",
      priceCents: null,
    });
    const card = renderOffer(data, { mediaURL: (id) => "/media/" + id });
    expect(card.querySelector(".menu-price")).toBeNull();
    expect(card.textContent).toContain("100,00");
    expect(card.querySelector("img")).not.toBeNull();
    expect(offerKind(data)).toBe("product");
  });
  it("recognizes legacy information and preserves partner inclusions and prices", () => {
    expect(
      offerKind({
        ...base,
        kind: "product",
        title: "🔎 Допълнителна информация",
        priceCents: null,
        variants: [],
      }),
    ).toBe("info");
    const card = renderOffer(
      {
        ...base,
        kind: "partner",
        phone: "+359888123456",
        website: "https://example.com",
      },
      { mediaURL: (id) => "/media/" + id },
    );
    expect(card.textContent).toContain("Първа точка");
    expect(card.textContent).toContain("100,00");
    expect(card.querySelector('a[href^="tel:"]')).not.toBeNull();
  });
  it("renders description as text and rejects unsafe links", () => {
    const card = renderOffer({
      ...base,
      kind: "partner",
      description: "<img src=x onerror=alert(1)>",
      website: "javascript:alert(1)",
    });
    expect(card.querySelector("img")).toBeNull();
    expect(card.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(card.querySelector("a")).toBeNull();
  });
});
const entity = (
  id: string,
  type: Entity["type"],
  data: Record<string, any>,
): Entity => ({
  id,
  type,
  data,
  version: 1,
  updatedAt: "2026-11-23",
  deletedAt: null,
});
describe("published content comparison", () => {
  const category = entity("food", "category", {
    title: "Храна",
    visible: true,
  });
  const product = entity("p", "product", {
    ...base,
    title: "Пица",
    kind: "product",
  });
  const published = [category, product].map(({ id, type, data }) => ({
    id,
    type,
    data,
  }));
  it("ignores record versions, property order and hidden fields on information cards", () => {
    expect(
      changedFields({ a: 1, b: { a: 2, b: 3 } }, { b: { b: 3, a: 2 }, a: 1 }),
    ).toEqual([]);
    expect(
      contentChanges([category, { ...product, version: 8 }], published),
    ).toEqual([]);
    expect(
      contentChanges(
        [category, entity("p", "product", { ...base, priceCents: 9999 })],
        [
          { id: "food", type: "category", data: category.data },
          { id: "p", type: "product", data: base },
        ],
      ),
    ).toEqual([]);
  });
  it("identifies the edited price, new records and removed/hidden records", () => {
    const edited = { ...product, data: { ...product.data, priceCents: 1550 } };
    expect(contentChanges([category, edited], published)[0]).toMatchObject({
      action: "updated",
      fields: ["priceCents"],
    });
    expect(recordStatus(edited, published)).toBe("Непубликувани промени");
    expect(recordStatus(product, published)).toBe("Публикувано");
    const added = entity("new", "product", { ...product.data, title: "Ново" });
    expect(
      contentChanges([category, product, added], published)[0].action,
    ).toBe("added");
    expect(contentChanges([category], published)[0].action).toBe("removed");
  });
  it("includes child removals when a category is hidden", () => {
    const changes = contentChanges(
      [{ ...category, data: { ...category.data, visible: false } }, product],
      published,
    );
    expect(changes.map((c) => c.id).sort()).toEqual(["food", "p"]);
    expect(changes.every((c) => c.action === "removed")).toBe(true);
  });
});
