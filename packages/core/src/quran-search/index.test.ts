import { describe, expect, it } from "vitest";
import type { Surah, Translation, Verse } from "../quran-data/index.js";
import {
  buildQuranSearchIndex,
  isArabicQuery,
  parseVerseReference,
  searchQuranIndex,
  type QuranSearchHit,
} from "./index.js";

// Real Uthmani text (AlQuran Cloud), so the vocalisation/letter-form cases are the real ones.
const verses: Verse[] = [
  { surah: 1, ayah: 1, uthmaniText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
  { surah: 1, ayah: 2, uthmaniText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" },
  { surah: 1, ayah: 4, uthmaniText: "مَٰلِكِ يَوْمِ ٱلدِّينِ" },
  { surah: 2, ayah: 255, uthmaniText: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ" },
];
const translations: Translation[] = [
  { surah: 1, ayah: 1, text: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
  { surah: 1, ayah: 2, text: "[All] praise is [due] to Allah, Lord of the worlds -" },
  { surah: 1, ayah: 4, text: "Sovereign of the Day of Recompense." },
  { surah: 2, ayah: 255, text: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence." },
];
const index = buildQuranSearchIndex(verses, translations);

function refs(hits: QuranSearchHit[]): string[] {
  return hits.map((h) => `${h.surah}:${h.ayah}`);
}

function highlighted(hit: QuranSearchHit): string[] {
  const text = hit.field === "arabic" ? hit.uthmaniText : hit.translation!;
  return hit.ranges.map(([start, end]) => text.slice(start, end));
}

describe("isArabicQuery", () => {
  it("is true for any Arabic letter and false for Latin text and numbers", () => {
    expect(isArabicQuery("الله")).toBe(true);
    expect(isArabicQuery("mercy الله")).toBe(true);
    expect(isArabicQuery("mercy")).toBe(false);
    expect(isArabicQuery("2:255")).toBe(false);
  });
});

describe("searchQuranIndex — Arabic", () => {
  it("finds a vocalised verse from bare consonants", () => {
    expect(refs(searchQuranIndex(index, "الرحمن").hits)).toEqual(["1:1"]);
    expect(refs(searchQuranIndex(index, "ملك يوم").hits)).toEqual(["1:4"]);
  });

  it("treats alef wasla / hamza alef forms and ya / alef maqsura alike", () => {
    // 1:2 has "لِلَّهِ" (no alef), so it is correctly not a match for "الله".
    expect(refs(searchQuranIndex(index, "ٱلله").hits)).toEqual(["1:1", "2:255"]);
    expect(refs(searchQuranIndex(index, "الله").hits)).toEqual(["1:1", "2:255"]);
    expect(refs(searchQuranIndex(index, "أللة").hits)).toEqual(["1:1", "2:255"]); // أ and ة fold to ا and ه
    // ٱلْحَىُّ is spelt with alef maqsura in the mushaf; people type a plain ya.
    expect(refs(searchQuranIndex(index, "الحي").hits)).toEqual(["2:255"]);
  });

  it("matches a dagger alef whether the typist keeps the alef or not", () => {
    // ٱلْعَٰلَمِينَ — typed "العالمين"; ٱلرَّحْمَٰنِ — typed "الرحمن" (or "الرحمان").
    expect(refs(searchQuranIndex(index, "العالمين").hits)).toEqual(["1:2"]);
    expect(refs(searchQuranIndex(index, "العلمين").hits)).toEqual(["1:2"]);
    expect(refs(searchQuranIndex(index, "الرحمان").hits)).toEqual(["1:1"]);
    expect(refs(searchQuranIndex(index, "اله").hits)).toEqual(["2:255"]);
  });

  it("ignores tashkeel typed into the query", () => {
    expect(refs(searchQuranIndex(index, "ٱلرَّحْمَٰنِ").hits)).toEqual(["1:1"]);
  });

  it("requires every word, in any order, and substring-matches within words", () => {
    expect(refs(searchQuranIndex(index, "الدين يوم").hits)).toEqual(["1:4"]);
    expect(refs(searchQuranIndex(index, "يوم الرحمن").hits)).toEqual([]);
    expect(refs(searchQuranIndex(index, "رحم").hits)).toEqual(["1:1"]);
  });

  it("highlights whole matched words with their original diacritics", () => {
    const [hit] = searchQuranIndex(index, "الرحمن").hits;
    expect(hit.field).toBe("arabic");
    expect(highlighted(hit)).toEqual(["ٱلرَّحْمَٰنِ"]);
  });

  it("merges overlapping highlights", () => {
    const [hit] = searchQuranIndex(index, "الرحمن رحم").hits;
    expect(highlighted(hit)).toEqual(["ٱلرَّحْمَٰنِ"]);
  });
});

describe("searchQuranIndex — translation", () => {
  it("searches the translation for a non-Arabic query, case-insensitively", () => {
    const response = searchQuranIndex(index, "RECOMPENSE");
    expect(response.field).toBe("translation");
    expect(refs(response.hits)).toEqual(["1:4"]);
  });

  it("looks past punctuation and brackets", () => {
    expect(refs(searchQuranIndex(index, "all praise").hits)).toEqual(["1:2"]);
    expect(refs(searchQuranIndex(index, "ever-living").hits)).toEqual(["2:255"]);
    expect(refs(searchQuranIndex(index, "everliving").hits)).toEqual([]);
  });

  it("requires every word, in any order", () => {
    expect(refs(searchQuranIndex(index, "merciful allah").hits)).toEqual(["1:1"]);
    expect(refs(searchQuranIndex(index, "merciful sovereign").hits)).toEqual([]);
  });

  it("highlights each matched word in the original text", () => {
    const [hit] = searchQuranIndex(index, "allah merciful").hits;
    expect(highlighted(hit)).toEqual(["Allah", "Merciful", "Merciful"]);
  });

  it("ignores apostrophes so possessives match the bare name", () => {
    const withPossessive = buildQuranSearchIndex(
      [{ surah: 2, ayah: 130, uthmaniText: "x" }],
      [{ surah: 2, ayah: 130, text: "Who would reject the religion of Abraham's father?" }]
    );
    expect(searchQuranIndex(withPossessive, "abraham").hits).toHaveLength(1);
    expect(searchQuranIndex(withPossessive, "abraham's").hits).toHaveLength(1);
  });

  it("returns nothing for translation queries when no translation is loaded", () => {
    expect(searchQuranIndex(buildQuranSearchIndex(verses), "allah").total).toBe(0);
  });
});

describe("searchQuranIndex — limits", () => {
  it("returns nothing for empty, whitespace-only or one-letter queries", () => {
    expect(searchQuranIndex(index, "").total).toBe(0);
    expect(searchQuranIndex(index, "   ").total).toBe(0);
    expect(searchQuranIndex(index, "a").total).toBe(0);
    expect(searchQuranIndex(index, "ا").total).toBe(0);
    expect(searchQuranIndex(index, "َُ").total).toBe(0);
  });

  it("caps the returned hits but still counts every match", () => {
    const response = searchQuranIndex(index, "الله", { limit: 1 });
    expect(response.total).toBe(2);
    expect(refs(response.hits)).toEqual(["1:1"]);
  });
});

describe("parseVerseReference", () => {
  const surahs = [
    { number: 1, verseCount: 7 },
    { number: 2, verseCount: 286 },
  ] as Surah[];

  it("parses surah:ayah in a few spellings", () => {
    expect(parseVerseReference("2:255", surahs)).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference(" 2 : 255 ", surahs)).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference("1.7", surahs)).toEqual({ surah: 1, ayah: 7 });
  });

  it("rejects out-of-range verses, unknown surahs and non-references", () => {
    expect(parseVerseReference("1:8", surahs)).toBeUndefined();
    expect(parseVerseReference("1:0", surahs)).toBeUndefined();
    expect(parseVerseReference("3:1", surahs)).toBeUndefined();
    expect(parseVerseReference("255", surahs)).toBeUndefined();
    expect(parseVerseReference("allah 2:1", surahs)).toBeUndefined();
  });
});
