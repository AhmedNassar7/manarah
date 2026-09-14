import type { AzkarCategory } from "../azkar-engine/index.js";
import type { DailyPrayerTimes } from "../prayer-times/index.js";

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
}

export interface DueNotification {
  type: "prayer" | "post-salah-azkar" | "morning-azkar";
  title: string;
  body: string;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function initialNotificationState(dateKey: string): NotificationState {
  return { date: dateKey, firedPrayers: [], firedPostSalahAzkar: [], firedMorningAzkar: false };
}

/**
 * Pure decision function: given the current time, today's computed prayer
 * times, the azkar categories currently assigned to the "morning" and
 * "post-salah" triggers, and yesterday's-or-today's fire state, returns
 * what's newly due right now plus the updated state to persist. Contains no
 * chrome.* calls so it can be unit-tested without a browser, and reused by
 * any platform's notification scheduler (extension, desktop, mobile).
 */
export function computeDueNotifications(
  now: Date,
  times: DailyPrayerTimes,
  morningAzkar: AzkarCategory[],
  postSalahAzkar: AzkarCategory[],
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

  return { due, nextState: state };
}
