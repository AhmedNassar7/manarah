import { foldArabic } from "../geocoding/index.js";

/**
 * The Quran radio: live stations (Saudi Quran Radio, a station per reciter, tafsir, azkar, ruqyah,
 * translations …). The stations themselves are a checked snapshot in @manarah/data; this is what
 * the app does with them — which ones the person keeps as favourites, what they last listened to,
 * and how a long list is searched and narrowed. Pure: no audio, no storage.
 */

export type RadioGroup = "general" | "reciter" | "knowledge" | "azkar" | "translation";

export const RADIO_GROUPS: RadioGroup[] = ["general", "reciter", "knowledge", "azkar", "translation"];

export interface RadioStation {
  /** The source catalogue's own id (MP3Quran.net) — stable, so favourites survive an update. */
  id: number;
  nameAr: string;
  nameEn: string;
  /** The live stream (https). */
  url: string;
  group: RadioGroup;
  /** Which reading / style, when one reciter has several stations (e.g. "warsh", "mujawwad"). */
  variant?: string;
}

export const RADIO_STORAGE_KEY = "manarah.radio";

export interface RadioState {
  favorites: number[];
  lastId?: number;
}

export const emptyRadio = (): RadioState => ({ favorites: [] });

/** Reads saved state, repairing anything that is not what it should be. */
export function normalizeRadio(raw: unknown): RadioState {
  const r = (raw ?? {}) as { favorites?: unknown; lastId?: unknown };
  const favorites = Array.isArray(r.favorites)
    ? [...new Set(r.favorites.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))]
    : [];
  const lastId = typeof r.lastId === "number" && Number.isInteger(r.lastId) && r.lastId > 0 ? r.lastId : undefined;
  return lastId === undefined ? { favorites } : { favorites, lastId };
}

/** Adds the station to the favourites, or removes it if it is already there. New ones go first. */
export function toggleFavorite(state: RadioState, id: number): RadioState {
  const has = state.favorites.includes(id);
  return { ...state, favorites: has ? state.favorites.filter((f) => f !== id) : [id, ...state.favorites] };
}

export function rememberStation(state: RadioState, id: number): RadioState {
  return state.lastId === id ? state : { ...state, lastId: id };
}

/** Drops favourites / last station the catalogue no longer has (a station can be retired). */
export function pruneRadio(state: RadioState, stations: RadioStation[]): RadioState {
  const known = new Set(stations.map((s) => s.id));
  const favorites = state.favorites.filter((id) => known.has(id));
  const lastId = state.lastId !== undefined && known.has(state.lastId) ? state.lastId : undefined;
  return lastId === undefined ? { favorites } : { favorites, lastId };
}

export function stationName(station: RadioStation, language: string): string {
  return language === "ar" ? station.nameAr : station.nameEn;
}

export interface RadioFilter {
  query: string;
  /** One group, "favorites", or everything. */
  show: RadioGroup | "favorites" | "all";
  favorites: number[];
  language: string;
}

/**
 * The stations to list. A search matches the Arabic name (however its letters are spelled — أ/ا,
 * ة/ه, ى/ي, vowel marks ignored) or the English name, whichever language the app is in. Favourites
 * come in the order they were added; the other lists keep the catalogue's order for "general"
 * (Saudi Quran Radio first) and are alphabetical in the app's language for the rest.
 */
export function filterStations(stations: RadioStation[], { query, show, favorites, language }: RadioFilter): RadioStation[] {
  const q = query.trim();
  const folded = foldArabic(q);
  const lower = q.toLowerCase();
  const matches = (s: RadioStation) => !q || foldArabic(s.nameAr).includes(folded) || s.nameEn.toLowerCase().includes(lower);

  if (show === "favorites") {
    const byId = new Map(stations.map((s) => [s.id, s]));
    return favorites.map((id) => byId.get(id)).filter((s): s is RadioStation => s !== undefined && matches(s));
  }

  const inGroup = stations.filter((s) => (show === "all" || s.group === show) && matches(s));
  const collator = new Intl.Collator(language === "ar" ? "ar" : "en");
  const order = (g: RadioGroup) => RADIO_GROUPS.indexOf(g);
  return [...inGroup].sort((a, b) => {
    if (a.group !== b.group) return order(a.group) - order(b.group);
    if (a.group === "general") return 0; // the catalogue's own order (sort is stable)
    return collator.compare(stationName(a, language), stationName(b, language));
  });
}
