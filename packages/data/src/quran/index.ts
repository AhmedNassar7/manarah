import type { Surah, Verse } from "@manarah/core";
import surahsData from "./surahs.json";

/**
 * Uthmani Quran text (114 surahs, 6236 verses), fetched from the AlQuran
 * Cloud API's "quran-uthmani" edition (api.alquran.cloud) — a mirror of the
 * standard Uthmani mushaf text also used by Tanzil and Quran.com. Verified
 * by verse/surah count (114 surahs, 6236 verses) at fetch time, 2026-09-15.
 * Not hand-typed, to avoid the risk of transcription errors in scripture.
 *
 * Surah metadata (this file) is small and stays eagerly bundled; the full
 * verse text (~1.6MB) is dynamically imported on first use via
 * getVersesForSurah/getAllVerses, so it doesn't sit in every consumer's
 * initial bundle — only pages that actually render Quran text pay for it.
 */
export const SURAHS: Surah[] = surahsData as Surah[];

let versesPromise: Promise<Verse[]> | null = null;

function loadVerses(): Promise<Verse[]> {
  versesPromise ??= import("./verses.json").then((mod) => (mod.default ?? mod) as unknown as Verse[]);
  return versesPromise;
}

export function getSurah(number: number): Surah | undefined {
  return SURAHS.find((s) => s.number === number);
}

export async function getVersesForSurah(surahNumber: number): Promise<Verse[]> {
  const verses = await loadVerses();
  return verses.filter((v) => v.surah === surahNumber);
}

/** All 6236 verses — for data-integrity checks/tooling. App code should prefer getVersesForSurah, which loads on demand. */
export function getAllVerses(): Promise<Verse[]> {
  return loadVerses();
}
