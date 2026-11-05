import type { AzkarCategory, AzkarItem } from "@manarah/core";

/**
 * Hisn al-Muslim has ONE chapter for the morning and evening adhkar (chapter
 * 27): each dhikr is written once, with the evening wording added in square
 * brackets where it differs ("[وإذا أمسى قال: …]"), and a few items are
 * restricted to one time by their own wording ("إذا أصبح", "إذا أمسى"). That
 * is faithful to the book but easy to get wrong in practice — which wording
 * do I say now? — so the app shows two lists, one for each time.
 *
 * The upstream chapter is kept untouched in categories.json; this derives the
 * two lists from it, by rules rather than by retyping anything:
 *
 *  - Morning = the chapter's text with the bracketed evening alternatives removed.
 *  - Evening = the same text with the evening wording substituted by the explicit
 *    rules below. Each rule changes only the words the source itself marks (أصبحنا →
 *    أمسينا, هذا اليوم → هذه الليلة, …). Where the source gives the evening wording
 *    in full, the tests check the result against it letter for letter; where it
 *    only says how to start ("اللهم إني أمسيت…") they check the start — and the
 *    source's own English note says it is a verb swap ("for the evening, one reads
 *    amsaytu instead of asbahtu").
 *  - An item the text restricts to one time (إذا أصبح / إذا أمسى) goes only in that
 *    list. Everything else the source does not restrict appears in both.
 *
 * The morning list keeps the chapter's id ("27") so reminders and schedules
 * saved before the split keep pointing at it.
 */
export const MORNING_CATEGORY_ID = "27";
export const EVENING_CATEGORY_ID = "27e";

/** Items the source's own wording restricts to the morning ("إذا أصبح") or the evening ("إذا أمسى"). */
const MORNING_ONLY = new Set(["93", "94", "95"]);
const EVENING_ONLY = new Set(["97"]);

type Substitution = [from: string, to: string];

/**
 * Evening wording, as exact substitutions on the (whitespace-collapsed) morning
 * Arabic. Every `from` must occur in the source text — the tests enforce it, so
 * a changed upstream text fails loudly instead of silently dropping a rule.
 */
const EVENING_ARABIC: Record<string, Substitution[]> = {
  // "We have reached the evening and the dominion is Allah's…" — and "this night" for "this day".
  "77": [
    ["أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ", "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ"],
    ["هَذَا الْيَوْمِ", "هَذِهِ اللَّيْلَةِ"],
    ["بَعْدَهُ", "بَعْدَهَا"],
  ],
  // The source gives this one in full: the two clauses swap, and "resurrection" becomes "the return".
  "78": [
    ["أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا", "أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا"],
    ["النُّشُورُ", "الْمَصِيرُ"],
  ],
  "80": [["أَصْبَحْتُ", "أَمْسَيْتُ"]],
  "81": [["أَصْبَحَ بِي", "أَمْسَى بِي"]],
  // Given in full by the source: "this night", and the feminine pronoun for each thing asked of it.
  "89": [
    ["أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ", "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ"],
    ["هَذَا الْيَوْمِ", "هَذِهِ اللَّيْلَةِ"],
    ["فَتْحَهُ، وَنَصْرَهُ، وَنورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ", "فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا"],
    ["مَا فِيهِ وَشَرِّ مَا بَعْدَهُ", "مَا فِيهَا وَشَرِّ مَا بَعْدَهَا"],
  ],
  "90": [["أَصْبَحْنا عَلَى", "أَمْسَيْنا عَلَى"]],
};

/** English for the evening where it follows from the source's own English by a plain swap. */
const EVENING_ENGLISH: Record<string, Substitution[]> = {
  "77": [
    ["reached the morning", "reached the evening"],
    ["this day", "this night"],
  ],
  "80": [["reached the morning", "reached the evening"]],
};

/** The evening marker the source puts inside a few English translations, where it gives the evening wording in full. */
const ENGLISH_EVENING_MARKERS = ["[In the evening:]", "[For the evening, the supplication is read as follows:]"];

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

/** Everything in square brackets is an evening alternative ("[وإذا أمسى قال: …]"). */
function stripEveningBrackets(arabic: string): string {
  return arabic.replace(/\s*\[[^\]]*\]/g, "").trim();
}

/** The source's notes about reading the evening wording — meaningful in the book's single chapter, noise in either list. */
function stripEveningNote(english: string): string {
  return english.replace(/\s*\(Note: for the evening[^)]*\)/g, "").trim();
}

/**
 * Applies the substitutions in Unicode's canonical form (NFC). Vowel marks can be written in
 * more than one order (shadda before or after the vowel) with identical appearance, and the
 * source and a rule need not agree on it; compared canonically they always do.
 */
function applyAll(text: string, rules: Substitution[]): string {
  let result = text.normalize("NFC");
  for (const [from, to] of rules) result = result.split(from.normalize("NFC")).join(to.normalize("NFC"));
  return result;
}

function morningItem(item: AzkarItem): AzkarItem {
  const out: AzkarItem = { ...item, arabic: stripEveningBrackets(item.arabic) };
  if (item.translation) {
    let english = item.translation;
    for (const marker of ENGLISH_EVENING_MARKERS) {
      const at = english.indexOf(marker);
      if (at >= 0) english = english.slice(0, at);
    }
    out.translation = stripEveningNote(english);
  }
  return out;
}

function eveningItem(item: AzkarItem): AzkarItem {
  const rules = EVENING_ARABIC[item.id];
  if (!rules) {
    const same: AzkarItem = { ...item, arabic: stripEveningBrackets(item.arabic) };
    if (item.translation) same.translation = stripEveningNote(item.translation);
    return same;
  }

  const out: AzkarItem = { ...item, arabic: applyAll(collapse(stripEveningBrackets(item.arabic)), rules) };
  // The recording is of the morning wording; it must not play under the evening text.
  delete out.audioUrl;

  if (item.translation) {
    const english = item.translation;
    const marker = ENGLISH_EVENING_MARKERS.find((m) => english.includes(m));
    if (marker) {
      // The source translated the evening wording itself — use it as written.
      out.translation = english.slice(english.indexOf(marker) + marker.length).trim();
    } else if (EVENING_ENGLISH[item.id]) {
      out.translation = applyAll(stripEveningNote(english), EVENING_ENGLISH[item.id]);
    } else {
      out.translation = stripEveningNote(english);
    }
  }
  return out;
}

/** Derives the morning and evening lists from Hisn al-Muslim's combined chapter. */
export function splitMorningEvening(source: AzkarCategory): { morning: AzkarCategory; evening: AzkarCategory } {
  const morning: AzkarCategory = {
    ...source,
    id: MORNING_CATEGORY_ID,
    name: "Morning azkar",
    nameArabic: "أذكار الصباح",
    trigger: "morning",
    items: source.items.filter((i) => !EVENING_ONLY.has(i.id)).map(morningItem),
  };
  const evening: AzkarCategory = {
    ...source,
    id: EVENING_CATEGORY_ID,
    name: "Evening azkar",
    nameArabic: "أذكار المساء",
    trigger: "evening",
    items: source.items.filter((i) => !MORNING_ONLY.has(i.id)).map(eveningItem),
  };
  return { morning, evening };
}

/** Exposed for the tests that check each rule against the source. */
export const MORNING_EVENING_RULES = { EVENING_ARABIC, EVENING_ENGLISH, MORNING_ONLY, EVENING_ONLY };
