import type { City } from "@manarah/core";
import { searchCities } from "@manarah/core";

/**
 * World cities with population > 100,000, sourced from GeoNames'
 * cities15000.txt dump (CC BY 4.0), fetched 2026-09-15 — 6,252 cities. Each
 * carries a handful of common Latin-script alternate names pulled from
 * GeoNames' own alternate-names data (e.g. "Mecca" for "Makkah", "Medina"
 * for "Madinah") so the two most religiously significant cities in this app
 * are actually findable by the name most users will type — verified by hand
 * rather than left to a length-based heuristic that would have dropped them.
 *
 * Dynamically imported on first search rather than bundled eagerly (~1.2MB)
 * — most sessions never open the manual location picker at all (geolocation
 * covers them), so there's no reason every visitor downloads this upfront.
 */
let citiesPromise: Promise<City[]> | null = null;

function loadCities(): Promise<City[]> {
  citiesPromise ??= import("./cities.json").then((mod) => (mod.default ?? mod) as unknown as City[]);
  return citiesPromise;
}

export function getAllCities(): Promise<City[]> {
  return loadCities();
}

export async function findCities(query: string, limit = 10): Promise<City[]> {
  const cities = await loadCities();
  return searchCities(cities, query, limit);
}
