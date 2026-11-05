import { describe, expect, it } from "vitest";
import { TASBIH_DHIKR } from "@manarah/core";
import { AZKAR_CATEGORIES } from "./index.js";

/**
 * The tasbih's phrases are short and everyone knows them, which is exactly
 * when a slipped letter goes unnoticed. So each one is checked against the
 * Hisn al-Muslim text the app already ships: its consonants must occur there.
 */
const skeleton = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");

const corpus = skeleton(AZKAR_CATEGORIES.flatMap((c) => c.items.map((i) => i.arabic)).join(" "));

describe("tasbih phrases", () => {
  it.each(TASBIH_DHIKR.map((d) => [d.id, d.arabic]))("%s occurs in the Hisn al-Muslim text", (_id, arabic) => {
    expect(corpus, arabic).toContain(skeleton(arabic));
  });
});
