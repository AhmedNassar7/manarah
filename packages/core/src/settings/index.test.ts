import { describe, expect, it } from "vitest";
import {
  clampReaderFontStep,
  readerFontScale,
  READER_FONT_SCALES,
  shouldRefreshLocationFromGps,
  withDefaultSettings,
  DEFAULT_SETTINGS,
} from "./index.js";

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

describe("reader text size", () => {
  it("defaults to the 1x step and backfills reading settings (Arabic-only, translation off) missing from older saved settings", () => {
    const settings = withDefaultSettings({ language: "ar" });
    expect(readerFontScale(settings.readerFontStep)).toBe(1);
    expect(settings.showTranslation).toBe(false);
  });

  it("clamps out-of-range, fractional and non-numeric steps", () => {
    expect(clampReaderFontStep(-3)).toBe(0);
    expect(clampReaderFontStep(99)).toBe(READER_FONT_SCALES.length - 1);
    expect(clampReaderFontStep(2.4)).toBe(2);
    expect(clampReaderFontStep(NaN)).toBe(DEFAULT_SETTINGS.readerFontStep);
    expect(readerFontScale(99)).toBe(READER_FONT_SCALES[READER_FONT_SCALES.length - 1]);
  });

  it("has strictly increasing scales that include 1x", () => {
    expect(READER_FONT_SCALES).toContain(1);
    for (let i = 1; i < READER_FONT_SCALES.length; i++) {
      expect(READER_FONT_SCALES[i]).toBeGreaterThan(READER_FONT_SCALES[i - 1]);
    }
  });
});
