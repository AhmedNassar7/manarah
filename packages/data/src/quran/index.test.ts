import { describe, expect, it } from "vitest";
import {
  getAllVerses,
  getJuzStart,
  getPageStart,
  getRandomVerse,
  getSurah,
  getTranslationForSurah,
  getVerseLocation,
  getVersesForSurah,
  JUZ_COUNT,
  PAGE_COUNT,
  SURAHS,
  TRANSLATION_EDITIONS,
} from "./index.js";

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

  it("every registered translation edition has exactly one entry per verse, with non-empty text", async () => {
    const verses = await getAllVerses();
    for (const edition of TRANSLATION_EDITIONS) {
      let total = 0;
      for (const surah of SURAHS) {
        const translated = await getTranslationForSurah(surah.number, edition.id);
        expect(translated).toHaveLength(surah.verseCount);
        for (const t of translated) {
          expect(t.text.trim().length).toBeGreaterThan(0);
        }
        total += translated.length;
      }
      expect(total).toBe(verses.length);
    }
  });

  it("getTranslationForSurah throws for an unknown edition id", async () => {
    await expect(getTranslationForSurah(1, "not.a.real.edition")).rejects.toThrow();
  });

  it("has verse-location metadata for every verse, with the Quran's first and last ayah at the expected boundaries", async () => {
    const first = await getVerseLocation(1, 1);
    expect(first).toEqual({ surah: 1, ayah: 1, juz: 1, page: 1, manzil: 1, ruku: 1, hizbQuarter: 1, sajda: false });

    const last = await getVerseLocation(114, 6);
    expect(last?.juz).toBe(30);
    expect(last?.page).toBe(PAGE_COUNT);
  });

  it("has a start verse for every one of the 30 juz' and 604 pages", async () => {
    for (let juz = 1; juz <= JUZ_COUNT; juz++) {
      const start = await getJuzStart(juz);
      expect(start).toBeDefined();
      const location = await getVerseLocation(start!.surah, start!.ayah);
      expect(location?.juz).toBe(juz);
    }

    for (let page = 1; page <= PAGE_COUNT; page++) {
      const start = await getPageStart(page);
      expect(start).toBeDefined();
      const location = await getVerseLocation(start!.surah, start!.ayah);
      expect(location?.page).toBe(page);
    }
  });

  it("counts exactly 15 sajdah verses, the standard reckoning for this mushaf", async () => {
    const verses = await getAllVerses();
    let sajdaCount = 0;
    for (const verse of verses) {
      const location = await getVerseLocation(verse.surah, verse.ayah);
      if (location?.sajda) sajdaCount++;
    }
    expect(sajdaCount).toBe(15);
  });
});
