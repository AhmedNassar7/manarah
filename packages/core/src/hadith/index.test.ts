import { describe, expect, it, vi } from "vitest";
import {
  fetchJsonWithFallback,
  formatHadithForSharing,
  hadithSectionUrls,
  cleanHadithText,
  mergeHadithEditions,
  parseHadithSectionResponse,
  type HadithText,
} from "./index.js";

// Shapes copied from real responses (fawazahmed0/hadith-api, 2026-11-04), trimmed.
const englishBukhari = {
  metadata: { name: "Sahih al Bukhari", section: { "1": "Revelation" } },
  hadiths: [
    {
      hadithnumber: 1,
      arabicnumber: 1,
      text: "Narrated 'Umar bin Al-Khattab: I heard Allah's Messenger (ﷺ) saying, \"The reward of deeds depends upon the intentions...\"",
      grades: [],
      reference: { book: 1, hadith: 1 },
    },
    { hadithnumber: 2, arabicnumber: 2, text: "Narrated 'Aisha: ...", grades: [], reference: { book: 1, hadith: 2 } },
  ],
};
const arabicBukhari = {
  hadiths: [
    { hadithnumber: 1, arabicnumber: 1, text: "حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ", grades: [], reference: { book: 1, hadith: 1 } },
    { hadithnumber: 2, arabicnumber: 2, text: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ", grades: [], reference: { book: 1, hadith: 2 } },
  ],
};
const englishAbuDawud = {
  hadiths: [
    {
      hadithnumber: 1,
      arabicnumber: 1,
      text: "Narrated Al-Mughirah ibn Shubah: ...",
      grades: [
        { name: "Al-Albani", grade: "Hasan Sahih" },
        { name: "Shuaib Al Arnaut", grade: "Sahih Lighairihi" },
      ],
      reference: { book: 1, hadith: 1 },
    },
  ],
};
// Muslim: hadithnumber is sequential, arabicnumber is the printed (fractional) numbering.
const englishMuslim = {
  hadiths: [{ hadithnumber: 93, arabicnumber: "8.01", text: "Yahya b. Ya'mur reported...", grades: [] }],
};

describe("hadithSectionUrls", () => {
  it("tries the minified CDN file, then the full CDN file, then GitHub raw", () => {
    expect(hadithSectionUrls("eng-bukhari", 6)).toEqual([
      "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/sections/6.min.json",
      "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/sections/6.json",
      "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/eng-bukhari/sections/6.min.json",
    ]);
  });
});

describe("parseHadithSectionResponse", () => {
  it("parses texts, numbers and in-book references", () => {
    const [first, second] = parseHadithSectionResponse(englishBukhari);
    expect(first).toMatchObject({ number: 1, displayNumber: "1", book: 1, inBook: 1, grades: [] });
    expect(first.text).toContain("The reward of deeds depends upon the intentions");
    expect(second.number).toBe(2);
  });

  it("keeps each scholar's grade with their name", () => {
    const [h] = parseHadithSectionResponse(englishAbuDawud);
    expect(h.grades).toEqual([
      { scholar: "Al-Albani", grade: "Hasan Sahih" },
      { scholar: "Shuaib Al Arnaut", grade: "Sahih Lighairihi" },
    ]);
  });

  it("keeps Muslim's fractional printed numbering as a string, separate from the sequential number", () => {
    const [h] = parseHadithSectionResponse(englishMuslim);
    expect(h.number).toBe(93);
    expect(h.displayNumber).toBe("8.01");
  });

  it("skips malformed or empty entries instead of failing the whole book", () => {
    const parsed = parseHadithSectionResponse({
      hadiths: [
        null,
        { hadithnumber: "x", text: "no number" },
        { hadithnumber: 3, text: "   " },
        { hadithnumber: 4, text: "kept", grades: [{ name: "A", grade: "" }, { name: 5 }, "junk"] },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ number: 4, text: "kept", grades: [] });
  });

  it("throws on an unexpected shape, so the UI can offer a retry", () => {
    expect(() => parseHadithSectionResponse(null)).toThrow();
    expect(() => parseHadithSectionResponse({ hadiths: "nope" })).toThrow();
    expect(() => parseHadithSectionResponse([])).toThrow();
  });
});

describe("mergeHadithEditions", () => {
  const ar = parseHadithSectionResponse(arabicBukhari);
  const en = parseHadithSectionResponse(englishBukhari);

  it("pairs the Arabic and English text of each hadith by number, in order", () => {
    const merged = mergeHadithEditions(ar, en);
    expect(merged.map((h) => h.number)).toEqual([1, 2]);
    expect(merged[0].arabic).toContain("حَدَّثَنَا الْحُمَيْدِيُّ");
    expect(merged[0].english).toContain("Narrated 'Umar");
    expect(merged[0]).toMatchObject({ book: 1, inBook: 1 });
  });

  it("keeps a hadith that only one edition has, and sorts by number", () => {
    const onlyEnglish: HadithText = { number: 3, displayNumber: "3", text: "English only", grades: [] };
    const merged = mergeHadithEditions(ar, [...en, onlyEnglish]);
    expect(merged.map((h) => h.number)).toEqual([1, 2, 3]);
    expect(merged[2].english).toBe("English only");
    expect(merged[2].arabic).toBeUndefined();

    const onlyArabic = mergeHadithEditions(ar, [en[0]]);
    expect(onlyArabic[1].arabic).toEqual(expect.any(String));
    expect(onlyArabic[1].english).toBeUndefined();
  });

  it("takes grades from whichever edition carries them", () => {
    const arabicNoGrades = parseHadithSectionResponse({ hadiths: [{ hadithnumber: 1, text: "ar" }] });
    const [merged] = mergeHadithEditions(arabicNoGrades, parseHadithSectionResponse(englishAbuDawud));
    expect(merged.grades.map((g) => g.scholar)).toEqual(["Al-Albani", "Shuaib Al Arnaut"]);
  });
});

describe("formatHadithForSharing", () => {
  const [entry] = mergeHadithEditions(
    parseHadithSectionResponse(arabicBukhari),
    parseHadithSectionResponse(englishBukhari)
  );

  it("shares the Arabic with a citation, adding the translation only when asked", () => {
    const arabicOnly = formatHadithForSharing(entry, "Sahih al-Bukhari", { includeTranslation: false });
    expect(arabicOnly).toBe(`${entry.arabic}\n\n(Sahih al-Bukhari 1)`);
    const both = formatHadithForSharing(entry, "Sahih al-Bukhari", { includeTranslation: true });
    expect(both).toBe(`${entry.arabic}\n\n${entry.english}\n\n(Sahih al-Bukhari 1)`);
  });

  it("falls back to the English when there is no Arabic text", () => {
    const text = formatHadithForSharing(
      { number: 9, displayNumber: "9", english: "English only", grades: [] },
      "Sunan Abu Dawud",
      { includeTranslation: false }
    );
    expect(text).toBe("English only\n\n(Sunan Abu Dawud 9)");
  });
});

describe("fetchJsonWithFallback", () => {
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  const http = (status: number) => ({ ok: false, status, json: async () => ({}) });

  it("returns the first URL's body and stops there", async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ a: 1 }));
    await expect(fetchJsonWithFallback(["u1", "u2"], fetchFn)).resolves.toEqual({ a: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("falls through a 403 (jsDelivr refusing the minified file) to the next URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(http(403)).mockResolvedValueOnce(ok({ b: 2 }));
    await expect(fetchJsonWithFallback(["min", "full", "raw"], fetchFn)).resolves.toEqual({ b: 2 });
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual(["min", "full"]);
  });

  it("falls through a network error, and through an unparseable body", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError("bad json")) })
      .mockResolvedValueOnce(ok({ c: 3 }));
    await expect(fetchJsonWithFallback(["a", "b", "c"], fetchFn)).resolves.toEqual({ c: 3 });
  });

  it("rejects with the last error when every URL fails", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(http(403)).mockResolvedValueOnce(http(503));
    await expect(fetchJsonWithFallback(["a", "b"], fetchFn)).rejects.toThrow("HTTP 503");
  });

  it("rejects when given nothing to try", async () => {
    await expect(fetchJsonWithFallback([], vi.fn())).rejects.toThrow();
  });
});

describe("cleanHadithText", () => {
  it("turns the source's HTML line break into a real one, so the source line stands on its own", () => {
    expect(cleanHadithText('... مُؤْمِنٌ بِالْكَوْكَبِ"<br>رواه البخاري (وكذلك مالك والنسائي)')).toBe(
      '... مُؤْمِنٌ بِالْكَوْكَبِ"\nرواه البخاري (وكذلك مالك والنسائي)',
    );
    expect(cleanHadithText("a<br/>b<BR />c")).toBe("a\nb\nc");
  });

  it("drops any other tag, keeps the words, and trims", () => {
    expect(cleanHadithText("  <p>Actions are <b>by intentions</b></p> \n")).toBe("Actions are by intentions");
    expect(cleanHadithText("plain text, no tags — إنما الأعمال بالنيات")).toBe("plain text, no tags — إنما الأعمال بالنيات");
  });

  it("is applied when a book is parsed", () => {
    const [h] = parseHadithSectionResponse({ hadiths: [{ hadithnumber: 1, text: "قال<br>رواه مسلم" }] });
    expect(h.text).toBe("قال\nرواه مسلم");
  });
});
