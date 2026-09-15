import type { Surah, Translation, TranslationEdition, Verse, VerseLocation, VerseRef } from "@manarah/core";
import { pickRandomVerse } from "@manarah/core";
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

/** Picks a verse uniformly at random (e.g. for a new-tab "verse of the day"), with its surah metadata attached. */
export async function getRandomVerse(): Promise<{ verse: Verse; surah: Surah }> {
  const verses = await loadVerses();
  const verse = pickRandomVerse(verses);
  return { verse, surah: getSurah(verse.surah)! };
}

/**
 * Translation text, fetched from the AlQuran Cloud API (api.alquran.cloud)
 * and converted to this package's flat {surah, ayah, ...} shape — same
 * sourcing/verification approach as the Uthmani text above, and lazily
 * loaded the same way so untranslated readers don't pay for it.
 */
export const TRANSLATION_EDITIONS: TranslationEdition[] = [
  { id: "en.sahih", name: "Saheeh International", language: "en" },
];

const translationLoaders: Record<string, () => Promise<{ default: Translation[] } | Translation[]>> = {
  "en.sahih": () => import("./translations/en-sahih.json"),
};

const translationPromises: Partial<Record<string, Promise<Translation[]>>> = {};

function loadTranslation(editionId: string): Promise<Translation[]> {
  const loader = translationLoaders[editionId];
  if (!loader) throw new Error(`Unknown translation edition: ${editionId}`);

  translationPromises[editionId] ??= loader().then((mod) => ("default" in mod ? mod.default : mod));
  return translationPromises[editionId]!;
}

export async function getTranslationForSurah(surahNumber: number, editionId: string): Promise<Translation[]> {
  const translations = await loadTranslation(editionId);
  return translations.filter((t) => t.surah === surahNumber);
}

/**
 * Per-verse juz'/page/manzil/ruku'/sajdah placement, from the same AlQuran
 * Cloud API response the translation text was fetched from (every ayah
 * comes back with this metadata attached) — no separate fetch needed.
 * Verified: 30 distinct juz', 604 distinct pages, 15 sajdah verses, all
 * matching the standard 15-line Madani mushaf.
 */
export const JUZ_COUNT = 30;
export const PAGE_COUNT = 604;

let metadataPromise: Promise<VerseLocation[]> | null = null;

function loadMetadata(): Promise<VerseLocation[]> {
  metadataPromise ??= import("./metadata.json").then((mod) => (mod.default ?? mod) as unknown as VerseLocation[]);
  return metadataPromise;
}

export async function getVerseLocation(surah: number, ayah: number): Promise<VerseLocation | undefined> {
  const metadata = await loadMetadata();
  return metadata.find((m) => m.surah === surah && m.ayah === ayah);
}

/** The first verse belonging to the given juz' (1-30) — where a "jump to Juz' N" navigation choice should land. */
export async function getJuzStart(juz: number): Promise<VerseRef | undefined> {
  const metadata = await loadMetadata();
  const match = metadata.find((m) => m.juz === juz);
  return match ? { surah: match.surah, ayah: match.ayah } : undefined;
}

/** The first verse on the given mushaf page (1-604) — where a "jump to Page N" navigation choice should land. */
export async function getPageStart(page: number): Promise<VerseRef | undefined> {
  const metadata = await loadMetadata();
  const match = metadata.find((m) => m.page === page);
  return match ? { surah: match.surah, ayah: match.ayah } : undefined;
}
