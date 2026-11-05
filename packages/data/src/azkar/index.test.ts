import { describe, expect, it } from "vitest";
import { AZKAR_CATEGORIES, AZKAR_SECTIONS, getAzkarCategoriesByTrigger, getAzkarCategory } from "./index.js";

const VALID_TRIGGERS = new Set([
  "morning",
  "evening",
  "morning-evening",
  "post-salah",
  "before-sleep",
  "waking",
  "situational",
  "custom-time",
]);

describe("Azkar data integrity", () => {
  it("has the expected 133 categories and 286 total items", () => {
    // 267 items exist in the upstream source; one (id 267) has no Arabic text
    // at all and is dropped during the fetch/transform — see the provenance
    // note in ./index.ts. That leaves 132 categories and 266 items upstream;
    // the combined morning-and-evening chapter (24 items) is shown as two
    // lists — morning (23 items) and evening (21) — hence 133 and 286.
    expect(AZKAR_CATEGORIES.length).toBe(133);
    const totalItems = AZKAR_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
    expect(totalItems).toBe(266 - 24 + 23 + 21);
  });

  it("has unique category ids", () => {
    const ids = AZKAR_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns every category a valid trigger", () => {
    for (const category of AZKAR_CATEGORIES) {
      expect(VALID_TRIGGERS.has(category.trigger)).toBe(true);
    }
  });

  it("has no empty Arabic text and a positive repeat count on every item", () => {
    for (const category of AZKAR_CATEGORIES) {
      for (const item of category.items) {
        expect(item.arabic.trim().length).toBeGreaterThan(0);
        expect(item.repeatCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("gives morning and evening azkar their own categories and reminder triggers (27 = morning, 27e = evening)", () => {
    expect(getAzkarCategory("27")?.trigger).toBe("morning");
    expect(getAzkarCategory("27e")?.trigger).toBe("evening");
    expect(getAzkarCategory("27")?.items.length).toBeGreaterThan(0);
    expect(getAzkarCategory("27e")?.items.length).toBeGreaterThan(0);
  });

  it("getAzkarCategoriesByTrigger only returns categories with that exact trigger", () => {
    const postSalah = getAzkarCategoriesByTrigger("post-salah");
    expect(postSalah.length).toBeGreaterThan(0);
    for (const category of postSalah) {
      expect(category.trigger).toBe("post-salah");
    }
  });

  it("getAzkarCategory returns undefined for an unknown id", () => {
    expect(getAzkarCategory("not-a-real-id")).toBeUndefined();
  });
});

describe("Azkar sections", () => {
  it("places every category that has items in exactly one section", () => {
    const placed = AZKAR_SECTIONS.flatMap((section) => section.categoryIds);
    expect(new Set(placed).size, "a category appears in more than one section").toBe(placed.length);
    const withItems = AZKAR_CATEGORIES.filter((c) => c.items.length > 0).map((c) => c.id);
    expect([...placed].sort()).toEqual([...withItems].sort());
  });

  it("has unique section ids and no empty sections", () => {
    const ids = AZKAR_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of AZKAR_SECTIONS) expect(section.categoryIds.length).toBeGreaterThan(0);
  });

  it("gives every category an Arabic title", () => {
    for (const category of AZKAR_CATEGORIES) {
      expect(category.nameArabic?.trim().length, `category ${category.id}`).toBeGreaterThan(0);
    }
  });
});
