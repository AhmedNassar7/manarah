import type { AzkarCategory, AzkarSection } from "@manarah/core";
import duasData from "./quranic-duas.json";

/**
 * Duas that are verses of the Qur'an ("Rabbana…", "Rabbi…"), grouped by what
 * they ask for. NOT hand-typed: each entry's text and translation were taken
 * programmatically from the bundled Uthmani text and the Saheeh International
 * translation for the verse(s) in its `reference` (surah:ayah, or a range), so
 * they can't contain a transcription error — and a test re-checks every one
 * against the Quran data. A verse is given whole, including any words that
 * introduce the supplication ("They said, …"); the supplication is the quoted
 * part. Kept separate from the Hisn al-Muslim corpus (prophetic duas, 132
 * chapters) so that corpus stays a faithful copy of its source.
 */
export const QURANIC_DUA_CATEGORIES: AzkarCategory[] = duasData as AzkarCategory[];

export const QURANIC_DUA_SECTION: AzkarSection = {
  id: "quran-duas",
  icon: "quran",
  categoryIds: QURANIC_DUA_CATEGORIES.map((c) => c.id),
};
