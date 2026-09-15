import { describe, expect, it } from "vitest";
import { findCities, getAllCities } from "./index.js";

describe("cities data integrity", () => {
  it("has a plausible number of cities (population > 100k worldwide)", async () => {
    const cities = await getAllCities();
    expect(cities.length).toBeGreaterThan(5000);
    expect(cities.length).toBeLessThan(10000);
  });

  it("has no empty names or invalid coordinates", async () => {
    const cities = await getAllCities();
    for (const city of cities) {
      expect(city.name.trim().length).toBeGreaterThan(0);
      expect(city.latitude).toBeGreaterThanOrEqual(-90);
      expect(city.latitude).toBeLessThanOrEqual(90);
      expect(city.longitude).toBeGreaterThanOrEqual(-180);
      expect(city.longitude).toBeLessThanOrEqual(180);
      expect(city.population).toBeGreaterThan(100000);
    }
  });

  it("includes Makkah and Madinah, findable by their standard English names", async () => {
    expect((await findCities("Mecca")).some((c) => c.asciiName === "Makkah")).toBe(true);
    expect((await findCities("Medina")).some((c) => c.asciiName === "Madinah")).toBe(true);
  });

  it("includes major world capitals", async () => {
    const cities = await getAllCities();
    for (const name of ["Cairo", "London", "Tokyo", "Jakarta", "Istanbul"]) {
      expect(cities.some((c) => c.asciiName === name)).toBe(true);
    }
  });

  it("findCities ranks by population and respects the default limit", async () => {
    const results = await findCities("San");
    expect(results.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].population).toBeLessThanOrEqual(results[i - 1].population);
    }
  });
});
