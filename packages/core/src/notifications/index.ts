import {
  applyAzkarSchedules,
  getEffectiveCategoriesForTrigger,
  type AzkarCategory,
  type AzkarTrigger,
} from "../azkar-engine/index.js";
import type { DailyPrayerTimes } from "../prayer-times/index.js";
import { computePrayerTimes } from "../prayer-times/index.js";
import { withDefaultSettings, type Language, type UserSettings } from "../settings/index.js";

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

const PRAYER_ORDER: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Storage key for persisted NotificationState — shared across every platform's store so the fired-today bookkeeping is consistent wherever `runNotificationCheck` is wired up. */
export const NOTIFICATION_STATE_KEY = "manarah:notification-state";

export interface NotificationState {
  /** Local date this state applies to, as YYYY-MM-DD; state resets when the date changes. */
  date: string;
  firedPrayers: string[];
  firedPostSalahAzkar: string[];
  /** Azkar reminder slot ids (see AZKAR_REMINDER_SLOTS) already handled today. */
  firedAzkarSlots: string[];
  /** Category ids of custom-time azkar already fired today. */
  firedCustomAzkar: string[];
}

/** State persisted by builds before azkar reminder slots existed — only morning azkar was tracked. */
type LegacyNotificationState = Omit<NotificationState, "firedAzkarSlots"> & {
  firedAzkarSlots?: string[];
  firedMorningAzkar?: boolean;
};

export type AzkarReminderSlotId = "fajr" | "asr" | "night";

/**
 * Structured, language-neutral description of what's due — each platform
 * renders it into text in the user's language (see @manarah/ui's
 * formatNotification), so core stays free of UI strings.
 */
export type DueNotification =
  | { type: "prayer"; prayer: PrayerName }
  | { type: "post-salah-azkar"; prayer: PrayerName; categories: AzkarCategory[] }
  | { type: "azkar-reminder"; slot: AzkarReminderSlotId; categories: AzkarCategory[] }
  | { type: "custom-azkar"; category: AzkarCategory; time: string };

export interface CustomTimeAzkar {
  category: AzkarCategory;
  /** 24h "HH:mm" in the user's local time. */
  time: string;
}

/** Azkar categories for the time-of-day triggers, as currently assigned (after mute/remap). */
export interface ScheduledAzkar {
  byTrigger: Partial<Record<AzkarTrigger, AzkarCategory[]>>;
  customTime: CustomTimeAzkar[];
}

/** How long after a scheduled time a notification is still worth showing; later than this it's marked handled silently. */
export const NOTIFICATION_STALE_AFTER_MS = 30 * 60_000;

/** Before-sleep azkar remind this long after Isha — the app doesn't know anyone's bedtime; a category can be remapped to an exact custom time instead. */
const BEFORE_SLEEP_AFTER_ISHA_MS = 60 * 60_000;

interface AzkarReminderSlot {
  id: AzkarReminderSlotId;
  /** Triggers whose categories are reminded in this slot — several share one notification rather than stacking. */
  triggers: AzkarTrigger[];
  at: (times: DailyPrayerTimes) => Date;
}

/**
 * When each time-of-day azkar trigger is reminded, anchored to that day's
 * prayer times: waking + morning azkar at Fajr (one notification, not
 * two), evening azkar at Asr (the start of the evening-azkar window), and
 * before-sleep azkar an hour after Isha — clamped to 23:59 so it can't slip
 * past midnight into a day whose state has already reset. Hisn al-Muslim's
 * combined morning-and-evening chapter ("morning-evening") is reminded in
 * both the Fajr and Asr slots.
 */
export const AZKAR_REMINDER_SLOTS: AzkarReminderSlot[] = [
  { id: "fajr", triggers: ["waking", "morning", "morning-evening"], at: (times) => times.fajr },
  { id: "asr", triggers: ["evening", "morning-evening"], at: (times) => times.asr },
  {
    id: "night",
    triggers: ["before-sleep"],
    at: (times) => {
      const endOfDay = new Date(times.isha);
      endOfDay.setHours(23, 59, 0, 0);
      return new Date(Math.min(times.isha.getTime() + BEFORE_SLEEP_AFTER_ISHA_MS, endOfDay.getTime()));
    },
  },
];

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function initialNotificationState(dateKey: string): NotificationState {
  return {
    date: dateKey,
    firedPrayers: [],
    firedPostSalahAzkar: [],
    firedAzkarSlots: [],
    firedCustomAzkar: [],
  };
}

/** Today's state as a fresh copy (never mutating the input), upgrading a legacy shape; any other day's state is discarded. */
function stateForToday(previous: NotificationState | LegacyNotificationState, todayKey: string): NotificationState {
  if (previous.date !== todayKey) return initialNotificationState(todayKey);
  const legacy = previous as LegacyNotificationState;
  return {
    date: previous.date,
    firedPrayers: [...previous.firedPrayers],
    firedPostSalahAzkar: [...previous.firedPostSalahAzkar],
    firedAzkarSlots: legacy.firedAzkarSlots ? [...legacy.firedAzkarSlots] : legacy.firedMorningAzkar ? ["fajr"] : [],
    firedCustomAzkar: [...previous.firedCustomAzkar],
  };
}

/** Resolves a "HH:mm" time to a real Date on the same local day as `reference`. */
function resolveTimeToday(time: string, reference: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const resolved = new Date(reference);
  resolved.setHours(hours, minutes, 0, 0);
  return resolved;
}

/**
 * Pure decision function: given the current time, today's computed prayer
 * times, the azkar categories currently assigned to each trigger (including
 * user-remapped "custom-time" ones), and yesterday's-or-today's fire state,
 * returns what's newly due right now plus the updated state to persist.
 *
 * Each item fires at most once a day. Something whose time passed more than
 * NOTIFICATION_STALE_AFTER_MS ago (e.g. the web app was opened in the
 * evening) is marked handled without notifying, rather than delivering a
 * burst of the whole day's reminders at once.
 *
 * Contains no chrome.* calls so it can be unit-tested without a browser, and
 * reused by any platform's notification scheduler (extension, desktop, mobile).
 */
export function computeDueNotifications(
  now: Date,
  times: DailyPrayerTimes,
  azkar: ScheduledAzkar,
  previousState: NotificationState | LegacyNotificationState
): { due: DueNotification[]; nextState: NotificationState } {
  const state = stateForToday(previousState, localDateKey(now));
  const due: DueNotification[] = [];
  const isFresh = (at: Date) => now.getTime() - at.getTime() <= NOTIFICATION_STALE_AFTER_MS;
  const postSalahAzkar = azkar.byTrigger["post-salah"] ?? [];

  for (const prayer of PRAYER_ORDER) {
    const prayerTime = times[prayer];
    if (now < prayerTime) continue;
    const fresh = isFresh(prayerTime);

    if (!state.firedPrayers.includes(prayer)) {
      if (fresh) due.push({ type: "prayer", prayer });
      state.firedPrayers.push(prayer);
    }

    if (postSalahAzkar.length > 0 && !state.firedPostSalahAzkar.includes(prayer)) {
      if (fresh) due.push({ type: "post-salah-azkar", prayer, categories: postSalahAzkar });
      state.firedPostSalahAzkar.push(prayer);
    }
  }

  for (const slot of AZKAR_REMINDER_SLOTS) {
    const at = slot.at(times);
    if (now < at || state.firedAzkarSlots.includes(slot.id)) continue;
    const categories = slot.triggers.flatMap((trigger) => azkar.byTrigger[trigger] ?? []);
    if (categories.length === 0) continue;

    if (isFresh(at)) due.push({ type: "azkar-reminder", slot: slot.id, categories });
    state.firedAzkarSlots.push(slot.id);
  }

  for (const { category, time } of azkar.customTime) {
    if (state.firedCustomAzkar.includes(category.id)) continue;
    const at = resolveTimeToday(time, now);
    if (now < at) continue;

    if (isFresh(at)) due.push({ type: "custom-azkar", category, time });
    state.firedCustomAzkar.push(category.id);
  }

  return { due, nextState: state };
}

export interface NotificationCheckDeps {
  getSettings: () => Promise<UserSettings | undefined>;
  getNotificationState: () => Promise<NotificationState | undefined>;
  setNotificationState: (state: NotificationState) => Promise<void>;
  /** Receives the user's UI language so the platform can render the text (see @manarah/ui's formatNotification). */
  notify: (notification: DueNotification, language: Language) => void;
  /** All default azkar categories; per-category overrides come from settings.azkarSchedules. */
  azkarCategories: AzkarCategory[];
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
}

/**
 * Orchestrates one notification check: loads settings + prior state through
 * the injected deps, applies the user's azkar schedule overrides (mute/remap,
 * including remapping to a custom daily time), runs the pure
 * computeDueNotifications, fires `notify` for anything due, and persists the
 * updated state. Every dependency is injected (no direct chrome.* or
 * `new Date()` calls), so this — the part that actually decides what happens
 * on each alarm tick — is unit-testable with fakes, without a real browser or
 * waiting for real prayer times to pass. The extension's background script
 * should be a thin wrapper around this that supplies real
 * chrome.storage/chrome.notifications-backed deps.
 */
/** Every trigger that has a daily time — "situational" is on-demand only, and "custom-time" is handled per category. */
const SCHEDULED_TRIGGERS: AzkarTrigger[] = [
  "post-salah",
  ...new Set(AZKAR_REMINDER_SLOTS.flatMap((slot) => slot.triggers)),
];

export async function runNotificationCheck(deps: NotificationCheckDeps): Promise<DueNotification[]> {
  const settings = withDefaultSettings(await deps.getSettings());
  if (!settings.coordinates) return [];

  const now = deps.now ?? new Date();
  const times = computePrayerTimes(settings.coordinates, now, settings.prayerTimesSettings);
  const previousState = (await deps.getNotificationState()) ?? initialNotificationState(localDateKey(now));

  const assignments = applyAzkarSchedules(deps.azkarCategories, settings.azkarSchedules);
  const byTrigger: ScheduledAzkar["byTrigger"] = {};
  for (const trigger of SCHEDULED_TRIGGERS) {
    byTrigger[trigger] = getEffectiveCategoriesForTrigger(assignments, trigger);
  }
  const customTime: CustomTimeAzkar[] = assignments
    .filter((a): a is typeof a & { customTime: string } => a.trigger === "custom-time" && !!a.customTime)
    .map((a) => ({ category: a.category, time: a.customTime }));

  const { due, nextState } = computeDueNotifications(now, times, { byTrigger, customTime }, previousState);

  for (const notification of due) {
    deps.notify(notification, settings.language);
  }
  await deps.setNotificationState(nextState);

  return due;
}
