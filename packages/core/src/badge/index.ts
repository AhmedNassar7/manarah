import { nextPrayer } from "../prayer-times/index.js";
import type { DailyPrayerTimes } from "../prayer-times/index.js";

export interface BadgeState {
  /** Chrome's badge text has a practical ~4-character limit; minutes only, no seconds. */
  text: string;
  /** Teal-tile normally; shifts to henna (the design system's time-critical color) inside the warning window. */
  color: string;
}

const TEAL_TILE = "#1e5c55";
const HENNA = "#7a3b2e";
const WARNING_WINDOW_MINUTES = 15;

/**
 * Pure: what the extension's toolbar badge should show right now. No
 * chrome.* calls, so — like computeDueNotifications — this is unit-testable
 * without a browser; the background worker is a thin wrapper that just
 * calls chrome.action.setBadgeText/setBadgeBackgroundColor with the result.
 */
export function computeBadgeState(now: Date, times: DailyPrayerTimes): BadgeState {
  const upcoming = nextPrayer(times, now);
  if (!upcoming) {
    return { text: "", color: TEAL_TILE };
  }

  const minutesRemaining = Math.max(0, Math.ceil((upcoming.at.getTime() - now.getTime()) / 60_000));
  const text = minutesRemaining >= 60 ? `${Math.floor(minutesRemaining / 60)}h` : `${minutesRemaining}m`;
  const color = minutesRemaining <= WARNING_WINDOW_MINUTES ? HENNA : TEAL_TILE;

  return { text, color };
}
