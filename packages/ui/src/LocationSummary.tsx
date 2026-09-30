import { useState } from "react";
import type { City, Coordinates, SavedLocation } from "@manarah/core";
import { CitySearch } from "./CitySearch.js";
import { useTranslation } from "./i18n/index.js";

export interface LocationSummaryProps {
  coordinates: Coordinates | undefined;
  location: SavedLocation | undefined;
  search: (query: string) => City[] | Promise<City[]>;
  onCitySelect: (city: City) => void;
  /** Omitted where geolocation isn't available — hides the "use my current location" button. */
  onUseCurrentLocation?: () => void;
  /** True while a geolocation request is in flight. */
  locating?: boolean;
  /** A geolocation failure to show (e.g. permission denied), if any. */
  error?: string | null;
}

/** Localized country name for an ISO code ("EG" → "Egypt" / "مصر"), falling back to the code itself. */
function countryName(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The saved location at a glance — "📍 Cairo, Egypt · Detected from your
 * device" — with a Change control to pick a city or re-detect. With no
 * location yet, the picker is shown straight away instead of a dead end.
 */
export function LocationSummary({
  coordinates,
  location,
  search,
  onCitySelect,
  onUseCurrentLocation,
  locating = false,
  error,
}: LocationSummaryProps) {
  const { t, language } = useTranslation();
  const [editing, setEditing] = useState(false);
  const hasLocation = coordinates !== undefined;
  const showEditor = editing || !hasLocation;

  let label: string | undefined;
  if (location?.name) {
    label = location.countryCode ? `${location.name}, ${countryName(location.countryCode, language)}` : location.name;
  } else if (coordinates) {
    label = `${coordinates.latitude.toFixed(2)}°, ${coordinates.longitude.toFixed(2)}°`;
  }

  function handleCitySelect(city: City) {
    onCitySelect(city);
    setEditing(false);
  }

  function handleUseCurrentLocation() {
    onUseCurrentLocation?.();
    setEditing(false);
  }

  return (
    <section className="location-summary card" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      {hasLocation ? (
        <div className="location-summary-current">
          <span className="location-summary-pin" aria-hidden="true">
            📍
          </span>
          <div className="location-summary-text">
            <span className="location-summary-name">{label}</span>
            <span className="location-summary-source">
              {location?.source === "city" ? t("location.sourceCity") : t("location.sourceGps")}
            </span>
          </div>
          <button
            type="button"
            className="location-summary-change"
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t("location.cancel") : t("location.change")}
          </button>
        </div>
      ) : (
        <p className="location-summary-needed">{t("location.needed")}</p>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {showEditor && (
        <div className="location-summary-editor">
          {onUseCurrentLocation && (
            <button
              type="button"
              className="location-summary-gps"
              onClick={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? t("location.locating") : t("location.useCurrent")}
            </button>
          )}
          <CitySearch search={search} onSelect={handleCitySelect} placeholder={t("location.searchPlaceholder")} />
        </div>
      )}
    </section>
  );
}
