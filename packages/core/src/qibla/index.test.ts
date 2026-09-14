import { describe, expect, it } from "vitest";
import { qiblaBearing, qiblaDistanceKm } from "./index.js";

describe("qiblaDistanceKm", () => {
  it("is ~0 when standing at the Kaaba itself", () => {
    expect(qiblaDistanceKm({ latitude: 21.4225, longitude: 39.8262 })).toBeLessThan(0.01);
  });

  it("is a plausible distance from Cairo (~1150-1300km great-circle)", () => {
    const cairo = { latitude: 30.0444, longitude: 31.2357 };
    const distance = qiblaDistanceKm(cairo);
    expect(distance).toBeGreaterThan(1150);
    expect(distance).toBeLessThan(1300);
  });
});

describe("qiblaBearing", () => {
  it("points due north (0°) from a point directly south of the Kaaba on the same meridian", () => {
    const dueSouthOfKaaba = { latitude: 10, longitude: 39.8262 };
    const bearing = qiblaBearing(dueSouthOfKaaba);
    expect(bearing).toBeCloseTo(0, 1);
  });

  it("points due south (180°) from a point directly north of the Kaaba on the same meridian", () => {
    const dueNorthOfKaaba = { latitude: 40, longitude: 39.8262 };
    const bearing = qiblaBearing(dueNorthOfKaaba);
    expect(bearing).toBeCloseTo(180, 1);
  });

  it("always returns a value in [0, 360)", () => {
    const points = [
      { latitude: 40.7128, longitude: -74.006 }, // New York
      { latitude: -6.2088, longitude: 106.8456 }, // Jakarta
      { latitude: 51.5072, longitude: -0.1276 }, // London
    ];
    for (const point of points) {
      const bearing = qiblaBearing(point);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    }
  });

  it("points roughly east-southeast from New York (a widely-cited real-world reference)", () => {
    // New York's Qibla is well known to be roughly ESE (~58° from north), not literally
    // east, due to great-circle geometry — used here as a real, checkable sanity bound.
    const newYork = { latitude: 40.7128, longitude: -74.006 };
    const bearing = qiblaBearing(newYork);
    expect(bearing).toBeGreaterThan(50);
    expect(bearing).toBeLessThan(65);
  });
});
