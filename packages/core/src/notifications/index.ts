import {
  applyAzkarSchedules,
  getEffectiveCategoriesForTrigger,
  type AzkarCategory,
} from "../azkar-engine/index.js";
import type { DailyPrayerTimes } from "../prayer-times/index.js";
import { computePrayerTimes } from "../prayer-times/index.js";
import { withDefaultSettings, type UserSettings } from "../settings/index.js";

const PRAYER_ORDER: Array<keyof Pick<DailyPrayerTimes, "fajr" | "dhuhr" | "asr" | "maghrib" | "isha">> = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const PRAYER_LABELS: Record<(typeof PRAYER_ORDER)[number], string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export interface NotificationState {
  /** Local date this state applies to, as YYYY-MM-DD; state resets when the date changes. */
  date: string;
  firedPrayers: string[];
  firedPostSalahAzkar: string[];
  firedMorningAzkar: boolean;
  /** Category ids of custom-time azkar already fired today. */
  firedCustomAzkar: string[];
}

export interface DueNotification {
  type: "prayer" | "post-salah-azkar" | "morning-azkar" | "custom-azkar";
  title: string;
  body: string;
}

export interface CustomTimeAzkar {
  category: AzkarCategory;
  /** 24h "HH:mm" in the user's local time. */
  time: string;
}

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
    firedMorningAzkar: false,
    firedCustomAzkar: [],
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
 * times, the azkar categories currently assigned to the "morning" and
 * "post-salah" triggers, any user-remapped "custom-time" azkar, and
 * yesterday's-or-today's fire state, returns what's newly due right now plus
 * the updated state to persist. Contains no chrome.* calls so it can be
 * unit-tested without a browser, and reused by any platform's notification
 * scheduler (extension, desktop, mobile).
 */
export function computeDueNotifications(
  now: Date,
  times: DailyPrayerTimes,
  morningAzkar: AzkarCategory[],
  postSalahAzkar: AzkarCategory[],
  customTimeAzkar: CustomTimeAzkar[],
  previousState: NotificationState
): { due: DueNotification[]; nextState: NotificationState } {
  const todayKey = localDateKey(now);
  const state: NotificationState =
    previousState.date === todayKey
      ? {
          date: previousState.date,
          firedPrayers: [...previousState.firedPrayers],
          firedPostSalahAzkar: [...previousState.firedPostSalahAzkar],
          firedMorningAzkar: previousState.firedMorningAzkar,
          firedCustomAzkar: [...previousState.firedCustomAzkar],
        }
      : initialNotificationState(todayKey);

  const due: DueNotification[] = [];

  for (const prayer of PRAYER_ORDER) {
    const prayerTime = times[prayer];
    if (now < prayerTime) continue;

    const label = PRAYER_LABELS[prayer];

    if (!state.firedPrayers.includes(prayer)) {
      due.push({
        type: "prayer",
        title: `${label} prayer time`,
        body: `It's time for ${label}.`,
      });
      state.firedPrayers.push(prayer);
    }

    if (postSalahAzkar.length > 0 && !state.firedPostSalahAzkar.includes(prayer)) {
      due.push({
        type: "post-salah-azkar",
        title: "Post-prayer azkar",
        body: postSalahAzkar.map((c) => c.name).join(", "),
      });
      state.firedPostSalahAzkar.push(prayer);
    }
  }

  if (now >= times.fajr && morningAzkar.length > 0 && !state.firedMorningAzkar) {
    due.push({
      type: "morning-azkar",
      title: "Morning azkar",
      body: morningAzkar.map((c) => c.name).join(", "),
    });
    state.firedMorningAzkar = true;
  }

  for (const { category, time } of customTimeAzkar) {
    if (state.firedCustomAzkar.includes(category.id)) continue;
    if (now < resolveTimeToday(time, now)) continue;

    due.push({
      type: "custom-azkar",
      title: category.name,
      body: `Scheduled for ${time}.`,
    });
    state.firedCustomAzkar.push(category.id);
  }

  return { due, nextState: state };
}

export interface NotificationCheckDeps {
  getSettings: () => Promise<UserSettings | undefined>;
  getNotificationState: () => Promise<NotificationState | undefined>;
  setNotificationState: (state: NotificationState) => Promise<void>;
  notify: (notification: DueNotification) => void;
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
export async function runNotificationCheck(deps: NotificationCheckDeps): Promise<DueNotification[]> {
  const settings = withDefaultSettings(await deps.getSettings());
  if (!settings.coordinates) return [];

  const now = deps.now ?? new Date();
  const times = computePrayerTimes(settings.coordinates, now, settings.prayerTimesSettings);
  const previousState = (await deps.getNotificationState()) ?? initialNotificationState(localDateKey(now));

  const assignments = applyAzkarSchedules(deps.azkarCategories, settings.azkarSchedules);
  const morningAzkar = getEffectiveCategoriesForTrigger(assignments, "morning");
  const postSalahAzkar = getEffectiveCategoriesForTrigger(assignments, "post-salah");
  const customTimeAzkar: CustomTimeAzkar[] = assignments
    .filter((a): a is typeof a & { customTime: string } => a.trigger === "custom-time" && !!a.customTime)
    .map((a) => ({ category: a.category, time: a.customTime }));

  const { due, nextState } = computeDueNotifications(
    now,
    times,
    morningAzkar,
    postSalahAzkar,
    customTimeAzkar,
    previousState
  );

  for (const notification of due) {
    deps.notify(notification);
  }
  await deps.setNotificationState(nextState);

  return due;
}
