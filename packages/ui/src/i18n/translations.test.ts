import { describe, expect, it } from "vitest";
import { arabicVerseCount, DICTIONARIES_FOR_TESTING, formatVerseCount, translate } from "./translations.js";

describe("translate", () => {
  it("returns the string for the given language", () => {
    expect(translate("en", "prayer.next")).toBe("Next prayer");
    expect(translate("ar", "prayer.next")).toBe("الصلاة القادمة");
  });

  it("substitutes {placeholder} variables", () => {
    expect(translate("en", "qibla.fromNorth", { deg: 42 })).toBe("42° from North");
    expect(translate("ar", "qibla.fromNorth", { deg: 42 })).toBe("42° من الشمال");
  });

  it("falls back to English, then the raw key, for a missing translation", () => {
    expect(translate("en", "some.made.up.key")).toBe("some.made.up.key");
  });

  it("leaves an unmatched placeholder untouched rather than dropping it", () => {
    expect(translate("en", "qibla.fromNorth", {})).toBe("{deg}° from North");
  });
});

describe("English and Arabic dictionaries", () => {
  it("have exactly the same set of keys", () => {
    const enKeys = Object.keys(DICTIONARIES_FOR_TESTING.en).sort();
    const arKeys = Object.keys(DICTIONARIES_FOR_TESTING.ar).sort();
    expect(arKeys, "Arabic dictionary has a different key set than English").toEqual(enKeys);
  });

  it("have no empty translation values", () => {
    for (const [language, dictionary] of Object.entries(DICTIONARIES_FOR_TESTING)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${language}["${key}"] is empty`).not.toBe("");
      }
    }
  });
});

describe("arabicVerseCount", () => {
  it("uses the singular phrase for 1", () => {
    expect(arabicVerseCount(1)).toBe("آية واحدة");
  });

  it("uses the dual form for 2", () => {
    expect(arabicVerseCount(2)).toBe("آيتان");
  });

  it("uses the plural form for 3-10", () => {
    expect(arabicVerseCount(3)).toBe("3 آيات");
    expect(arabicVerseCount(10)).toBe("10 آيات");
  });

  it("reverts to the singular noun for 11+", () => {
    expect(arabicVerseCount(11)).toBe("11 آية");
    expect(arabicVerseCount(286)).toBe("286 آية");
  });
});

describe("formatVerseCount", () => {
  it("pluralizes in English", () => {
    expect(formatVerseCount("en", 1)).toBe("1 verse");
    expect(formatVerseCount("en", 7)).toBe("7 verses");
  });

  it("delegates to arabicVerseCount in Arabic", () => {
    expect(formatVerseCount("ar", 2)).toBe("آيتان");
  });
});
