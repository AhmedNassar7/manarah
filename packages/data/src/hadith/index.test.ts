import { describe, expect, it } from "vitest";
import { getHadithSections, HADITH_COLLECTIONS } from "./index.js";

/** Totals counted from the real Arabic + English files on 2026-11-04. */
const EXPECTED = {
  bukhari: { sections: 97, hadiths: 7278 },
  muslim: { sections: 57, hadiths: 7563 },
  abudawud: { sections: 43, hadiths: 5274 },
  tirmidhi: { sections: 49, hadiths: 3998 },
  nasai: { sections: 51, hadiths: 5683 },
  ibnmajah: { sections: 38, hadiths: 4343 },
} as const;

describe("hadith data integrity", () => {
  it("has the six canonical collections, each with an Arabic and an English edition", () => {
    expect(HADITH_COLLECTIONS.map((c) => c.id)).toEqual(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"]);
    for (const c of HADITH_COLLECTIONS) {
      expect(c.arabicEdition).toBe(`ara-${c.id}`);
      expect(c.englishEdition).toBe(`eng-${c.id}`);
    }
  });

  it.each(HADITH_COLLECTIONS.map((c) => c.id))("%s has the verified number of books and hadiths", (id) => {
    const sections = getHadithSections(id);
    expect(sections.length).toBe(EXPECTED[id].sections);
    expect(sections.reduce((sum, s) => sum + s.count, 0)).toBe(EXPECTED[id].hadiths);
  });

  it.each(HADITH_COLLECTIONS.map((c) => c.id))("%s has unique ascending book numbers, titles, and positive whole counts", (id) => {
    const sections = getHadithSections(id);
    const numbers = sections.map((s) => s.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
    for (const s of sections) {
      expect(s.title.trim().length, `${id} #${s.number} has no title`).toBeGreaterThan(0);
      expect(Number.isInteger(s.count) && s.count > 0, `${id} #${s.number} count`).toBe(true);
    }
  });

  it("keeps the well-known first books in place", () => {
    expect(getHadithSections("bukhari")[0]).toMatchObject({ number: 1, title: "Revelation" });
    expect(getHadithSections("muslim")[0]).toMatchObject({ number: 0, title: "Introduction" });
  });
});
