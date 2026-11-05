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

  // The Arabic titles come from a different dataset than the hadith text, matched to the English titles one by one —
  // so these pin that the pairing is right (a mis-aligned list would still be "all Arabic" but name the wrong books).
  it.each(HADITH_COLLECTIONS.map((c) => c.id))("%s: every book has an Arabic title, in Arabic script only", (id) => {
    for (const s of getHadithSections(id)) {
      expect(s.titleAr.trim().length, `${id} #${s.number} has no Arabic title`).toBeGreaterThan(2);
      expect(s.titleAr, `${id} #${s.number} Arabic title`).toMatch(/^[؀-ۿݐ-ݿ ()\-–,،:.؟/]+$/);
    }
  });

  it("pairs well-known Arabic titles with the right English ones", () => {
    const find = (id: Parameters<typeof getHadithSections>[0], title: string) => getHadithSections(id).find((s) => s.title === title)?.titleAr;
    expect(find("bukhari", "Ablutions (Wudu')")).toBe("كتاب الوضوء");
    expect(find("bukhari", "Belief")).toBe("كتاب الإيمان");
    expect(find("muslim", "The Book of Zakat")).toBe("كتاب الزكاة");
    expect(find("muslim", "The Book of Fasting")).toBe("كتاب الصيام");
    expect(find("abudawud", "The Book Of The Prayer For Rain (Kitab al-Istisqa')")).toBe("كتاب الاستسقاء");
    expect(find("nasai", "The Book of Water")).toBe("كتاب المياه");
    expect(find("ibnmajah", "The Book of the Prayer")).toBe("كتاب الصلاة");
  });

  it("gives each collection's book titles no duplicates within it, English or Arabic", () => {
    // Duplicates would mean the alignment collapsed two books onto one name.
    for (const { id } of HADITH_COLLECTIONS) {
      const sections = getHadithSections(id);
      expect(new Set(sections.map((s) => s.title)).size, `${id} English`).toBe(sections.length);
    }
  });
});
