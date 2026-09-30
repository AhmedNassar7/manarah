/**
 * Word-by-word meaning and transliteration, fetched per verse at runtime from
 * the Quran.com API (`/verses/by_key/{s:a}?words=true`). Verified live
 * 2026-09-30: CORS-enabled, no API key.
 *
 * Deliberately meaning-only — roots/morphology were planned from the
 * Quranic Arabic Corpus, but its terms (GPL v3 plus "verbatim copies only,
 * changing it is not allowed") are unresolved for this project, and the
 * Quran.com API doesn't expose those fields. See PROGRESS.md, roadmap step 6.
 */

export interface QuranWord {
  /** 1-based position within the verse. */
  position: number;
  /** The word in Uthmani script, as Quran.com segments it. */
  text: string;
  transliteration: string;
  translation: string;
}

export function wordByWordUrl(surah: number, ayah: number): string {
  return `https://api.quran.com/api/v4/verses/by_key/${surah}:${ayah}?words=true&word_fields=text_uthmani`;
}

/** Shape of the Quran.com `/verses/by_key` response — only the fields used here. */
interface QuranComVerseResponse {
  verse?: {
    words?: Array<{
      position?: number;
      char_type_name?: string;
      text_uthmani?: string;
      translation?: { text?: string | null };
      transliteration?: { text?: string | null };
    }>;
  };
}

/** Keeps only actual words — the API also returns the verse-end number marker ("end") in the same list. */
export function parseWordByWordResponse(json: unknown): QuranWord[] {
  const words = (json as QuranComVerseResponse | null)?.verse?.words ?? [];
  return words
    .filter((w) => w.char_type_name === "word" && w.text_uthmani)
    .map((w, i) => ({
      position: w.position ?? i + 1,
      text: w.text_uthmani!.trim(),
      transliteration: (w.transliteration?.text ?? "").trim(),
      translation: (w.translation?.text ?? "").trim(),
    }));
}
