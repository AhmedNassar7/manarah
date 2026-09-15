import type { City } from "@manarah/core";
import { searchCities } from "@manarah/core";
import citiesData from "./cities.json";

/**
 * World cities with population > 100,000, sourced from GeoNames'
 * cities15000.txt dump (CC BY 4.0), fetched 2026-09-15 — 6,252 cities. Each
 * carries a handful of common Latin-script alternate names pulled from
 * GeoNames' own alternate-names data (e.g. "Mecca" for "Makkah", "Medina"
 * for "Madinah") so the two most religiously significant cities in this app
 * are actually findable by the name most users will type — verified by hand
 * rather than left to a length-based heuristic that would have dropped them.
 */
export const CITIES: City[] = citiesData as City[];

export function findCities(query: string, limit = 10): City[] {
  return searchCities(CITIES, query, limit);
}
