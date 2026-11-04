import type { AzkarSchedule } from "../azkar-engine/index.js";
import type { Coordinates, PrayerTimesSettings } from "../prayer-times/index.js";

export interface LastRead {
  surah: number;
  ayah: number;
}

/** A human-readable label for the saved coordinates, and how they were set. */
export interface SavedLocation {
  /** "gps" = from the device's geolocation; "city" = picked by hand from city search. */
  source: "gps" | "city";
  /** City name — for a GPS fix, the nearest known city (absent if none is close). */
  name?: string;
  /** ISO 3166-1 alpha-2, e.g. "EG". */
  countryCode?: string;
}

/**
 * Whether a fresh GPS fix should replace the saved location. A city the
 * user picked by hand is a deliberate choice and must stick — only a
 * previous GPS fix (or no location at all) is refreshed automatically.
 */
export function shouldRefreshLocationFromGps(location: SavedLocation | undefined): boolean {
  return location?.source !== "city";
}

/** UI display language — independent of the Quran text itself, which is always Arabic. */
export type Language = "en" | "ar";

export interface UserSettings {
  coordinates?: Coordinates;
  /** Label/provenance for `coordinates`; absent in settings saved before it existed. */
  location?: SavedLocation;
  prayerTimesSettings: PrayerTimesSettings;
  /** Overrides for individual azkar categories; categories with no entry use their default trigger. */
  azkarSchedules: AzkarSchedule[];
  /** The last surah/ayah the user opened in the Quran reader, if any. */
  lastRead?: LastRead;
  language: Language;
  /** Reciter id (see @manarah/data's RECITERS) used for Quran audio playback. */
  reciterId: string;
  /** Tafsir edition id (see @manarah/data's TAFSIR_EDITIONS); unset means "first edition in the UI language". */
  tafsirEditionId?: string;
  /** Quran reader text size, as an index into READER_FONT_SCALES (use `readerFontScale`, which tolerates out-of-range stored values). */
  readerFontStep: number;
  /** Whether the reader shows the translation under each verse (default: no — the reader opens Arabic-only). */
  showTranslation: boolean;
  /** Days (−2…+2, see clampHijriAdjustment) added to the calculated Hijri date to match the user's local moon-sighting announcement. */
  hijriAdjustment: number;
}

/** Quran reader text-size multipliers, smallest to largest; applied to both the Arabic and the translation. */
export const READER_FONT_SCALES: readonly number[] = [0.85, 1, 1.25, 1.5, 1.85];
export const DEFAULT_READER_FONT_STEP = 1;

/** Clamps any stored/requested step (including NaN or fractions from a hand-edited import) to a valid index. */
export function clampReaderFontStep(step: number): number {
  if (!Number.isFinite(step)) return DEFAULT_READER_FONT_STEP;
  return Math.min(READER_FONT_SCALES.length - 1, Math.max(0, Math.round(step)));
}

export function readerFontScale(step: number): number {
  return READER_FONT_SCALES[clampReaderFontStep(step)];
}

export const DEFAULT_SETTINGS: UserSettings = {
  prayerTimesSettings: { method: "UmmAlQura", asrSchool: "Standard" },
  azkarSchedules: [],
  language: "en",
  reciterId: "alafasy",
  readerFontStep: DEFAULT_READER_FONT_STEP,
  /** Arabic-only by default; the translation is opt-in (reading settings or the reader's own toggle). */
  showTranslation: false,
  hijriAdjustment: 0,
};

export const SETTINGS_STORAGE_KEY = "manarah:settings";

/**
 * Backfills any fields missing from a persisted settings object with
 * current defaults. `UserSettings` has grown fields over time (most
 * recently `language`); a value saved by an older build won't have them,
 * and reading `undefined` where a field is assumed always-present (e.g.
 * `settings.language` used as a dictionary key) crashes rather than
 * degrading gracefully. Every settings read from storage should go
 * through this rather than a bare `?? DEFAULT_SETTINGS`, which only
 * covers a wholly-missing value, not a partially-stale one.
 */
export function withDefaultSettings(stored: Partial<UserSettings> | undefined | null): UserSettings {
  return { ...DEFAULT_SETTINGS, ...stored };
}
