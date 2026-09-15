import type { AzkarSchedule } from "../azkar-engine/index.js";
import type { Coordinates, PrayerTimesSettings } from "../prayer-times/index.js";

export interface LastRead {
  surah: number;
  ayah: number;
}

/** UI display language — independent of the Quran text itself, which is always Arabic. */
export type Language = "en" | "ar";

export interface UserSettings {
  coordinates?: Coordinates;
  prayerTimesSettings: PrayerTimesSettings;
  /** Overrides for individual azkar categories; categories with no entry use their default trigger. */
  azkarSchedules: AzkarSchedule[];
  /** The last surah/ayah the user opened in the Quran reader, if any. */
  lastRead?: LastRead;
  language: Language;
  /** Reciter id (see @manarah/data's RECITERS) used for Quran audio playback. */
  reciterId: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  prayerTimesSettings: { method: "UmmAlQura", asrSchool: "Standard" },
  azkarSchedules: [],
  language: "en",
  reciterId: "alafasy",
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
