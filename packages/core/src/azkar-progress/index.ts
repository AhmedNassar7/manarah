import { dayKey } from "../progress/index.js";

/**
 * Today's progress through the azkar lists. The tallies belong to a day: the
 * morning adhkar you finished yesterday are not finished today, so a new day
 * starts every list from zero. Kept on the device; nothing is compared with
 * anyone. Pure — the current time is passed in.
 */

export const AZKAR_PROGRESS_STORAGE_KEY = "manarah:azkar-progress";

export interface AzkarProgressState {
  /** The local day these tallies belong to, "YYYY-MM-DD". */
  date: string;
  /** Category id -> item id -> how many times it has been said today. */
  categories: Record<string, Record<string, number>>;
}

export function emptyAzkarProgress(now: Date): AzkarProgressState {
  return { date: dayKey(now), categories: {} };
}

/** Validates saved tallies, and starts afresh when they are from an earlier day. */
export function normalizeAzkarProgress(value: unknown, now: Date): AzkarProgressState {
  const fresh = emptyAzkarProgress(now);
  if (typeof value !== "object" || value === null) return fresh;
  const raw = value as Record<string, unknown>;
  if (raw.date !== fresh.date || typeof raw.categories !== "object" || raw.categories === null) return fresh;
  const categories: Record<string, Record<string, number>> = {};
  for (const [categoryId, items] of Object.entries(raw.categories as Record<string, unknown>)) {
    if (typeof items !== "object" || items === null) continue;
    const counts: Record<string, number> = {};
    for (const [itemId, n] of Object.entries(items as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isInteger(n) && n > 0 && n < 100_000) counts[itemId] = n;
    }
    if (Object.keys(counts).length > 0) categories[categoryId] = counts;
  }
  return { date: fresh.date, categories };
}

/** The tallies for one list today (empty when none, or when the saved ones are from an earlier day). */
export function countsFor(state: AzkarProgressState, categoryId: string, now: Date): Record<string, number> {
  return state.date === dayKey(now) ? (state.categories[categoryId] ?? {}) : {};
}

/** Stores a list's tallies, rolling over to today first if the saved state is older. */
export function setCounts(state: AzkarProgressState, categoryId: string, counts: Record<string, number>, now: Date): AzkarProgressState {
  const base = state.date === dayKey(now) ? state : emptyAzkarProgress(now);
  const categories = { ...base.categories };
  if (Object.keys(counts).length === 0) delete categories[categoryId];
  else categories[categoryId] = counts;
  return { date: base.date, categories };
}

export interface ListProgress {
  /** How many dhikr are in the list. */
  total: number;
  /** How many have reached their repeat count. */
  completed: number;
  /** Index of the dhikr to say now — the first one not yet finished — or -1 when all are done. */
  currentIndex: number;
  /** 0-1 over the whole list. Every dhikr weighs the same, and one you are part-way through counts for the part done — so "100 times" moves the bar smoothly without making it crawl. */
  fraction: number;
  allDone: boolean;
}

/** Where a list stands. */
export function listProgress(items: ReadonlyArray<{ id: string; repeatCount: number }>, counts: Record<string, number>): ListProgress {
  let completed = 0;
  let currentIndex = -1;
  let share = 0;
  items.forEach((item, index) => {
    const done = Math.min(counts[item.id] ?? 0, item.repeatCount);
    share += item.repeatCount > 0 ? done / item.repeatCount : 1;
    if (done >= item.repeatCount) completed++;
    else if (currentIndex === -1) currentIndex = index;
  });
  return { total: items.length, completed, currentIndex, fraction: items.length === 0 ? 0 : share / items.length, allDone: items.length > 0 && completed === items.length };
}
