import type { Coordinates } from "../prayer-times/index.js";
import { greatCircleDistanceKm } from "../qibla/index.js";

export interface City {
  name: string;
  asciiName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string;
  /** A few common Latin-script alternate spellings, e.g. "Mecca" for "Makkah". */
  alternateNames?: string[];
}

/**
 * Substring-matches `query` against each city's name, ascii name, and
 * alternate names, then ranks matches by population (largest first) — a
 * simple, predictable ordering that surfaces the city someone almost
 * certainly meant (e.g. "London, UK" before a small town of the same name).
 */
export function searchCities(cities: City[], query: string, limit = 10): City[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return cities
    .filter((city) => {
      if (city.name.toLowerCase().includes(normalized)) return true;
      if (city.asciiName.toLowerCase().includes(normalized)) return true;
      return city.alternateNames?.some((alt) => alt.toLowerCase().includes(normalized)) ?? false;
    })
    .sort((a, b) => b.population - a.population)
    .slice(0, limit);
}

/**
 * The closest city to `coordinates`, or undefined if none lies within
 * `maxDistanceKm` — turns a GPS fix into a human-readable place name
 * entirely on-device (no reverse-geocoding service), using the same bundled
 * GeoNames list as city search. The cutoff keeps a fix in open country or
 * at sea from being labelled with some far-off town.
 */
export function nearestCity(cities: City[], coordinates: Coordinates, maxDistanceKm = 50): City | undefined {
  let best: City | undefined;
  let bestDistance = maxDistanceKm;
  for (const city of cities) {
    const distance = greatCircleDistanceKm(coordinates, city);
    if (distance <= bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}
