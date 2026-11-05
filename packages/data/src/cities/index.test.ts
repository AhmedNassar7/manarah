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

describe("Arabic city names", () => {
  it("gives a good share of cities an Arabic name, in Arabic letters only", async () => {
    const cities = await getAllCities();
    const named = cities.filter((c) => c.nameAr);
    // GeoNames has Arabic names for roughly 40% of these cities; a collapse would mean the merge broke.
    expect(named.length).toBeGreaterThan(2000);
    for (const c of named) {
      expect(c.nameAr, `${c.name} (${c.countryCode})`).toMatch(/^[ء-يٱ-ۓ '-]+$/);
    }
  });

  it("names the well-known cities correctly", async () => {
    const cities = await getAllCities();
    const ar = (name: string, cc: string) => cities.find((c) => c.name === name && c.countryCode === cc)?.nameAr;
    expect(ar("Cairo", "EG")).toBe("القاهرة");
    expect(ar("Makkah", "SA")).toBe("مكة المكرمة");
    expect(ar("Madinah", "SA")).toBe("المدينة المنورة");
    expect(ar("Riyadh", "SA")).toBe("الرياض");
    expect(ar("Alexandria", "EG")).toBe("الإسكندرية");
    expect(ar("Jeddah", "SA")).toBe("جدة");
    expect(ar("Dubai", "AE")).toBe("دبي");
  });

  it("finds a city by typing its Arabic name", async () => {
    expect((await findCities("القاهرة"))[0]?.asciiName).toBe("Cairo");
    expect((await findCities("مكه"))[0]?.asciiName).toBe("Makkah");
  });
});
