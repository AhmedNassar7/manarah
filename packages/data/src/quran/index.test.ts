import { describe, expect, it } from "vitest";
import { getAllVerses, getRandomVerse, getSurah, getVersesForSurah, SURAHS } from "./index.js";

describe("Quran data integrity", () => {
  it("has exactly the canonical 114 surahs and 6236 verses", async () => {
    const verses = await getAllVerses();
    expect(SURAHS.length).toBe(114);
    expect(verses.length).toBe(6236);
  });

  it("has no empty or missing Arabic text", async () => {
    const verses = await getAllVerses();
    for (const verse of verses) {
      expect(verse.uthmaniText.trim().length).toBeGreaterThan(0);
    }
  });

  it("has a verseCount per surah that matches the actual number of verses for that surah", async () => {
    const verses = await getAllVerses();
    for (const surah of SURAHS) {
      const actual = verses.filter((v) => v.surah === surah.number).length;
      expect(actual).toBe(surah.verseCount);
    }
  });

  it("numbers surahs 1-114 with no gaps or duplicates", () => {
    const numbers = SURAHS.map((s) => s.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 114 }, (_, i) => i + 1));
  });

  it("Al-Fatiha (surah 1) has exactly 7 verses", async () => {
    expect(getSurah(1)?.verseCount).toBe(7);
    expect(await getVersesForSurah(1)).toHaveLength(7);
  });

  it("An-Nas (surah 114) has exactly 6 verses, ayahs numbered 1-6", async () => {
    const verses = await getVersesForSurah(114);
    expect(verses.map((v) => v.ayah)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("getSurah returns undefined for an out-of-range number", () => {
    expect(getSurah(0)).toBeUndefined();
    expect(getSurah(115)).toBeUndefined();
  });

  it("getVersesForSurah caches the underlying load — repeated calls return consistent data", async () => {
    const first = await getVersesForSurah(2);
    const second = await getVersesForSurah(2);
    expect(first).toEqual(second);
  });

  it("getRandomVerse returns a real verse with its matching surah attached", async () => {
    const { verse, surah } = await getRandomVerse();
    expect(surah.number).toBe(verse.surah);
    expect(verse.uthmaniText.trim().length).toBeGreaterThan(0);
    expect(verse.ayah).toBeGreaterThanOrEqual(1);
    expect(verse.ayah).toBeLessThanOrEqual(surah.verseCount);
  });
});
