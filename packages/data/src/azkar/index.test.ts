import { describe, expect, it } from "vitest";
import { AZKAR_CATEGORIES, getAzkarCategoriesByTrigger, getAzkarCategory } from "./index.js";

const VALID_TRIGGERS = new Set([
  "morning",
  "evening",
  "post-salah",
  "before-sleep",
  "waking",
  "situational",
  "custom-time",
]);

describe("Azkar data integrity", () => {
  it("has the expected 132 categories and 266 total items", () => {
    // 267 items exist in the upstream source; one (id 267) has no Arabic text
    // at all and is dropped during the fetch/transform — see the provenance
    // note in ./index.ts.
    expect(AZKAR_CATEGORIES.length).toBe(132);
    const totalItems = AZKAR_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
    expect(totalItems).toBe(266);
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

  it("assigns the morning/evening azkar category (id 27) to the morning trigger", () => {
    const category = getAzkarCategory("27");
    expect(category?.trigger).toBe("morning");
    expect(category?.items.length).toBeGreaterThan(0);
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
