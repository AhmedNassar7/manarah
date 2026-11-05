import { describe, expect, it } from "vitest";
import type { AzkarCategory, AzkarItem } from "@manarah/core";
import categoriesData from "./categories.json";
import { AZKAR_CATEGORIES, AZKAR_SECTIONS, getAzkarCategoriesByTrigger, getAzkarCategory } from "./index.js";
import { EVENING_CATEGORY_ID, MORNING_CATEGORY_ID, MORNING_EVENING_RULES, splitMorningEvening } from "./morning-evening.js";

/**
 * The morning and evening lists are derived from Hisn al-Muslim's single
 * chapter 27. These tests are what makes that derivation trustworthy: religious
 * text must not be changed by a rule that is only "probably right", so each
 * evening wording is checked against the source's own evening text.
 */
const source = (categoriesData as AzkarCategory[]).find((c) => c.id === "27")!;
const { morning, evening } = splitMorningEvening(source);
const byId = (c: AzkarCategory, id: string): AzkarItem | undefined => c.items.find((i) => i.id === id);
const sourceItem = (id: string) => byId(source, id)!;

/** Consonants only: no vowel marks or punctuation, alef/ya/ta-marbuta variants folded — what must match letter for letter. */
const skeleton = (text: string) =>
  text
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");

/** The source's own evening wordings for an item: the contents of its square brackets, minus the "وإذا أمسى قال:" lead-in. */
const eveningBrackets = (id: string) =>
  [...sourceItem(id).arabic.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].replace(/^\s*وإذا أمسى قال:?\s*/, ""));

describe("the source chapter", () => {
  it("is Hisn al-Muslim chapter 27, with 24 items", () => {
    expect(source.nameArabic).toBe("أذكار الصباح والمساء");
    expect(source.items).toHaveLength(24);
  });

  it("marks every bracketed alternative as the evening wording — so removing them removes nothing else", () => {
    for (const item of source.items) {
      for (const m of item.arabic.matchAll(/\[([^\]]*)\]/g)) {
        expect(m[1].trim().startsWith("وإذا أمسى قال"), `item ${item.id}: ${m[1].slice(0, 40)}`).toBe(true);
      }
    }
  });
});

describe("the two lists", () => {
  it("are separate categories with their own ids, names, and reminder times", () => {
    expect(morning).toMatchObject({ id: MORNING_CATEGORY_ID, nameArabic: "أذكار الصباح", trigger: "morning" });
    expect(evening).toMatchObject({ id: EVENING_CATEGORY_ID, nameArabic: "أذكار المساء", trigger: "evening" });
    expect(getAzkarCategory("27")?.trigger).toBe("morning");
    expect(getAzkarCategory("27e")?.trigger).toBe("evening");
  });

  it("replace the combined chapter in the app's data, in place, with the source still intact", () => {
    const ids = AZKAR_CATEGORIES.map((c) => c.id);
    expect(ids.indexOf("27e")).toBe(ids.indexOf("27") + 1);
    expect(AZKAR_CATEGORIES.some((c) => c.trigger === "morning-evening")).toBe(false);
    expect(source.items).toHaveLength(24); // the upstream JSON is untouched
  });

  it("are what the Fajr (morning) and Asr (evening) reminders pick up — each only its own", () => {
    expect(getAzkarCategoriesByTrigger("morning").map((c) => c.id)).toEqual(["27"]);
    expect(getAzkarCategoriesByTrigger("evening").map((c) => c.id)).toEqual(["27e"]);
  });

  it("each appear in exactly one section of their own", () => {
    const sectionsWith = (id: string) => AZKAR_SECTIONS.filter((s) => s.categoryIds.includes(id)).map((s) => s.id);
    expect(sectionsWith("27")).toEqual(["morning"]);
    expect(sectionsWith("27e")).toEqual(["evening"]);
  });

  it("put the items the source itself restricts to one time in that list only", () => {
    // "(…إذا أصبح)" — morning only; "(…إذا أمسى)" — evening only.
    for (const id of ["93", "94", "95"]) {
      expect(sourceItem(id).arabic).toContain("إذا أصبح");
      expect(byId(morning, id)).toBeDefined();
      expect(byId(evening, id)).toBeUndefined();
    }
    expect(sourceItem("97").arabic).toContain("إذا أمسى");
    expect(byId(evening, "97")).toBeDefined();
    expect(byId(morning, "97")).toBeUndefined();
    expect(morning.items).toHaveLength(23);
    expect(evening.items).toHaveLength(21);
  });

  it("keep everything the source does not restrict in both, in the source's order", () => {
    const shared = source.items.map((i) => i.id).filter((id) => !MORNING_EVENING_RULES.MORNING_ONLY.has(id) && !MORNING_EVENING_RULES.EVENING_ONLY.has(id));
    expect(morning.items.map((i) => i.id).filter((id) => shared.includes(id))).toEqual(shared);
    expect(evening.items.map((i) => i.id).filter((id) => shared.includes(id))).toEqual(shared);
  });

  it("give the items that never differ (Ayat al-Kursi, the three Quls, Sayyid al-Istighfar…) the same text in both", () => {
    for (const id of ["75", "76", "79", "82", "83", "84", "85", "86", "87", "88", "91", "92", "96", "98"]) {
      expect(byId(morning, id)?.arabic, id).toBe(byId(evening, id)?.arabic);
      expect(byId(morning, id)?.arabic.trim(), id).toBe(sourceItem(id).arabic.trim());
    }
  });
});

describe("the morning list", () => {
  it("contains no bracketed alternatives and no evening wording", () => {
    for (const item of morning.items) {
      expect(item.arabic, item.id).not.toMatch(/[[\]]/);
      // Item 78 legitimately says both ("بك أصبحنا وبك أمسينا"); no other morning item has evening verbs.
      if (item.id !== "78") expect(skeleton(item.arabic), item.id).not.toMatch(/امسي|امسين|امسيت|امسى/);
    }
  });

  it("keeps the source's morning wording exactly, once the evening brackets are gone", () => {
    for (const item of morning.items) {
      const original = sourceItem(item.id).arabic.replace(/\s*\[[^\]]*\]/g, "").trim();
      expect(item.arabic, item.id).toBe(original);
    }
  });

  it("drops the book's notes about reading the evening wording from the English", () => {
    for (const item of morning.items) {
      expect(item.translation ?? "", item.id).not.toMatch(/for the evening, one reads/i);
      expect(item.translation ?? "", item.id).not.toContain("[In the evening:]");
      expect(item.translation ?? "", item.id).not.toContain("For the evening, the supplication");
    }
  });
});

describe("the evening list", () => {
  it("contains no bracketed alternatives and no morning wording", () => {
    for (const item of evening.items) {
      expect(item.arabic, item.id).not.toMatch(/[[\]]/);
      // 78 legitimately says both; 77/80/81/89/90 were the ones whose verbs we swapped.
      if (item.id !== "78") expect(skeleton(item.arabic), item.id).not.toMatch(/اصبح/);
    }
  });

  it("applies every substitution rule to text that really contains it — a changed upstream text fails here, loudly", () => {
    for (const [id, rules] of Object.entries(MORNING_EVENING_RULES.EVENING_ARABIC)) {
      const text = sourceItem(id).arabic.replace(/\s*\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
      for (const [from] of rules) expect(text.normalize("NFC"), `item ${id}: ${from}`).toContain(from.normalize("NFC"));
    }
  });

  // Where the source gives the evening wording in full, the result must be that wording, letter for letter.
  it("78 (O Allah, by You we reach the morning…) is the source's own evening wording", () => {
    const [full] = eveningBrackets("78");
    expect(skeleton(byId(evening, "78")!.arabic)).toBe(skeleton(full));
    expect(byId(evening, "78")!.arabic.normalize("NFC")).toContain("وَإِلَيْكَ الْمَصِيرُ".normalize("NFC")); // "and to You is the return", not "the resurrection"
  });

  it("89 (We have reached the evening… I ask You for the good of this night) is the source's own evening wording", () => {
    const [full] = eveningBrackets("89");
    expect(skeleton(byId(evening, "89")!.arabic)).toBe(skeleton(full));
  });

  it("77 starts with the source's evening opening and contains its evening clause, letter for letter", () => {
    const [opening, clause] = eveningBrackets("77");
    const result = skeleton(byId(evening, "77")!.arabic);
    expect(result.startsWith(skeleton(opening))).toBe(true);
    expect(result).toContain(skeleton(clause));
  });

  it("80, 81 and 90 start with the words the source says to start with (the rest is a verb swap, as the source's own note says)", () => {
    for (const id of ["80", "81", "90"]) {
      const [stub] = eveningBrackets(id);
      const lead = skeleton(stub.replace(/\.{2,}|…/g, ""));
      expect(skeleton(byId(evening, id)!.arabic), id).toContain(lead);
      expect(sourceItem(id).translation, id).toMatch(/for the evening, one reads/i);
    }
  });

  it("changes only the marked words: an evening item differs from its morning twin by the substituted words and nothing else", () => {
    for (const id of Object.keys(MORNING_EVENING_RULES.EVENING_ARABIC)) {
      let expected = byId(morning, id)!.arabic.replace(/\s+/g, " ").trim().normalize("NFC");
      for (const [from, to] of MORNING_EVENING_RULES.EVENING_ARABIC[id]) expected = expected.split(from.normalize("NFC")).join(to.normalize("NFC"));
      expect(byId(evening, id)!.arabic, id).toBe(expected);
    }
  });

  it("does not attach the morning recording to an evening wording", () => {
    for (const id of Object.keys(MORNING_EVENING_RULES.EVENING_ARABIC)) {
      expect(byId(morning, id)!.audioUrl, `morning ${id}`).toBeTruthy();
      expect(byId(evening, id)!.audioUrl, `evening ${id}`).toBeUndefined();
    }
    expect(byId(evening, "75")!.audioUrl).toBe(byId(morning, "75")!.audioUrl);
  });

  it("uses the source's own English for the evening wording where it gave one, and a plain swap where it did not", () => {
    expect(byId(evening, "78")!.translation).toContain("by Your leave we have reached the evening and by Your leave we have reached the morning");
    expect(byId(evening, "78")!.translation).toContain("unto You is our return");
    expect(byId(evening, "89")!.translation).toContain("We have reached the evening");
    expect(byId(evening, "89")!.translation).toContain("tonight");
    expect(byId(evening, "77")!.translation).toContain("We have reached the evening");
    expect(byId(evening, "77")!.translation).toContain("the good of this night");
    expect(byId(evening, "77")!.translation).not.toContain("morning");
    expect(byId(evening, "80")!.translation).toContain("I have reached the evening");
    // …and the morning list keeps the morning one.
    expect(byId(morning, "78")!.translation).toContain("unto You is our resurrection");
    expect(byId(morning, "89")!.translation).toContain("We have reached the morning");
  });
});
