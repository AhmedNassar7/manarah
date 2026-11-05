/**
 * Personal progress: points, a daily streak, levels and badges for the good
 * habits the app can see — marking prayers as prayed, completing a dhikr, and
 * answering quiz questions correctly. It is deliberately *personal*: kept on
 * the device, never ranked against anyone, no leaderboard and no pressure —
 * its only job is a little encouragement to keep going.
 *
 * Pure and deterministic: every function takes the current time as an
 * argument, and `applyEvent` returns a new state plus what to celebrate.
 */

export const PROGRESS_STORAGE_KEY = "manarah:progress";

export type ProgressPrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const PROGRESS_PRAYERS: readonly ProgressPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Points for each kind of good deed. */
export const POINTS = {
  prayer: 10,
  allFiveBonus: 20,
  azkar: 2,
  quizCorrect: 5,
  tasbihRound: 3,
} as const;

/** Per-day limits on the repeatable ones, so points reward steady practice rather than tapping the same dhikr for hours. */
export const DAILY_CAPS = { azkar: 20, quizCorrect: 20, tasbihRound: 10 } as const;

export interface DayRecord {
  prayers: ProgressPrayer[];
  /** Dhikr items completed. */
  azkar: number;
  quizCorrect: number;
  quizAnswered: number;
  /** Tasbih rounds completed. */
  tasbih: number;
}

export interface ProgressState {
  points: number;
  /** Activity per local day, keyed "YYYY-MM-DD". */
  days: Record<string, DayRecord>;
  /** Badge ids earned, in the order earned — once earned, kept. */
  badges: string[];
}

export function emptyProgress(): ProgressState {
  return { points: 0, days: {}, badges: [] };
}

const emptyDay = (): DayRecord => ({ prayers: [], azkar: 0, quizCorrect: 0, quizAnswered: 0, tasbih: 0 });

/** The local calendar day of `date`, as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
  return copy;
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 1_000_000;

/** Validates saved progress (older builds, hand-edited imports): anything malformed is dropped, valid parts are kept. */
export function normalizeProgress(value: unknown): ProgressState {
  if (typeof value !== "object" || value === null) return emptyProgress();
  const raw = value as Record<string, unknown>;
  const days: Record<string, DayRecord> = {};
  if (typeof raw.days === "object" && raw.days !== null) {
    for (const [key, entry] of Object.entries(raw.days as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const prayers = Array.isArray(e.prayers)
        ? PROGRESS_PRAYERS.filter((p) => (e.prayers as unknown[]).includes(p))
        : [];
      days[key] = {
        prayers: [...prayers],
        azkar: isCount(e.azkar) ? e.azkar : 0,
        quizCorrect: isCount(e.quizCorrect) ? e.quizCorrect : 0,
        quizAnswered: isCount(e.quizAnswered) ? e.quizAnswered : 0,
        tasbih: isCount(e.tasbih) ? e.tasbih : 0,
      };
    }
  }
  const badges = Array.isArray(raw.badges) ? raw.badges.filter((b): b is string => typeof b === "string" && BADGE_IDS.includes(b)) : [];
  return { points: isCount(raw.points) ? raw.points : 0, days, badges: [...new Set(badges)] };
}

/** A day counts towards the streak if anything good was done on it. */
export function isActiveDay(day: DayRecord | undefined): boolean {
  return !!day && (day.prayers.length > 0 || day.azkar > 0 || day.quizCorrect > 0 || day.tasbih > 0);
}

/**
 * Consecutive active days up to today. A day with nothing yet doesn't break
 * the streak until it is over: if today is still empty the count runs back
 * from yesterday, so opening the app in the morning doesn't show "0".
 */
export function currentStreak(state: ProgressState, today: Date): number {
  let cursor = today;
  if (!isActiveDay(state.days[dayKey(cursor)])) cursor = addDays(cursor, -1);
  let streak = 0;
  while (isActiveDay(state.days[dayKey(cursor)])) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive active days ever. */
export function longestStreak(state: ProgressState): number {
  const keys = Object.keys(state.days)
    .filter((k) => isActiveDay(state.days[k]))
    .sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const key of keys) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);
    run = previous !== undefined && dayKey(addDays(date, -1)) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

export interface LevelInfo {
  level: number;
  /** Points earned within this level. */
  into: number;
  /** Points this level needs to complete. */
  span: number;
  /** 0-1 progress through the level. */
  fraction: number;
}

/** Points needed to reach `level` from the start: a gentle curve (50, 150, 300, …) so early levels come quickly and later ones take steady practice. */
export function pointsForLevel(level: number): number {
  return 25 * (level - 1) * level;
}

export function levelFor(points: number): LevelInfo {
  let level = 1;
  while (pointsForLevel(level + 1) <= points) level++;
  const start = pointsForLevel(level);
  const span = pointsForLevel(level + 1) - start;
  return { level, into: points - start, span, fraction: (points - start) / span };
}

/* ---------- Badges ---------- */

const total = (state: ProgressState, pick: (d: DayRecord) => number) => Object.values(state.days).reduce((sum, d) => sum + pick(d), 0);

export const BADGES: ReadonlyArray<{ id: string; earned: (state: ProgressState) => boolean }> = [
  { id: "first-prayer", earned: (s) => total(s, (d) => d.prayers.length) >= 1 },
  { id: "all-five", earned: (s) => Object.values(s.days).some((d) => d.prayers.length === 5) },
  { id: "streak-3", earned: (s) => longestStreak(s) >= 3 },
  { id: "streak-7", earned: (s) => longestStreak(s) >= 7 },
  { id: "streak-30", earned: (s) => longestStreak(s) >= 30 },
  { id: "azkar-10", earned: (s) => total(s, (d) => d.azkar) >= 10 },
  { id: "azkar-100", earned: (s) => total(s, (d) => d.azkar) >= 100 },
  { id: "quiz-10", earned: (s) => total(s, (d) => d.quizCorrect) >= 10 },
  { id: "tasbih-10", earned: (s) => total(s, (d) => d.tasbih) >= 10 },
  { id: "points-100", earned: (s) => s.points >= 100 },
  { id: "points-500", earned: (s) => s.points >= 500 },
];
const BADGE_IDS = BADGES.map((b) => b.id);

/* ---------- Events ---------- */

export type ProgressEvent =
  | { type: "prayer"; prayer: ProgressPrayer; done: boolean }
  | { type: "azkar-completed" }
  | { type: "quiz-answer"; correct: boolean }
  | { type: "tasbih-round" };

/** What to say after an event — the UI turns it into a message in the user's language. */
export type EncouragementKind = "prayer" | "all-five" | "azkar" | "tasbih" | "quiz-correct" | "quiz-wrong" | "streak" | "badge" | "none";

export interface EventResult {
  state: ProgressState;
  pointsDelta: number;
  newBadges: string[];
  encouragement: EncouragementKind;
  /** Picks which of several wordings to use, so the same message doesn't repeat every time. */
  variant: number;
  /** For "streak" messages, the new streak length. */
  streak?: number;
}

/** How many wordings each message has in the UI dictionaries. */
export const MESSAGE_VARIANTS = 3;

/** Streak lengths worth a message of their own. */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100];

function withDay(state: ProgressState, key: string, update: (d: DayRecord) => DayRecord): ProgressState {
  const current = state.days[key] ?? emptyDay();
  return { ...state, days: { ...state.days, [key]: update({ ...current, prayers: [...current.prayers] }) } };
}

/** Applies one good deed (or its undoing) and reports what changed and what to celebrate. Pure: the caller saves `state`. */
export function applyEvent(previous: ProgressState, event: ProgressEvent, now: Date): EventResult {
  const key = dayKey(now);
  const before = previous.days[key] ?? emptyDay();
  const streakBefore = currentStreak(previous, now);
  let state = previous;
  let pointsDelta = 0;
  let encouragement: EncouragementKind = "none";

  if (event.type === "prayer") {
    const has = before.prayers.includes(event.prayer);
    if (event.done && !has) {
      state = withDay(state, key, (d) => ({ ...d, prayers: PROGRESS_PRAYERS.filter((p) => p === event.prayer || d.prayers.includes(p)) }));
      pointsDelta = POINTS.prayer + (state.days[key].prayers.length === 5 ? POINTS.allFiveBonus : 0);
      encouragement = state.days[key].prayers.length === 5 ? "all-five" : "prayer";
    } else if (!event.done && has) {
      const wasAllFive = before.prayers.length === 5;
      state = withDay(state, key, (d) => ({ ...d, prayers: d.prayers.filter((p) => p !== event.prayer) }));
      pointsDelta = -(POINTS.prayer + (wasAllFive ? POINTS.allFiveBonus : 0));
    }
  } else if (event.type === "azkar-completed") {
    state = withDay(state, key, (d) => ({ ...d, azkar: d.azkar + 1 }));
    if (before.azkar < DAILY_CAPS.azkar) {
      pointsDelta = POINTS.azkar;
      encouragement = "azkar";
    }
  } else if (event.type === "tasbih-round") {
    state = withDay(state, key, (d) => ({ ...d, tasbih: d.tasbih + 1 }));
    if (before.tasbih < DAILY_CAPS.tasbihRound) {
      pointsDelta = POINTS.tasbihRound;
      encouragement = "tasbih";
    }
  } else {
    state = withDay(state, key, (d) => ({
      ...d,
      quizAnswered: d.quizAnswered + 1,
      quizCorrect: d.quizCorrect + (event.correct ? 1 : 0),
    }));
    if (event.correct && before.quizCorrect < DAILY_CAPS.quizCorrect) pointsDelta = POINTS.quizCorrect;
    encouragement = event.correct ? "quiz-correct" : "quiz-wrong";
  }

  state = { ...state, points: Math.max(0, state.points + pointsDelta) };

  const earned = BADGES.filter((b) => b.earned(state)).map((b) => b.id);
  const newBadges = earned.filter((id) => !state.badges.includes(id));
  if (newBadges.length > 0) state = { ...state, badges: [...state.badges, ...newBadges] };

  // A milestone outranks the ordinary message: a streak milestone first, then "all five prayers", then a new badge.
  const streak = currentStreak(state, now);
  const result: EventResult = { state, pointsDelta, newBadges, encouragement, variant: 0, streak };
  if (streak > streakBefore && STREAK_MILESTONES.includes(streak)) result.encouragement = "streak";
  if (newBadges.length > 0 && result.encouragement !== "streak" && result.encouragement !== "all-five") result.encouragement = "badge";
  result.variant = (total(state, (d) => d.prayers.length + d.azkar + d.quizAnswered + d.tasbih) + state.points) % MESSAGE_VARIANTS;
  return result;
}

/** The last `count` days ending today, oldest first, with whether each was active — for a small weekly strip. */
export function recentDays(state: ProgressState, today: Date, count = 7): Array<{ key: string; active: boolean; isToday: boolean }> {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1));
    const key = dayKey(date);
    return { key, active: isActiveDay(state.days[key]), isToday: i === count - 1 };
  });
}

/** Today's record, empty if nothing yet. */
export function todaysRecord(state: ProgressState, now: Date): DayRecord {
  return state.days[dayKey(now)] ?? emptyDay();
}
