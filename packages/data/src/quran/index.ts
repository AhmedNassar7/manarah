import type { Surah, Verse } from "@manarah/core";
import surahsData from "./surahs.json";
import versesData from "./verses.json";

/**
 * Uthmani Quran text (114 surahs, 6236 verses), fetched from the AlQuran
 * Cloud API's "quran-uthmani" edition (api.alquran.cloud) — a mirror of the
 * standard Uthmani mushaf text also used by Tanzil and Quran.com. Verified
 * by verse/surah count (114 surahs, 6236 verses) at fetch time, 2026-09-15.
 * Not hand-typed, to avoid the risk of transcription errors in scripture.
 */
export const SURAHS: Surah[] = surahsData as Surah[];
export const VERSES: Verse[] = versesData as Verse[];

export function getSurah(number: number): Surah | undefined {
  return SURAHS.find((s) => s.number === number);
}

export function getVersesForSurah(surahNumber: number): Verse[] {
  return VERSES.filter((v) => v.surah === surahNumber);
}
