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
