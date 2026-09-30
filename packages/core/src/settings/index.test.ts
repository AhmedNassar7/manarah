import { describe, expect, it } from "vitest";
import { shouldRefreshLocationFromGps, withDefaultSettings, DEFAULT_SETTINGS } from "./index.js";

describe("shouldRefreshLocationFromGps", () => {
  it("never overwrites a city the user picked by hand", () => {
    expect(shouldRefreshLocationFromGps({ source: "city", name: "Cairo", countryCode: "EG" })).toBe(false);
  });

  it("refreshes a previous GPS fix, or when nothing is saved yet", () => {
    expect(shouldRefreshLocationFromGps({ source: "gps" })).toBe(true);
    expect(shouldRefreshLocationFromGps(undefined)).toBe(true);
  });
});

describe("withDefaultSettings", () => {
  it("keeps a saved location and coordinates alongside backfilled defaults", () => {
    const stored = {
      coordinates: { latitude: 30, longitude: 31 },
      location: { source: "city" as const, name: "Cairo" },
    };
    const settings = withDefaultSettings(stored);
    expect(settings.location).toEqual(stored.location);
    expect(settings.coordinates).toEqual(stored.coordinates);
    expect(settings.language).toBe(DEFAULT_SETTINGS.language);
  });
});
