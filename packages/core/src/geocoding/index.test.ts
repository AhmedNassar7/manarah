import { describe, expect, it } from "vitest";
import { searchCities, type City } from "./index.js";

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
