/**
 * Hadith library — the six canonical collections (Bukhari, Muslim, Abu Dawud,
 * Tirmidhi, Nasa'i, Ibn Majah), pure parsing/formatting only.
 *
 * Source: fawazahmed0/hadith-api (Unlicense), served by the jsDelivr CDN and
 * GitHub raw — free, CORS `*`, no key, no server of ours. Verified 2026-11-04.
 * Each collection is published as an Arabic and an English "edition", split
 * into books ("sections"); a whole edition is 5–9 MB, so the app fetches one
 * book at a time (≤ ~340 KB) and the two editions are paired by `hadithnumber`.
 * (sunnah.com's own API needs a per-developer key, which a static client-only
 * app can't keep secret — hence this source.)
 */

export type HadithCollectionId = "bukhari" | "muslim" | "abudawud" | "tirmidhi" | "nasai" | "ibnmajah";

export interface HadithCollection {
  id: HadithCollectionId;
  /** Edition ids in the source API, e.g. "ara-bukhari" / "eng-bukhari". */
  arabicEdition: string;
  englishEdition: string;
}

/** A book within a collection ("Revelation", "Purification (Kitab Al-Taharah)"). */
export interface HadithSection {
  /** The source's section number — 0 is used for introductions in some collections. */
  number: number;
  /** English title from the source (the dataset has no Arabic book titles). */
  title: string;
  /** How many hadiths the book holds, verified against the real files. */
  count: number;
}

/** One scholar's grading of a hadith, as published with the source — attributed, never merged into a verdict. */
export interface HadithGrade {
  scholar: string;
  grade: string;
}

/** One edition's text of one hadith. */
export interface HadithText {
  /** Position within the edition — what pairs the Arabic and English texts. */
  number: number;
  /** The standard printed numbering where the source gives one (e.g. "8.01" in Muslim) — a string because it can be fractional. */
  displayNumber: string;
  text: string;
  grades: HadithGrade[];
  book?: number;
  /** Number within its book. */
  inBook?: number;
}

/** A hadith with whichever of its Arabic and English texts are available. */
export interface HadithEntry {
  number: number;
  displayNumber: string;
  arabic?: string;
  english?: string;
  grades: HadithGrade[];
  book?: number;
  inBook?: number;
}

const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const GITHUB_RAW = "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions";

/**
 * URLs to try, in order, for one book of one edition. jsDelivr refuses some
 * of the minified files outright ("Package size exceeded the configured
 * limit" — HTTP 403 for e.g. eng-bukhari book 6) while serving the full file
 * fine, so the chain goes minified → full → GitHub raw.
 */
export function hadithSectionUrls(editionId: string, section: number): string[] {
  const path = `${editionId}/sections/${section}`;
  return [`${CDN}/${path}.min.json`, `${CDN}/${path}.json`, `${GITHUB_RAW}/${path}.min.json`];
}

/** The slice of `fetch` the loader needs — injected so this stays testable and platform-agnostic. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Tries each URL in order and returns the first successful JSON body. A
 * non-OK status or a network error moves on to the next URL; if every URL
 * fails, rejects with the last error so the UI can offer a retry.
 */
export async function fetchJsonWithFallback(urls: string[], fetchFn: FetchLike): Promise<unknown> {
  let lastError: unknown = new Error("No hadith URL to try");
  for (const url of urls) {
    try {
      const response = await fetchFn(url);
      if (response.ok) return await response.json();
      lastError = new Error(`Hadith request failed: HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Parses one book's response into texts. Throws on an unexpected shape so a
 * broken/changed API surfaces as a retryable error instead of an empty page;
 * individual malformed entries are skipped, not fatal.
 */
export function parseHadithSectionResponse(json: unknown): HadithText[] {
  const root = asRecord(json);
  if (!root || !Array.isArray(root.hadiths)) throw new Error("Unexpected hadith response shape");

  const texts: HadithText[] = [];
  for (const raw of root.hadiths) {
    const item = asRecord(raw);
    const number = asNumber(item?.hadithnumber);
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    if (!item || number === undefined || text === "") continue;

    const grades: HadithGrade[] = [];
    if (Array.isArray(item.grades)) {
      for (const g of item.grades) {
        const grade = asRecord(g);
        if (typeof grade?.name === "string" && typeof grade.grade === "string" && grade.grade.trim() !== "") {
          grades.push({ scholar: grade.name.trim(), grade: grade.grade.trim() });
        }
      }
    }

    const reference = asRecord(item.reference);
    const arabicNumber = item.arabicnumber;
    texts.push({
      number,
      displayNumber:
        typeof arabicNumber === "number" || typeof arabicNumber === "string" ? String(arabicNumber) : String(number),
      text,
      grades,
      book: asNumber(reference?.book),
      inBook: asNumber(reference?.hadith),
    });
  }
  return texts;
}

/**
 * Pairs an Arabic and an English edition's texts by hadith number, in
 * source order. A hadith missing from one edition keeps the other's text;
 * grades come from whichever edition carries them (usually English).
 */
export function mergeHadithEditions(arabic: HadithText[], english: HadithText[]): HadithEntry[] {
  const englishByNumber = new Map(english.map((h) => [h.number, h]));
  const seen = new Set<number>();
  const entries: HadithEntry[] = [];

  for (const ar of arabic) {
    const en = englishByNumber.get(ar.number);
    seen.add(ar.number);
    entries.push({
      number: ar.number,
      displayNumber: ar.displayNumber,
      arabic: ar.text,
      english: en?.text,
      grades: ar.grades.length > 0 ? ar.grades : (en?.grades ?? []),
      book: ar.book ?? en?.book,
      inBook: ar.inBook ?? en?.inBook,
    });
  }
  for (const en of english) {
    if (seen.has(en.number)) continue;
    entries.push({
      number: en.number,
      displayNumber: en.displayNumber,
      english: en.text,
      grades: en.grades,
      book: en.book,
      inBook: en.inBook,
    });
  }
  return entries.sort((a, b) => a.number - b.number);
}

/** Plain text for copy/share: the Arabic, the translation if shown, and a citation line. */
export function formatHadithForSharing(
  entry: HadithEntry,
  collectionName: string,
  options: { includeTranslation: boolean }
): string {
  const parts: string[] = [];
  if (entry.arabic) parts.push(entry.arabic);
  if (options.includeTranslation && entry.english) parts.push(entry.english);
  if (parts.length === 0 && entry.english) parts.push(entry.english);
  parts.push(`(${collectionName} ${entry.displayNumber})`);
  return parts.join("\n\n");
}
