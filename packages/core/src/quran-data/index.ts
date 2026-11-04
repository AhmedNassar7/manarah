export interface Verse {
  surah: number;
  ayah: number;
  uthmaniText: string;
}

export interface Translation {
  surah: number;
  ayah: number;
  text: string;
}

export interface TranslationEdition {
  id: string;
  name: string;
  /** BCP-47-ish language tag for the translation text itself, e.g. "en". */
  language: string;
}

export type RevelationType = "Meccan" | "Medinan";

export interface Surah {
  number: number;
  nameArabic: string;
  nameTransliterated: string;
  revelationType: RevelationType;
  verseCount: number;
}

/**
 * The way a sheikh reads. Murattal is the standard measured recitation every
 * reciter has; the others exist only for some:
 *  - mujawwad: slower and melodic, with full tajweed ornament — the concert/radio style.
 *  - muallim: the "teacher" recording — slow, for learning, repeated in short phrases.
 */
export type ReciterStyle = "murattal" | "mujawwad" | "muallim";

export interface Reciter {
  id: string;
  /** EveryAyah.com's folder for the standard (murattal) reading, e.g. "Alafasy_128kbps" — combine with ayahAudioUrl. */
  everyAyahSubfolder: string;
  /** Folders for this sheikh's other readings, where EveryAyah has them. */
  styles?: Partial<Record<Exclude<ReciterStyle, "murattal">, string>>;
}

/** The styles this reciter can be played in; murattal first. */
export function reciterStyles(reciter: Reciter): ReciterStyle[] {
  return ["murattal", ...(Object.keys(reciter.styles ?? {}) as ReciterStyle[])];
}

/** The style to actually use: the requested one if this reciter has it, otherwise murattal (e.g. after switching to a sheikh who has no mujawwad). */
export function resolveReciterStyle(reciter: Reciter, requested: ReciterStyle | undefined): ReciterStyle {
  return requested && reciterStyles(reciter).includes(requested) ? requested : "murattal";
}

function everyAyahUrl(subfolder: string, surah: number, ayah: number): string {
  const surahPart = String(surah).padStart(3, "0");
  const ayahPart = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${subfolder}/${surahPart}${ayahPart}.mp3`;
}

/** Direct, CORS-enabled per-verse recitation URL from EveryAyah.com — verified against the reciter's own published folder listing. No proxy or server needed. */
export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number, style: ReciterStyle = "murattal"): string {
  const folder = style === "murattal" ? reciter.everyAyahSubfolder : (reciter.styles?.[style] ?? reciter.everyAyahSubfolder);
  return everyAyahUrl(folder, surah, ayah);
}

/** A recording of the verses' *translation* read aloud, per verse, from EveryAyah.com. */
export interface TranslationAudio {
  id: string;
  /** Language of the translation, e.g. "en". */
  language: string;
  /** EveryAyah folder (may include a path, e.g. "English/Sahih_Intnl_Ibrahim_Walk_192kbps"). */
  everyAyahSubfolder: string;
}

export function translationAudioUrl(translation: TranslationAudio, surah: number, ayah: number): string {
  return everyAyahUrl(translation.everyAyahSubfolder, surah, ayah);
}

/** A single verse's place in every standard navigation scheme of the printed mushaf — juz'/hizb-quarter, ruku', and the 604-page Madani layout. */
export interface VerseLocation {
  surah: number;
  ayah: number;
  /** 1-30. */
  juz: number;
  /** 1-604, per the standard 15-line Madani mushaf pagination. */
  page: number;
  /** 1-7, the seventh-part division used for Ramadan reading plans. */
  manzil: number;
  ruku: number;
  /** 1-240 — each juz' has 8 quarters (hizb quarters). */
  hizbQuarter: number;
  /** Whether a sajdah (prostration) is prescribed at this verse. */
  sajda: boolean;
}

/** A verse locator that identifies where a Surah/Ayah, Juz', or Page navigation choice should jump the reader to. */
export interface VerseRef {
  surah: number;
  ayah: number;
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
