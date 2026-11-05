import { describe, expect, it } from "vitest";
import { cityDisplayName, foldArabic, nearestCity, searchCities, type City } from "./index.js";

const cities: City[] = [
  {
    name: "Makkah",
    asciiName: "Makkah",
    countryCode: "SA",
    latitude: 21.42664,
    longitude: 39.82563,
    population: 1578722,
    timezone: "Asia/Riyadh",
    alternateNames: ["Mecca", "Meca"],
  },
  {
    name: "Cairo",
    asciiName: "Cairo",
    countryCode: "EG",
    latitude: 30.06263,
    longitude: 31.24967,
    population: 9606916,
    timezone: "Africa/Cairo",
  },
  {
    name: "Cairo",
    asciiName: "Cairo",
    countryCode: "US",
    latitude: 37.0051,
    longitude: -89.1765,
    population: 2831,
    timezone: "America/Chicago",
  },
];

describe("searchCities", () => {
  it("returns an empty array for an empty query", () => {
    expect(searchCities(cities, "")).toEqual([]);
    expect(searchCities(cities, "   ")).toEqual([]);
  });

  it("matches by primary name, case-insensitively", () => {
    const results = searchCities(cities, "cairo");
    expect(results.map((c) => c.countryCode)).toContain("EG");
  });

  it("matches by alternate name — this is what makes 'Mecca' findable", () => {
    const results = searchCities(cities, "mecca");
    expect(results).toHaveLength(1);
    expect(results[0].asciiName).toBe("Makkah");
  });

  it("ranks results by population, largest first", () => {
    const results = searchCities(cities, "cairo");
    expect(results.map((c) => c.countryCode)).toEqual(["EG", "US"]);
  });

  it("respects the limit parameter", () => {
    const manyLondons: City[] = Array.from({ length: 5 }, (_, i) => ({
      name: `London ${i}`,
      asciiName: `London ${i}`,
      countryCode: "XX",
      latitude: 0,
      longitude: 0,
      population: i,
      timezone: "UTC",
    }));
    expect(searchCities(manyLondons, "london", 3)).toHaveLength(3);
  });

  it("matches a partial substring, not just a prefix", () => {
    const results = searchCities(cities, "air");
    expect(results.map((c) => c.asciiName)).toContain("Cairo");
  });
});

describe("nearestCity", () => {
  const cairo: City = {
    name: "Cairo",
    asciiName: "Cairo",
    countryCode: "EG",
    latitude: 30.0444,
    longitude: 31.2357,
    population: 9_000_000,
    timezone: "Africa/Cairo",
  };
  const giza: City = {
    name: "Giza",
    asciiName: "Giza",
    countryCode: "EG",
    latitude: 30.0131,
    longitude: 31.2089,
    population: 2_400_000,
    timezone: "Africa/Cairo",
  };
  const alexandria: City = {
    name: "Alexandria",
    asciiName: "Alexandria",
    countryCode: "EG",
    latitude: 31.2001,
    longitude: 29.9187,
    population: 3_800_000,
    timezone: "Africa/Cairo",
  };

  it("picks the closest city to a GPS fix", () => {
    expect(nearestCity([alexandria, giza, cairo], { latitude: 30.05, longitude: 31.24 })).toBe(cairo);
    expect(nearestCity([alexandria, giza, cairo], { latitude: 30.01, longitude: 31.2 })).toBe(giza);
  });

  it("returns undefined when no city is within the cutoff", () => {
    expect(nearestCity([cairo], { latitude: 25, longitude: 25 })).toBeUndefined();
    expect(nearestCity([], { latitude: 30, longitude: 31 })).toBeUndefined();
  });
});

describe("Arabic city names", () => {
  const arabic: City[] = [
    { name: "Cairo", nameAr: "القاهرة", asciiName: "Cairo", countryCode: "EG", latitude: 30.06, longitude: 31.25, population: 9606916, timezone: "Africa/Cairo" },
    { name: "Alexandria", nameAr: "الإسكندرية", asciiName: "Alexandria", countryCode: "EG", latitude: 31.2, longitude: 29.92, population: 4546000, timezone: "Africa/Cairo" },
    { name: "Madinah", nameAr: "المدينة المنورة", asciiName: "Madinah", countryCode: "SA", latitude: 24.47, longitude: 39.61, population: 1300000, timezone: "Asia/Riyadh" },
    { name: "Tainan", asciiName: "Tainan", countryCode: "TW", latitude: 23.0, longitude: 120.2, population: 700000, timezone: "Asia/Taipei" },
  ];

  it("finds a city by its Arabic name, including a partial one", () => {
    expect(searchCities(arabic, "القاهرة").map((c) => c.name)).toEqual(["Cairo"]);
    expect(searchCities(arabic, "قاهر").map((c) => c.name)).toEqual(["Cairo"]);
  });

  it("finds it however the alef is typed (hamza above, below, or bare)", () => {
    expect(searchCities(arabic, "الاسكندرية").map((c) => c.name)).toEqual(["Alexandria"]);
    expect(searchCities(arabic, "الإسكندرية").map((c) => c.name)).toEqual(["Alexandria"]);
    expect(searchCities(arabic, "المدينه").map((c) => c.name)).toEqual(["Madinah"]); // ta marbuta typed as ha
  });

  it("still finds the same city by its English name", () => {
    expect(searchCities(arabic, "alex").map((c) => c.name)).toEqual(["Alexandria"]);
  });

  it("folds spelling variants and drops vowel marks", () => {
    expect(foldArabic("الإسكندرِيَّة")).toBe(foldArabic("الاسكندريه"));
    expect(foldArabic("مَكَّة")).toBe(foldArabic("مكه"));
  });

  it("shows the Arabic name in Arabic and the English name otherwise — and the English one when there is no Arabic name", () => {
    expect(cityDisplayName(arabic[0], "ar")).toBe("القاهرة");
    expect(cityDisplayName(arabic[0], "en")).toBe("Cairo");
    expect(cityDisplayName(arabic[3], "ar")).toBe("Tainan");
  });
});
