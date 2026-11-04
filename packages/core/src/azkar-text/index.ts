/**
 * Display structure for an azkar entry's Arabic text.
 *
 * The Hisn al-Muslim source stores each dua as one string and marks its parts
 * with the conventions of the printed book: `((…))` wraps the words to say,
 * `﴿…﴾` wraps a Quranic verse (with `*` between its verses), `(…)` holds an
 * instruction such as "(three times)", and `[…]` an alternative wording (the
 * evening version of a morning dua). Shown raw, those markers read as stray
 * punctuation and several distinct things run together as one block.
 *
 * This turns the string into typed parts so the UI can show each on its own —
 * verses in the Quran face, instructions quiet, the words to say prominent.
 * It is a *presentation* pass: the stored text is untouched (so the data stays
 * faithful to, and re-syncable with, its source), and the data tests prove no
 * letter is ever dropped or invented.
 */

export type AzkarPartKind =
  /** Words to recite. */
  | "dua"
  /** A Quranic verse (or verses) — shown in the Quran face with ornate brackets. */
  | "quran"
  /** An instruction or introduction: "(three times)", "The Prophet ﷺ said:". Context, not recitation. */
  | "note"
  /** An alternative wording, e.g. the evening version of a morning dua, given in square brackets in the source. */
  | "variant";

export interface AzkarTextPart {
  kind: AzkarPartKind;
  text: string;
}

/** The ornament shown between verses; the source uses "*". */
export const AYAH_SEPARATOR = "۝";

type Origin = "outside" | "dua" | "quran";

const LETTER = /[\p{L}]/u;
const DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;

/** Instructions about repetition: "(ثلاثَ مرَّاتٍ)", "سبع مرات", "مائة مرة" — short, and about how many times. */
const REPEAT_INSTRUCTION = /(مرة|مرات|مرَّات|مرّات|مَرَّاتٍ|مَرّاتٍ|مَرَّةٍ)/;

/** English repetition instructions: "(three times)", "(once)", "(repeat 7 times)". */
const REPEAT_WORDS = /\b(times?|once|twice|thrice|repeat\w*)\b/i;

function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, "");
}

function trimSeparators(text: string): string {
  return text.replace(/^[\s،؛.,]+/, "").replace(/[\s،؛.,]+$/, "");
}

/** A single-parenthesis group that contains a verse is a printed-book "words to say" group too (e.g. each surah with its basmala): treat it like `((…))`. */
function normalizeVerseGroups(text: string): string {
  return text.replace(/(?<!\()\(([^()]*﴿[^()]*)\)(?!\))/g, "(($1))");
}

function classify(text: string, origin: Origin): AzkarPartKind {
  if (origin === "quran") return "quran";

  const bare = stripDiacritics(text).trim();
  if (/^\[/.test(text.trim())) return "variant";
  if (/:$/.test(bare)) return "note"; // "قال النبي ﷺ:" — introduces what follows
  const wrapped = /^\(.*\)$/s.test(bare) && !bare.slice(1, -1).includes("(");
  if (wrapped && REPEAT_INSTRUCTION.test(bare) && bare.length < 60) return "note";
  if (!wrapped && bare.length < 40 && REPEAT_INSTRUCTION.test(bare) && !/[،؛]/.test(bare) && bare.split(/\s+/).length <= 4) return "note";
  return "dua";
}

/**
 * Splits an azkar entry's Arabic text into display parts, in order.
 *
 * Tolerant of the source's real-world messiness: unbalanced or nested `((`
 * (a second `((` inside an open one just starts a new part), a stray `))`,
 * and one unclosed `﴿`. Anything it doesn't recognise stays as recited text.
 */
export function parseAzkarText(arabic: string): AzkarTextPart[] {
  const text = normalizeVerseGroups(arabic);
  const raw: Array<{ origin: Origin; text: string }> = [];

  let mode: Origin = "outside";
  let inVerse = false;
  let buffer = "";

  const flush = () => {
    if (buffer !== "") raw.push({ origin: inVerse ? "quran" : mode, text: buffer });
    buffer = "";
  };

  for (let i = 0; i < text.length; ) {
    if (text.startsWith("((", i)) {
      flush();
      mode = "dua";
      i += 2;
    } else if (text.startsWith("))", i)) {
      flush();
      mode = "outside";
      i += 2;
    } else if (text[i] === "﴿") {
      flush();
      inVerse = true;
      i += 1;
    } else if (text[i] === "﴾") {
      flush();
      inVerse = false;
      i += 1;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  flush();

  const parts: AzkarTextPart[] = [];
  for (const { origin, text: chunk } of raw) {
    // A square-bracket group is an alternative wording in its own right, wherever it sits —
    // even right after an instruction, or next to a second one.
    const pieces = origin === "quran" ? [chunk] : chunk.split(/(\[[^\]]*\])/);
    pieces.forEach((piece, index) => {
      const isVariant = origin !== "quran" && index % 2 === 1;
      let cleaned = trimSeparators(piece.replace(/\s+/g, " "));
      if (isVariant) cleaned = trimSeparators(cleaned.replace(/^\[\s*/, "").replace(/\s*\]\s*$/, ""));
      if (origin === "quran") cleaned = cleaned.replace(/\s*\*\s*/g, ` ${AYAH_SEPARATOR} `);
      if (!LETTER.test(cleaned)) return; // only punctuation left between two markers

      parts.push({ kind: isVariant ? "variant" : classify(cleaned, origin), text: cleaned });
    });
  }
  return parts;
}

/**
 * The English translation mirrors the Arabic's printed-book structure:
 * each part of the dua is a parenthesised group, instructions are short
 * groups like "(three times)", and variants sit in square brackets — e.g.
 * `(…morning wording…)[In the evening:](…evening wording…)`. This splits it at
 * its top-level groups into paragraphs, dropping the parentheses that merely
 * wrap a part of the dua and keeping those that carry an instruction.
 * A translation with no groups (or with unbalanced ones — the source has a
 * few) comes back as one paragraph, whitespace-tidied but otherwise as given.
 */
export function splitAzkarTranslation(translation: string): string[] {
  const text = translation.replace(/\s+/g, " ").trim();
  if (text === "") return [];

  const paragraphs: string[] = [];
  let depth = 0;
  let start = 0; // start of the current top-level run
  let inGroup = false;

  const pushOutside = (end: number) => {
    const run = text.slice(start, end).trim();
    if (run !== "") paragraphs.push(run);
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      if (depth === 0) {
        pushOutside(i);
        start = i;
        inGroup = true;
      }
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth < 0) return [text]; // a stray closer: don't guess
      if (depth === 0 && inGroup) {
        const inner = text.slice(start + 1, i).trim();
        // A short group about repetition — "(three times)" — is an instruction and keeps its parentheses;
        // every other group is a part of the dua, which the parentheses merely wrap.
        if (inner !== "") paragraphs.push(inner.length < 40 && REPEAT_WORDS.test(inner) && !/[.!?;]/.test(inner) ? `(${inner})` : inner);
        start = i + 1;
        inGroup = false;
      }
    }
  }
  if (depth !== 0) return [text]; // unbalanced: leave exactly as given
  pushOutside(text.length);
  return paragraphs.length > 0 ? paragraphs : [text];
}
