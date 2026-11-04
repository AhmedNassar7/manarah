import type { Surah, Translation, Verse, VerseRef } from "../quran-data/index.js";

/**
 * Full-text search over the Quran's Arabic text and a translation.
 *
 * Pure and platform-agnostic: callers hand in the verses/translation they
 * have loaded (the data package lazy-loads them) and get back plain hits.
 * Two things make Quran search different from `String.includes`:
 *
 *  - The Uthmani text is fully vocalised and uses mushaf-only letter forms
 *    (alef wasla ٱ, dagger alef ٰ, small high marks), while people type bare
 *    consonants — so both sides are folded to a bare skeleton before
 *    comparing, and matches are mapped back to the original text so the UI
 *    can highlight exactly what matched.
 *  - The dagger alef is ambiguous: ٱلرَّحْمَٰنِ is typed "الرحمن" (alef
 *    dropped) but ٱلْعَٰلَمِينَ is typed "العالمين" (alef kept). Each verse is
 *    therefore indexed in both forms and a search term matches if it fits
 *    either.
 */

/** Queries shorter than this (after normalisation) match too much to be useful, and return nothing. */
export const MIN_SEARCH_QUERY_LENGTH = 2;

type Variant = "arabic-drop-dagger" | "arabic-keep-dagger" | "latin";

// Harakat, tanween, shadda, sukun, maddah/hamza marks (U+064B–U+065F), and
// the Quranic annotation marks — small high letters, stop signs, hizb
// marker (U+06D6–U+06ED) — plus tatweel. None are letters people type.
const ARABIC_MARK = /[ً-ٟۖ-ۭـ]/;
const DAGGER_ALEF = "ٰ";
const ARABIC_LETTER = /[؀-ۿ]/;

const ARABIC_LETTER_FOLDS: Record<string, string> = {
  "ٱ": "ا", // ٱ alef wasla
  "آ": "ا", // آ
  "أ": "ا", // أ
  "إ": "ا", // إ
  "ى": "ي", // ى alef maqsura → ya
  "ی": "ي", // ی Persian/Urdu ya → ya
  "ة": "ه", // ة ta marbuta → ha
  "ؤ": "و", // ؤ → و
  "ئ": "ي", // ئ → ي
  "ک": "ك", // ک Persian/Urdu kaf → kaf
};

interface Normalized {
  text: string;
  /** `origin[i]` is the index in the original string of the character that produced `text[i]`. */
  origin: number[];
}

function normalize(source: string, variant: Variant): Normalized {
  let text = "";
  const origin: number[] = [];

  function push(ch: string, index: number) {
    for (const c of ch) {
      text += c;
      origin.push(index);
    }
  }

  function pushSpace(index: number) {
    if (text !== "" && !text.endsWith(" ")) push(" ", index);
  }

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (variant === "latin") {
      if (ch === "'" || ch === "’") continue; // "Ibrahim's" → "ibrahims", not "ibrahim s"
      if (/[\p{L}\p{N}]/u.test(ch)) {
        // Fold accents ("Qurʾān" → "quran") via canonical decomposition.
        push(ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(), i);
      } else if (!/\p{M}/u.test(ch)) {
        pushSpace(i);
      }
      continue;
    }

    if (ch === DAGGER_ALEF) {
      if (variant === "arabic-keep-dagger") push("ا", i);
      continue;
    }
    if (ARABIC_MARK.test(ch)) continue;
    if (/\s/.test(ch)) {
      pushSpace(i);
      continue;
    }
    push(ARABIC_LETTER_FOLDS[ch] ?? ch, i);
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    origin.pop();
  }
  return { text, origin };
}

/** True when the query contains Arabic-script letters, i.e. should be matched against the Arabic text rather than the translation. */
export function isArabicQuery(query: string): boolean {
  return ARABIC_LETTER.test(query);
}

/** Matches "2:255", "2 : 255" or "2.255" and validates it against real surah/verse counts — such a query is a jump, not a text search. */
export function parseVerseReference(query: string, surahs: Surah[]): VerseRef | undefined {
  const match = /^\s*(\d{1,3})\s*[:.]\s*(\d{1,3})\s*$/.exec(query);
  if (!match) return undefined;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  const meta = surahs.find((s) => s.number === surah);
  if (!meta || ayah < 1 || ayah > meta.verseCount) return undefined;
  return { surah, ayah };
}

interface IndexEntry {
  surah: number;
  ayah: number;
  arabic: string;
  arabicDrop: string;
  arabicKeep: string;
  translation: string | undefined;
  translationNormalized: string | undefined;
}

export interface QuranSearchIndex {
  entries: IndexEntry[];
}

/** Precomputes the folded forms of every verse once, so each keystroke is a plain substring scan. */
export function buildQuranSearchIndex(verses: Verse[], translations: Translation[] = []): QuranSearchIndex {
  const translationByVerse = new Map(translations.map((t) => [`${t.surah}:${t.ayah}`, t.text]));
  return {
    entries: verses.map((v) => {
      const translation = translationByVerse.get(`${v.surah}:${v.ayah}`);
      return {
        surah: v.surah,
        ayah: v.ayah,
        arabic: v.uthmaniText,
        arabicDrop: normalize(v.uthmaniText, "arabic-drop-dagger").text,
        arabicKeep: normalize(v.uthmaniText, "arabic-keep-dagger").text,
        translation,
        translationNormalized: translation === undefined ? undefined : normalize(translation, "latin").text,
      };
    }),
  };
}

export type QuranSearchField = "arabic" | "translation";

export interface QuranSearchHit {
  surah: number;
  ayah: number;
  uthmaniText: string;
  translation: string | undefined;
  /** Which text matched — and therefore which one `ranges` refers to. */
  field: QuranSearchField;
  /** Half-open [start, end) character ranges in the matched text, sorted and non-overlapping, for highlighting. */
  ranges: Array<[number, number]>;
}

export interface QuranSearchResponse {
  field: QuranSearchField;
  /** How many verses matched in all (may exceed `hits.length`, which is capped by `limit`). */
  total: number;
  hits: QuranSearchHit[];
}

export interface QuranSearchOptions {
  /** Maximum hits returned; the rest are still counted in `total`. Default 50. */
  limit?: number;
}

const EMPTY_RESPONSE = (field: QuranSearchField): QuranSearchResponse => ({ field, total: 0, hits: [] });

/**
 * Finds verses containing every word of `query` (any order, as substrings,
 * so "رحم" also finds "الرحمن"). An Arabic query searches the Arabic text; any
 * other query searches the translation. Hits come back in mushaf order.
 */
export function searchQuranIndex(
  index: QuranSearchIndex,
  query: string,
  { limit = 50 }: QuranSearchOptions = {}
): QuranSearchResponse {
  return isArabicQuery(query) ? searchArabic(index, query, limit) : searchTranslation(index, query, limit);
}

function searchArabic(index: QuranSearchIndex, query: string, limit: number): QuranSearchResponse {
  const dropTerms = termsOf(normalize(query, "arabic-drop-dagger").text);
  const keepTerms = termsOf(normalize(query, "arabic-keep-dagger").text);
  if (dropTerms.length === 0 || totalLength(dropTerms) < MIN_SEARCH_QUERY_LENGTH) return EMPTY_RESPONSE("arabic");

  // A term matches a verse if it fits in either dagger-alef form.
  const matches = (entry: IndexEntry) =>
    dropTerms.every((drop, i) => entry.arabicDrop.includes(drop) || entry.arabicKeep.includes(keepTerms[i] ?? drop));

  const hits: QuranSearchHit[] = [];
  let total = 0;
  for (const entry of index.entries) {
    if (!matches(entry)) continue;
    total++;
    if (hits.length >= limit) continue;

    const drop = normalize(entry.arabic, "arabic-drop-dagger");
    const keep = normalize(entry.arabic, "arabic-keep-dagger");
    const spans: Array<[number, number]> = [];
    dropTerms.forEach((dropTerm, i) => {
      let source = drop;
      let found = occurrences(drop.text, dropTerm);
      if (found.length === 0) {
        source = keep;
        found = occurrences(keep.text, keepTerms[i] ?? dropTerm);
      }
      for (const [start, end] of found) spans.push(toOriginalRange(entry.arabic, source, start, end));
    });
    hits.push({
      surah: entry.surah,
      ayah: entry.ayah,
      uthmaniText: entry.arabic,
      translation: entry.translation,
      field: "arabic",
      ranges: mergeRanges(spans),
    });
  }
  return { field: "arabic", total, hits };
}

function searchTranslation(index: QuranSearchIndex, query: string, limit: number): QuranSearchResponse {
  const terms = termsOf(normalize(query, "latin").text);
  if (terms.length === 0 || totalLength(terms) < MIN_SEARCH_QUERY_LENGTH) return EMPTY_RESPONSE("translation");

  const hits: QuranSearchHit[] = [];
  let total = 0;
  for (const entry of index.entries) {
    const haystack = entry.translationNormalized;
    if (haystack === undefined || !terms.every((term) => haystack.includes(term))) continue;
    total++;
    if (hits.length >= limit) continue;

    const normalized = normalize(entry.translation!, "latin");
    const spans = terms.flatMap((term) =>
      occurrences(normalized.text, term).map(([start, end]) => toOriginalRange(entry.translation!, normalized, start, end))
    );
    hits.push({
      surah: entry.surah,
      ayah: entry.ayah,
      uthmaniText: entry.arabic,
      translation: entry.translation,
      field: "translation",
      ranges: mergeRanges(spans),
    });
  }
  return { field: "translation", total, hits };
}

function termsOf(normalized: string): string[] {
  return normalized === "" ? [] : normalized.split(" ");
}

function totalLength(terms: string[]): number {
  return terms.reduce((sum, term) => sum + term.length, 0);
}

function occurrences(haystack: string, needle: string): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  for (let from = haystack.indexOf(needle); from !== -1; from = haystack.indexOf(needle, from + needle.length)) {
    found.push([from, from + needle.length]);
  }
  return found;
}

/**
 * Maps a [start, end) span in normalised text back onto the original string.
 * The end is stretched over any diacritics that trail the last matched
 * letter, so a highlighted word keeps its harakat.
 */
function toOriginalRange(original: string, normalized: Normalized, start: number, end: number): [number, number] {
  const originalStart = normalized.origin[start];
  let originalEnd = normalized.origin[end - 1] + 1;
  while (originalEnd < original.length && (ARABIC_MARK.test(original[originalEnd]) || original[originalEnd] === DAGGER_ALEF)) {
    originalEnd++;
  }
  return [originalStart, originalEnd];
}

function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
