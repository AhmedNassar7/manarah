import { useEffect, useState } from "react";
import type { City } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface CitySearchProps {
  search: (query: string) => City[] | Promise<City[]>;
  onSelect: (city: City) => void;
  placeholder?: string;
}

/**
 * A manual location picker — the fallback (or deliberate override) for
 * geolocation. `search` may return synchronously or a Promise (the real
 * @manarah/data implementation lazy-loads its dataset on first search), so
 * this stays a pure, easily-testable component regardless of how the
 * underlying city list is loaded or how large it grows. Guards against
 * out-of-order results: if the user keeps typing, an older search that
 * resolves after a newer one is discarded rather than clobbering the
 * up-to-date results.
 */
export function CitySearch({ search, onSelect, placeholder }: CitySearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    void Promise.resolve(search(trimmed)).then((found) => {
      if (!cancelled) setResults(found);
    });

    return () => {
      cancelled = true;
    };
  }, [query, search]);

  function handleSelect(city: City) {
    onSelect(city);
    setQuery("");
  }

  return (
    <div className="city-search">
      <input
        type="text"
        role="searchbox"
        aria-label={t("citySearch.ariaLabel")}
        placeholder={placeholder ?? t("citySearch.placeholderDefault")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim() && (
        <ul>
          {results.length === 0 && <li>{t("citySearch.noResults")}</li>}
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
