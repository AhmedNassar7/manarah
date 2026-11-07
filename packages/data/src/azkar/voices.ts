import { EVENING_CATEGORY_ID, MORNING_CATEGORY_ID } from "./morning-evening.js";

/**
 * Recordings of a whole azkar list read by one reciter — "listen to the morning azkar" start to
 * finish, the way the mobile azkar apps offer it. The files are served by the app itself from
 * `apps/web/public/azkar-audio/` (so they work from the app's own address, need no third party, and
 * can be cached), and each one named here **must exist there** — a test checks. `.m4a` (AAC) or
 * `.mp3`; the recordings are kept exactly as obtained (re-wrapped, never re-encoded).
 *
 * A reciter appears on a list only if he has a recording of it, so a voice with only an evening
 * recording shows under the evening azkar alone.
 *
 * To add a voice: put the audio files in that folder, then add an entry below.
 *
 * Provenance of what is here (2026-11-07): both are the Saudi Quran Radio's broadcast recordings,
 * as shared on SoundCloud. Each appears under several unrelated uploaders with exactly the same
 * length (Al-Asmari's morning azkar: 6 copies, all 8:59; bin Judhyan's evening azkar: 5 copies, all
 * 7:35), which is the evidence they are the one radio recording. The voice could not be checked by
 * ear where this was built — the owner is the one to confirm it. The uploaders mark them "all rights
 * reserved" and the radio itself once offered the Asmari file for free download (its post of
 * 2014); the owner decided to host them, and a takedown request means deleting the file and its
 * entry. Not included: an Al-Asmari evening recording found from a single uploader, of a different
 * length and much quieter — a different recording, not yet listened to.
 */
export interface AzkarVoice {
  id: string;
  nameAr: string;
  nameEn: string;
  /** Who the recording is from, shown under the reciter's name. */
  creditAr: string;
  creditEn: string;
  /** File names inside `azkar-audio/`. */
  files: Partial<Record<"morning" | "evening", string>>;
}

export const AZKAR_VOICES: AzkarVoice[] = [
  {
    id: "asmari",
    nameAr: "عبدالله الأسمري",
    nameEn: "Abdullah Al-Asmari",
    creditAr: "من إذاعة القرآن الكريم",
    creditEn: "From the Holy Quran Radio",
    files: { morning: "asmari-morning.m4a" },
  },
  {
    id: "judhyan",
    nameAr: "فيصل بن جذيان",
    nameEn: "Faisal bin Judhyan",
    creditAr: "من إذاعة القرآن الكريم",
    creditEn: "From the Holy Quran Radio",
    files: { evening: "judhyan-evening.m4a" },
  },
];

export interface AzkarVoiceOption {
  id: string;
  nameAr: string;
  nameEn: string;
  creditAr: string;
  creditEn: string;
  /** Path of the file under the app's `azkar-audio/` folder. */
  file: string;
}

/** The voices that have a recording of this list (the morning or the evening azkar), in the order they are listed. */
export function voicesForCategory(categoryId: string, voices: AzkarVoice[] = AZKAR_VOICES): AzkarVoiceOption[] {
  const which = categoryId === MORNING_CATEGORY_ID ? "morning" : categoryId === EVENING_CATEGORY_ID ? "evening" : undefined;
  if (!which) return [];
  return voices.flatMap((v) => {
    const file = v.files[which];
    return file ? [{ id: v.id, nameAr: v.nameAr, nameEn: v.nameEn, creditAr: v.creditAr, creditEn: v.creditEn, file }] : [];
  });
}
