import { dayKey } from "../progress/index.js";

/**
 * A digital tasbih: tap to count a dhikr. The count simply goes on — there is no round
 * size to choose and no rounds to keep; the ring of 33 beads is how you see it move
 * (every full turn of the ring is a small milestone), and the daily and lifetime totals
 * are for the person who counts. Pure and deterministic — the current time is always
 * passed in — and entirely personal: it lives on the device, nothing is ranked or shared.
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

/** What the beads are made of: how they look. Display names live in the UI dictionaries (`tasbih.theme.<id>`). */
export interface TasbihTheme {
  id: string;
}

export const TASBIH_THEMES: readonly TasbihTheme[] = [{ id: "wood" }, { id: "amber" }, { id: "pearl" }, { id: "emerald" }, { id: "turquoise" }, { id: "onyx" }];

/**
 * The sound of a bead: none (the default — a tasbih is often used where quiet matters), or one
 * of three soft ones. Display names are in the UI dictionaries (`tasbih.sound.<id>`).
 */
export const TASBIH_SOUNDS = ["off", "click", "wood", "bell"] as const;
export type TasbihSoundId = (typeof TASBIH_SOUNDS)[number];

/** Beads on the ring. Every full turn of it (every 33 counts) is a small milestone. */
export const TASBIH_BEADS = 33;

/** How many days of daily totals are kept. */
const KEEP_DAYS = 60;

export interface TasbihDay {
  taps: number;
}

export interface TasbihState {
  dhikrId: string;
  /** The count for the current phrase. It goes on past 33; only choosing another phrase or "reset" starts it again. */
  count: number;
  days: Record<string, TasbihDay>;
  lifetime: number;
  /** True right after a tap, so "undo" can take exactly that one back. */
  canUndo: boolean;
  sound: TasbihSoundId;
  /** What the beads are made of (see TASBIH_THEMES). */
  theme: string;
}

export function emptyTasbih(): TasbihState {
  return { dhikrId: TASBIH_DHIKR[0].id, count: 0, days: {}, lifetime: 0, canUndo: false, sound: "off", theme: TASBIH_THEMES[0].id };
}

const isCount = (v: unknown, max = 1_000_000_000): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max;

/** Validates saved state (older builds, hand-edited imports): anything malformed is dropped, valid parts kept; settings from older versions (round size, vibration, rounds) are ignored. */
export function normalizeTasbih(value: unknown): TasbihState {
  const fresh = emptyTasbih();
  if (typeof value !== "object" || value === null) return fresh;
  const raw = value as Record<string, unknown>;
  const days: Record<string, TasbihDay> = {};
  if (typeof raw.days === "object" && raw.days !== null) {
    for (const [key, entry] of Object.entries(raw.days as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof entry !== "object" || entry === null) continue;
      days[key] = { taps: isCount((entry as Record<string, unknown>).taps) ? (entry as { taps: number }).taps : 0 };
    }
  }
  // Earlier versions kept a yes/no for sound: "yes" becomes the wood sound it used to be.
  const sound: TasbihSoundId = TASBIH_SOUNDS.includes(raw.sound as TasbihSoundId) ? (raw.sound as TasbihSoundId) : raw.sound === true ? "wood" : "off";
  return {
    dhikrId: TASBIH_DHIKR.some((d) => d.id === raw.dhikrId) ? (raw.dhikrId as string) : fresh.dhikrId,
    count: isCount(raw.count) ? raw.count : 0,
    days,
    lifetime: isCount(raw.lifetime) ? raw.lifetime : 0,
    canUndo: raw.canUndo === true,
    sound,
    theme: TASBIH_THEMES.some((t) => t.id === raw.theme) ? (raw.theme as string) : fresh.theme,
  };
}

function prune(days: Record<string, TasbihDay>): Record<string, TasbihDay> {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  const keep = new Set(keys.slice(keys.length - KEEP_DAYS));
  return Object.fromEntries(Object.entries(days).filter(([k]) => keep.has(k)));
}

export interface TapResult {
  state: TasbihState;
  /** True when this tap finished a full turn of the ring (the 33rd, 66th, 99th…). */
  milestone: boolean;
}

/** One bead. */
export function tapTasbih(state: TasbihState, now: Date): TapResult {
  const key = dayKey(now);
  const today = state.days[key] ?? { taps: 0 };
  const count = state.count + 1;
  return {
    milestone: count % TASBIH_BEADS === 0,
    state: { ...state, count, lifetime: state.lifetime + 1, days: prune({ ...state.days, [key]: { taps: today.taps + 1 } }), canUndo: true },
  };
}

/** Takes back the last tap (one step only). */
export function undoTasbih(state: TasbihState, now: Date): TasbihState {
  if (!state.canUndo || state.count === 0) return state;
  const key = dayKey(now);
  const today = state.days[key];
  if (!today || today.taps === 0) return state;
  return {
    ...state,
    count: state.count - 1,
    lifetime: Math.max(0, state.lifetime - 1),
    days: { ...state.days, [key]: { taps: today.taps - 1 } },
    canUndo: false,
  };
}

/** Starts the count again from zero. The day's and lifetime totals keep what was counted. */
export function resetTasbih(state: TasbihState): TasbihState {
  return { ...state, count: 0, canUndo: false };
}

export function selectDhikr(state: TasbihState, dhikrId: string): TasbihState {
  if (!TASBIH_DHIKR.some((d) => d.id === dhikrId) || dhikrId === state.dhikrId) return state;
  return { ...state, dhikrId, count: 0, canUndo: false };
}

export function setSound(state: TasbihState, sound: TasbihSoundId): TasbihState {
  return state.sound === sound || !TASBIH_SOUNDS.includes(sound) ? state : { ...state, sound };
}

export function setTasbihTheme(state: TasbihState, theme: string): TasbihState {
  return state.theme === theme || !TASBIH_THEMES.some((t) => t.id === theme) ? state : { ...state, theme };
}

export function todaysTasbih(state: TasbihState, now: Date): TasbihDay {
  return state.days[dayKey(now)] ?? { taps: 0 };
}

export function currentDhikr(state: TasbihState): TasbihDhikr {
  return TASBIH_DHIKR.find((d) => d.id === state.dhikrId) ?? TASBIH_DHIKR[0];
}
