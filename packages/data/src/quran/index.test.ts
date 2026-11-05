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
  RECITERS,
  searchQuran,
  SURAHS,
  TAFSIR_EDITIONS,
  TRANSLATION_AUDIO,
  TRANSLATION_EDITIONS,
} from "./index.js";
import everyAyahFolders from "./everyayah-folders.json";

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

  it("has unique reciter ids and non-empty EveryAyah folder names", () => {
    expect(RECITERS.length).toBeGreaterThan(0);
    const ids = RECITERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reciter of RECITERS) {
      expect(reciter.everyAyahSubfolder.trim().length).toBeGreaterThan(0);
    }
  });

  it("only uses folders that exist in EveryAyah's official reciter list (a typo would be silence in the player)", () => {
    const official = new Set(everyAyahFolders.subfolders);
    const used = [
      ...RECITERS.flatMap((r) => [r.everyAyahSubfolder, ...Object.values(r.styles ?? {})]),
      TRANSLATION_AUDIO.everyAyahSubfolder,
    ];
    for (const folder of used) expect(official.has(folder), folder).toBe(true);
  });

  it("gives every sheikh a murattal reading and only offers the styles EveryAyah really has", () => {
    const byId = Object.fromEntries(RECITERS.map((r) => [r.id, r]));
    expect(Object.keys(byId["husary"].styles ?? {}).sort()).toEqual(["muallim", "mujawwad"]);
    expect(Object.keys(byId["abdul-basit"].styles ?? {})).toEqual(["mujawwad"]);
    expect(Object.keys(byId["minshawy"].styles ?? {})).toEqual(["mujawwad"]);
    expect(byId["alafasy"].styles).toBeUndefined();
  });

  it("includes Nasser Al-Qatami", () => {
    expect(RECITERS.find((r) => r.id === "nasser-alqatami")?.everyAyahSubfolder).toBe("Nasser_Alqatami_128kbps");
  });

  it("has unique tafsir editions (by id and Quran.com resource id), with at least one per UI language", () => {
    const ids = TAFSIR_EDITIONS.map((e) => e.id);
    const resourceIds = TAFSIR_EDITIONS.map((e) => e.quranComId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(resourceIds).size).toBe(resourceIds.length);
    expect(TAFSIR_EDITIONS.some((e) => e.language === "en")).toBe(true);
    expect(TAFSIR_EDITIONS.some((e) => e.language === "ar")).toBe(true);
  });

  it("includes al-Tafsir al-Muyassar, as Quran.com resource 16 (checked against its /resources/tafsirs listing)", () => {
    expect(TAFSIR_EDITIONS.find((e) => e.id === "muyassar")).toEqual({ id: "muyassar", quranComId: 16, language: "ar" });
  });
});

describe("searchQuran (against the real corpus)", () => {
  const keys = (response: Awaited<ReturnType<typeof searchQuran>>) => response.hits.map((h) => `${h.surah}:${h.ayah}`);

  it("finds Ayat al-Kursi from bare, unvocalised Arabic", async () => {
    const response = await searchQuran("الحي القيوم");
    expect(response.field).toBe("arabic");
    expect(keys(response)).toContain("2:255");
    expect(keys(response)).toContain("3:2");
  });

  it("finds the same verse with the vocalised or alef-wasla spelling", async () => {
    expect(keys(await searchQuran("ٱلْحَىُّ ٱلْقَيُّومُ"))).toContain("2:255");
  });

  it("finds Al-Fatiha's 'Alamin whether typed with or without the long alef", async () => {
    expect(keys(await searchQuran("رب العالمين"))).toContain("1:2");
    expect(keys(await searchQuran("رب العلمين"))).toContain("1:2");
  });

  it("returns hits in mushaf order with in-range highlight ranges", async () => {
    const { hits } = await searchQuran("الرحمن", undefined, { limit: 500 });
    expect(hits.length).toBeGreaterThan(50);
    for (let i = 1; i < hits.length; i++) {
      const [a, b] = [hits[i - 1], hits[i]];
      expect(a.surah * 1000 + a.ayah).toBeLessThan(b.surah * 1000 + b.ayah);
    }
    for (const hit of hits) {
      expect(hit.ranges.length).toBeGreaterThan(0);
      for (const [start, end] of hit.ranges) {
        expect(start).toBeLessThan(end);
        expect(end).toBeLessThanOrEqual(hit.uthmaniText.length);
      }
    }
  });

  it("searches the English translation for a Latin query", async () => {
    const response = await searchQuran("Sustainer of existence");
    expect(response.field).toBe("translation");
    expect(keys(response)).toContain("2:255");
  });

  it("throws on an unknown translation edition rather than silently searching nothing", async () => {
    await expect(searchQuran("mercy", "xx.nope")).rejects.toThrow(/Unknown translation edition/);
  });
});
