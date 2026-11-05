import type { InstallPlatform } from "./index.js";

/**
 * When to offer "Install Manarah" on its own — a card that appears for someone who has not
 * installed, instead of hoping they find the button in the header or the Settings page.
 * It has to be an invitation, not a nag: it waits a moment, goes away for good once the app
 * is installed, and each "Not now" buys a longer silence (3 days, then 2 weeks, then never —
 * the header button and Settings are still there). Pure: the clock is passed in.
 */

export const INSTALL_NUDGE_STORAGE_KEY = "manarah.install-nudge";

/** How long after opening the app before the card slides in, so the first thing seen is the app. */
export const INSTALL_NUDGE_DELAY_MS = 6000;

const DAY = 24 * 60 * 60 * 1000;
/** Silence after the 1st, 2nd "Not now". A 3rd ends the offers. */
const SILENCE_DAYS = [3, 14];

export interface InstallNudgeState {
  /** How many times the person has said "Not now" (or started an install and backed out). */
  dismissals: number;
  /** When they last did, epoch ms. */
  lastDismissedAt?: number;
}

export function normalizeInstallNudge(raw: unknown): InstallNudgeState {
  const r = (raw ?? {}) as { dismissals?: unknown; lastDismissedAt?: unknown };
  const dismissals = typeof r.dismissals === "number" && Number.isFinite(r.dismissals) && r.dismissals > 0 ? Math.floor(r.dismissals) : 0;
  const last = typeof r.lastDismissedAt === "number" && Number.isFinite(r.lastDismissedAt) ? r.lastDismissedAt : undefined;
  return dismissals === 0 || last === undefined ? { dismissals: dismissals > 0 ? dismissals : 0 } : { dismissals, lastDismissedAt: last };
}

export function dismissInstallNudge(state: InstallNudgeState, now: number): InstallNudgeState {
  return { dismissals: state.dismissals + 1, lastDismissedAt: now };
}

export interface InstallNudgeInput {
  state: InstallNudgeState;
  now: number;
  platform: InstallPlatform;
  /** The browser has offered to install and a button can do it. */
  canPrompt: boolean;
  /** Already running as an installed app. */
  installed: boolean;
}

export function shouldShowInstallNudge({ state, now, platform, canPrompt, installed }: InstallNudgeInput): boolean {
  if (installed) return false;
  // A computer browser that cannot install (Firefox, or Chrome before it offers) has nothing to offer.
  if (platform === "desktop" && !canPrompt) return false;
  if (state.dismissals >= SILENCE_DAYS.length + 1) return false;
  if (state.dismissals === 0 || state.lastDismissedAt === undefined) return true;
  const silence = SILENCE_DAYS[state.dismissals - 1] * DAY;
  // A clock set back must not silence it for ever.
  return now < state.lastDismissedAt || now - state.lastDismissedAt >= silence;
}
