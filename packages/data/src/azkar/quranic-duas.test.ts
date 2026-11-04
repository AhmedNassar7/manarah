import { describe, expect, it } from "vitest";
import { parseAzkarText } from "@manarah/core";
import { AZKAR_CATEGORIES, AZKAR_SECTIONS } from "./index.js";
import { QURANIC_DUA_CATEGORIES, QURANIC_DUA_SECTION } from "./quranic-duas.js";
import { getAllVerses, getTranslationForSurah } from "../quran/index.js";

const items = QURANIC_DUA_CATEGORIES.flatMap((category) => category.items.map((item) => ({ category, item })));

/** "2:201" or "20:25–28" -> the verse keys it covers. */
function keysOf(reference: string): Array<[number, number]> {
  const match = /^(\d+):(\d+)(?:–(\d+))?$/.exec(reference);
  if (!match) throw new Error(`bad reference ${reference}`);
  const [surah, from, to] = [Number(match[1]), Number(match[2]), Number(match[3] ?? match[2])];
  return Array.from({ length: to - from + 1 }, (_, i) => [surah, from + i]);
}

describe("Quranic duas", () => {
  it("has a sensible, non-trivial set", () => {
    expect(QURANIC_DUA_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it("gives every entry a reference, unique ids and unique references", () => {
    const ids = items.map(({ item }) => item.id);
    const refs = items.map(({ item }) => item.reference);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(refs).size).toBe(refs.length);
    for (const { item } of items) expect(item.reference, item.id).toMatch(/^\d+:\d+(–\d+)?$/);
  });

  it("copies its Arabic exactly from the bundled Quran text — nothing hand-typed", async () => {
    const verses = await getAllVerses();
    const byKey = new Map(verses.map((v) => [`${v.surah}:${v.ayah}`, v.uthmaniText]));
    for (const { item } of items) {
      const expected = keysOf(item.reference!)
        .map(([s, a]) => byKey.get(`${s}:${a}`))
        .join("* ")
        .replace(/۞/g, "")
        .replace(/ {2,}/g, " ")
        .trim();
      expect(item.arabic, item.reference).toBe(`﴿${expected}﴾`);
    }
  });

  it("copies its translation exactly from the bundled Saheeh International text", async () => {
    const bySurah = new Map<number, Map<number, string>>();
    for (const { item } of items) {
      for (const [surah] of keysOf(item.reference!)) {
        if (!bySurah.has(surah)) {
          bySurah.set(surah, new Map((await getTranslationForSurah(surah, "en.sahih")).map((t) => [t.ayah, t.text])));
        }
      }
    }
    for (const { item } of items) {
      const expected = keysOf(item.reference!)
        .map(([s, a]) => bySurah.get(s)!.get(a))
        .join(" ");
      expect(item.translation, item.reference).toBe(expected);
    }
  });

  it("really is a supplication: every entry's translation addresses Allah directly (Lord / You / Your)", () => {
    for (const { item } of items) expect(item.translation, item.reference).toMatch(/\b(Lord|You|Your)\b/);
  });

  it("displays each as a single verse block, with nothing lost", () => {
    for (const { item } of items) {
      const parts = parseAzkarText(item.arabic);
      expect(parts.map((p) => p.kind), item.reference).toEqual(["quran"]);
    }
  });

  it("is grouped in one section, apart from the Hisn al-Muslim corpus (no id collisions)", () => {
    expect(QURANIC_DUA_SECTION.categoryIds).toEqual(QURANIC_DUA_CATEGORIES.map((c) => c.id));
    const hisnIds = new Set(AZKAR_CATEGORIES.map((c) => c.id));
    for (const category of QURANIC_DUA_CATEGORIES) expect(hisnIds.has(category.id), category.id).toBe(false);
    expect(AZKAR_SECTIONS.some((s) => s.id === QURANIC_DUA_SECTION.id)).toBe(false);
  });

  it("names every category in English and Arabic, and is never scheduled by default", () => {
    for (const category of QURANIC_DUA_CATEGORIES) {
      expect(category.name.trim().length).toBeGreaterThan(0);
      expect(category.nameArabic?.trim().length).toBeGreaterThan(0);
      expect(category.trigger).toBe("situational");
      for (const item of category.items) expect(item.repeatCount).toBe(1);
    }
  });
});
