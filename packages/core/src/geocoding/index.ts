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
