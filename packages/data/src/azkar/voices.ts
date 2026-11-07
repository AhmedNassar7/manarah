import { EVENING_CATEGORY_ID, MORNING_CATEGORY_ID } from "./morning-evening.js";

/**
 * Recordings of a whole azkar list read by one reciter — "listen to the morning azkar" start to
 * finish, the way the mobile azkar apps offer it. The files are served by the app itself from
 * `apps/web/public/azkar-audio/` (so they work from the app's own address, need no third party, and
 * can be cached), and each one named here **must exist there** — a test checks.
 *
 * A reciter appears on a list only if he has a recording of it, so a voice with only an evening
 * recording shows under the evening azkar alone.
 *
 * To add a voice: put the .mp3 files in that folder, then add an entry below.
 */
export interface AzkarVoice {
  id: string;
  nameAr: string;
  nameEn: string;
  /** File names inside `azkar-audio/`. */
  files: Partial<Record<"morning" | "evening", string>>;
}

export const AZKAR_VOICES: AzkarVoice[] = [];

export interface AzkarVoiceOption {
  id: string;
  nameAr: string;
  nameEn: string;
  /** Path of the file under the app's `azkar-audio/` folder. */
  file: string;
}

/** The voices that have a recording of this list (the morning or the evening azkar), in the order they are listed. */
export function voicesForCategory(categoryId: string, voices: AzkarVoice[] = AZKAR_VOICES): AzkarVoiceOption[] {
  const which = categoryId === MORNING_CATEGORY_ID ? "morning" : categoryId === EVENING_CATEGORY_ID ? "evening" : undefined;
  if (!which) return [];
  return voices.flatMap((v) => {
    const file = v.files[which];
    return file ? [{ id: v.id, nameAr: v.nameAr, nameEn: v.nameEn, file }] : [];
  });
}
