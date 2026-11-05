import { dayKey } from "../progress/index.js";

/**
 * A digital tasbih: tap to count a dhikr, in rounds of 33 (one turn of the ring), with
 * daily and lifetime totals. Pure and deterministic — the current
 * time is always passed in — and entirely personal: it lives on the device,
 * nothing is ranked or shared.
 */

export const TASBIH_STORAGE_KEY = "manarah:tasbih";

/** The phrases offered. Display names live in the UI dictionaries (`tasbih.dhikr.<id>`). */
export interface TasbihDhikr {
  id: string;
  arabic: string;
}

export const TASBIH_DHIKR: readonly TasbihDhikr[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللَّهِ" },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ" },
  { id: "allahu-akbar", arabic: "اللَّهُ أَكْبَرُ" },
  { id: "la-ilaha-illallah", arabic: "لَا إِلَهَ إِلَّا اللَّهُ" },
  { id: "astaghfirullah", arabic: "أَسْتَغْفِرُ اللَّهَ" },
  { id: "subhanallah-wa-bihamdihi", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ" },
  { id: "la-hawla", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ" },
  { id: "salawat", arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ" },
];

/**
 * What the beads are made of. The material decides the look (in the stylesheet) and the
 * sound of a bead — wood knocks, glass ticks, stone clacks, amber is soft — so a tasbih
 * looks and sounds like one thing. Display names live in the UI dictionaries
 * (`tasbih.theme.<id>`).
 */
export type TasbihTimbre = "wood" | "glass" | "stone" | "soft";

export interface TasbihTheme {
  id: string;
  timbre: TasbihTimbre;
}

export const TASBIH_THEMES: readonly TasbihTheme[] = [
  { id: "wood", timbre: "wood" },
  { id: "amber", timbre: "soft" },
  { id: "pearl", timbre: "glass" },
  { id: "emerald", timbre: "stone" },
  { id: "turquoise", timbre: "glass" },
  { id: "onyx", timbre: "stone" },
];

/** Beads in a round: one full turn of the ring. (There is no choice of round size — it was not worth the clutter.) */
export const TASBIH_ROUND = 33;

/** How many days of daily totals are kept. */
const KEEP_DAYS = 60;

export interface TasbihDay {
  taps: number;
  /** Rounds completed that day. */
  rounds: number;
}

export interface TasbihState {
  dhikrId: string;
  /** Position within the current round (always below TASBIH_ROUND). */
  count: number;
  days: Record<string, TasbihDay>;
  lifetime: number;
  /** What the last tap did, so "undo" takes back exactly that: a plain tap, or the tap that completed a round. */
  last: "tap" | "round" | null;
  /** Whether a tap gives a small vibration where the device can (always optional; off is respected). */
  vibrate: boolean;
  /** Whether a tap makes a sound. Off by default: a tasbih is often used where quiet matters. */
  sound: boolean;
  /** What the beads are made of (see TASBIH_THEMES). */
  theme: string;
}

export function emptyTasbih(): TasbihState {
  return { dhikrId: TASBIH_DHIKR[0].id, count: 0, days: {}, lifetime: 0, last: null, vibrate: true, sound: false, theme: TASBIH_THEMES[0].id };
}

const isCount = (v: unknown, max = 100_000_000): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max;

/** Validates saved state (older builds, hand-edited imports): anything malformed is dropped, valid parts kept. */
export function normalizeTasbih(value: unknown): TasbihState {
  const fresh = emptyTasbih();
  if (typeof value !== "object" || value === null) return fresh;
  const raw = value as Record<string, unknown>;
  const dhikrId = TASBIH_DHIKR.some((d) => d.id === raw.dhikrId) ? (raw.dhikrId as string) : fresh.dhikrId;
  let count = isCount(raw.count, 1_000_000) ? raw.count : 0;
  if (count >= TASBIH_ROUND) count = 0;
  const days: Record<string, TasbihDay> = {};
  if (typeof raw.days === "object" && raw.days !== null) {
    for (const [key, entry] of Object.entries(raw.days as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      days[key] = { taps: isCount(e.taps) ? e.taps : 0, rounds: isCount(e.rounds, 1_000_000) ? e.rounds : 0 };
    }
  }
  const last = raw.last === "tap" || raw.last === "round" ? raw.last : null;
  const vibrate = typeof raw.vibrate === "boolean" ? raw.vibrate : true;
  const sound = typeof raw.sound === "boolean" ? raw.sound : false;
  const theme = TASBIH_THEMES.some((t) => t.id === raw.theme) ? (raw.theme as string) : fresh.theme;
  return { dhikrId, count, days, lifetime: isCount(raw.lifetime) ? raw.lifetime : 0, last, vibrate, sound, theme };
}

function prune(days: Record<string, TasbihDay>): Record<string, TasbihDay> {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  const keep = new Set(keys.slice(keys.length - KEEP_DAYS));
  return Object.fromEntries(Object.entries(days).filter(([k]) => keep.has(k)));
}

export interface TapResult {
  state: TasbihState;
  /** True when this tap finished a round. */
  roundCompleted: boolean;
}

/** One bead. When the count reaches a full round (33) the round is complete and the count starts again from zero. */
export function tapTasbih(state: TasbihState, now: Date): TapResult {
  const key = dayKey(now);
  const today = state.days[key] ?? { taps: 0, rounds: 0 };
  const next = state.count + 1;
  const roundCompleted = next >= TASBIH_ROUND;
  return {
    roundCompleted,
    state: {
      ...state,
      count: roundCompleted ? 0 : next,
      lifetime: state.lifetime + 1,
      days: prune({ ...state.days, [key]: { taps: today.taps + 1, rounds: today.rounds + (roundCompleted ? 1 : 0) } }),
      last: roundCompleted ? "round" : "tap",
    },
  };
}

/** Takes back the last tap — including the one that completed a round (the count returns to the last bead of that round). */
export function undoTasbih(state: TasbihState, now: Date): TasbihState {
  if (state.last === null) return state;
  const key = dayKey(now);
  const today = state.days[key];
  if (!today || today.taps === 0) return state;
  const wasRound = state.last === "round";
  if (wasRound && today.rounds === 0) return state;
  const count = wasRound ? TASBIH_ROUND - 1 : state.count - 1;
  if (count < 0) return state;
  return {
    ...state,
    count,
    lifetime: Math.max(0, state.lifetime - 1),
    days: { ...state.days, [key]: { taps: today.taps - 1, rounds: today.rounds - (wasRound ? 1 : 0) } },
    // One level of undo: after taking a tap back there is nothing further to take back.
    last: null,
  };
}

/** Starts the current round again. The day's and lifetime totals keep what was counted. */
export function resetTasbih(state: TasbihState): TasbihState {
  return { ...state, count: 0, last: null };
}

export function selectDhikr(state: TasbihState, dhikrId: string): TasbihState {
  if (!TASBIH_DHIKR.some((d) => d.id === dhikrId) || dhikrId === state.dhikrId) return state;
  return { ...state, dhikrId, count: 0, last: null };
}

export function setVibrate(state: TasbihState, vibrate: boolean): TasbihState {
  return state.vibrate === vibrate ? state : { ...state, vibrate };
}

export function setSound(state: TasbihState, sound: boolean): TasbihState {
  return state.sound === sound ? state : { ...state, sound };
}

export function setTasbihTheme(state: TasbihState, theme: string): TasbihState {
  return state.theme === theme || !TASBIH_THEMES.some((t) => t.id === theme) ? state : { ...state, theme };
}

/** The sound of the current beads. */
export function currentTimbre(state: TasbihState): TasbihTimbre {
  return (TASBIH_THEMES.find((t) => t.id === state.theme) ?? TASBIH_THEMES[0]).timbre;
}

export function todaysTasbih(state: TasbihState, now: Date): TasbihDay {
  return state.days[dayKey(now)] ?? { taps: 0, rounds: 0 };
}

export function currentDhikr(state: TasbihState): TasbihDhikr {
  return TASBIH_DHIKR.find((d) => d.id === state.dhikrId) ?? TASBIH_DHIKR[0];
}
