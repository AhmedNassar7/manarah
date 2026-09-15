import { useState } from "react";
import type { City } from "@manarah/core";

export interface CitySearchProps {
  search: (query: string) => City[];
  onSelect: (city: City) => void;
  placeholder?: string;
}

/**
 * A manual location picker — the fallback (or deliberate override) for
 * geolocation. Search is synchronous and injected rather than hard-wired to
 * @manarah/data, so this stays a pure, easily-testable component regardless
 * of how large the underlying city list grows.
 */
export function CitySearch({ search, onSelect, placeholder = "Search for a city…" }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const results = query.trim() ? search(query) : [];

  function handleSelect(city: City) {
    onSelect(city);
    setQuery("");
  }

  return (
    <div>
      <input
        type="text"
        role="searchbox"
        aria-label="City search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim() && (
        <ul>
          {results.length === 0 && <li>No matching cities</li>}
          {results.map((city) => (
            <li key={`${city.asciiName}-${city.countryCode}-${city.latitude}`}>
              <button type="button" onClick={() => handleSelect(city)}>
                {city.name}, {city.countryCode}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
