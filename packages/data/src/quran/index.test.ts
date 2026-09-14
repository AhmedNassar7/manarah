import { describe, expect, it } from "vitest";
import { getSurah, getVersesForSurah, SURAHS, VERSES } from "./index.js";

describe("Quran data integrity", () => {
  it("has exactly the canonical 114 surahs and 6236 verses", () => {
    expect(SURAHS.length).toBe(114);
    expect(VERSES.length).toBe(6236);
  });

  it("has no empty or missing Arabic text", () => {
    for (const verse of VERSES) {
      expect(verse.uthmaniText.trim().length).toBeGreaterThan(0);
    }
  });

  it("has a verseCount per surah that matches the actual number of verses for that surah", () => {
    for (const surah of SURAHS) {
      const actual = VERSES.filter((v) => v.surah === surah.number).length;
      expect(actual).toBe(surah.verseCount);
    }
  });

  it("numbers surahs 1-114 with no gaps or duplicates", () => {
    const numbers = SURAHS.map((s) => s.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 114 }, (_, i) => i + 1));
  });

  it("Al-Fatiha (surah 1) has exactly 7 verses", () => {
    expect(getSurah(1)?.verseCount).toBe(7);
    expect(getVersesForSurah(1)).toHaveLength(7);
  });

  it("An-Nas (surah 114) has exactly 6 verses, ayahs numbered 1-6", () => {
    const verses = getVersesForSurah(114);
    expect(verses.map((v) => v.ayah)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("getSurah returns undefined for an out-of-range number", () => {
    expect(getSurah(0)).toBeUndefined();
    expect(getSurah(115)).toBeUndefined();
  });
});
