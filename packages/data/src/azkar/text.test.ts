import { describe, expect, it } from "vitest";
import { AYAH_SEPARATOR, parseAzkarText, splitAzkarTranslation } from "@manarah/core";
import { AZKAR_CATEGORIES } from "./index.js";

/**
 * The display parser (packages/core/azkar-text) is only trustworthy if it can
 * never lose or invent a word of a dua. These run it over every real entry.
 */
const items = AZKAR_CATEGORIES.flatMap((c) => c.items.map((item) => ({ category: c.id, item })));

/** Letters and marks only: drops every bracket, ornament, separator, digit-like mark and space. */
function letters(text: string): string {
  return text.replace(/[^\p{L}\p{M}]/gu, "");
}

describe("parseAzkarText against the real Hisn al-Muslim corpus", () => {
  it("covers every entry", () => {
    expect(items.length).toBe(266);
  });

  it("never loses or invents a letter or diacritic — the parts together are exactly the original text", () => {
    for (const { category, item } of items) {
      const parts = parseAzkarText(item.arabic);
      expect(letters(parts.map((p) => p.text).join("")), `category ${category}, item ${item.id}`).toBe(letters(item.arabic));
    }
  });

  it("gives every entry at least one part, none of them empty", () => {
    for (const { category, item } of items) {
      const parts = parseAzkarText(item.arabic);
      expect(parts.length, `category ${category}, item ${item.id}`).toBeGreaterThan(0);
      for (const part of parts) expect(part.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("leaves no source marker in the displayed text", () => {
    for (const { category, item } of items) {
      for (const part of parseAzkarText(item.arabic)) {
        expect(part.text, `category ${category}, item ${item.id}`).not.toMatch(/\(\(|\)\)|﴿|﴾|\*/);
      }
    }
  });

  it("makes a verse part out of every ﴿…﴾ in the source, and only those", () => {
    for (const { category, item } of items) {
      const hasVerse = item.arabic.includes("﴿");
      const verseParts = parseAzkarText(item.arabic).filter((p) => p.kind === "quran");
      expect(verseParts.length > 0, `category ${category}, item ${item.id}`).toBe(hasVerse);
    }
  });

  it("marks verse breaks with the ayah-end ornament instead of the source's asterisk", () => {
    const withBreaks = items.find(({ item }) => /﴿[^﴾]*\*[^﴾]*﴾/.test(item.arabic))!;
    const verse = parseAzkarText(withBreaks.item.arabic).find((p) => p.kind === "quran")!;
    expect(verse.text).toContain(AYAH_SEPARATOR);
    expect(verse.text).not.toContain("*");
  });
});

describe("splitAzkarTranslation against the real corpus", () => {
  const translated = items.filter(({ item }) => item.translation);
  const words = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "");

  it("covers a large share of the corpus", () => {
    expect(translated.length).toBeGreaterThan(250);
  });

  it("keeps every word of every translation, in order", () => {
    for (const { category, item } of translated) {
      const joined = splitAzkarTranslation(item.translation!).join(" ");
      expect(words(joined), `category ${category}, item ${item.id}`).toBe(words(item.translation!));
    }
  });

  it("never returns an empty paragraph", () => {
    for (const { item } of translated) for (const p of splitAzkarTranslation(item.translation!)) expect(p.trim()).not.toBe("");
  });

  it("no longer wraps a whole single-part translation in parentheses", () => {
    const single = translated.filter(({ item }) => splitAzkarTranslation(item.translation!).length === 1);
    expect(single.length).toBeGreaterThan(150);
    for (const { category, item } of single) {
      const [only] = splitAzkarTranslation(item.translation!);
      const wrappedWhole = only.startsWith("(") && only.endsWith(")") && !/\)[^()]*\(/.test(only);
      expect(wrappedWhole, `category ${category}, item ${item.id}: ${only.slice(0, 60)}`).toBe(false);
    }
  });
});
