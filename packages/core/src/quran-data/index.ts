export interface Verse {
  surah: number;
  ayah: number;
  uthmaniText: string;
}

export type RevelationType = "Meccan" | "Medinan";

export interface Surah {
  number: number;
  nameArabic: string;
  nameTransliterated: string;
  revelationType: RevelationType;
  verseCount: number;
}

export interface Reciter {
  id: string;
  name: string;
  /** Base URL template for per-surah MP3s, e.g. from mp3quran.net. */
  audioBaseUrl: string;
}

/**
 * Picks a verse uniformly at random across the given list (e.g. all 6236
 * verses) — deliberately verse-uniform rather than surah-then-ayah, which
 * would overrepresent short surahs. `random` is injectable so this is
 * deterministically testable.
 */
export function pickRandomVerse(verses: Verse[], random: () => number = Math.random): Verse {
  if (verses.length === 0) {
    throw new Error("pickRandomVerse: verses array is empty");
  }
  const index = Math.floor(random() * verses.length);
  return verses[index];
}
