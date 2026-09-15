import type { AzkarSchedule } from "../azkar-engine/index.js";
import type { Coordinates, PrayerTimesSettings } from "../prayer-times/index.js";

export interface LastRead {
  surah: number;
  ayah: number;
}

export interface UserSettings {
  coordinates?: Coordinates;
  prayerTimesSettings: PrayerTimesSettings;
  /** Overrides for individual azkar categories; categories with no entry use their default trigger. */
  azkarSchedules: AzkarSchedule[];
  /** The last surah/ayah the user opened in the Quran reader, if any. */
  lastRead?: LastRead;
}

export const DEFAULT_SETTINGS: UserSettings = {
  prayerTimesSettings: { method: "UmmAlQura", asrSchool: "Standard" },
  azkarSchedules: [],
};

export const SETTINGS_STORAGE_KEY = "manarah:settings";
