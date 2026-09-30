import { describe, expect, it } from "vitest";
import { compassPoint, greatCircleDistanceKm, qiblaBearing, qiblaDistanceKm, qiblaTurn } from "./index.js";

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

describe("greatCircleDistanceKm", () => {
  it("measures Cairo → Alexandria at roughly 180 km", () => {
    const d = greatCircleDistanceKm(
      { latitude: 30.0444, longitude: 31.2357 },
      { latitude: 31.2001, longitude: 29.9187 }
    );
    expect(d).toBeGreaterThan(170);
    expect(d).toBeLessThan(190);
  });
});

describe("compassPoint", () => {
  it("names the nearest of the 8 compass points", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(22)).toBe("N");
    expect(compassPoint(23)).toBe("NE");
    expect(compassPoint(136)).toBe("SE");
    expect(compassPoint(270)).toBe("W");
    expect(compassPoint(350)).toBe("N");
    expect(compassPoint(-90)).toBe("W");
  });
});

describe("qiblaTurn", () => {
  it("says turn right when the Qibla is clockwise of the heading", () => {
    expect(qiblaTurn(136, 100)).toEqual({ direction: "right", degrees: 36 });
  });

  it("says turn left when the Qibla is counter-clockwise of the heading", () => {
    expect(qiblaTurn(100, 136)).toEqual({ direction: "left", degrees: 36 });
  });

  it("always takes the shorter way round the 0/360 wrap", () => {
    expect(qiblaTurn(10, 350)).toEqual({ direction: "right", degrees: 20 });
    expect(qiblaTurn(350, 10)).toEqual({ direction: "left", degrees: 20 });
  });

  it("reports no turn once within the tolerance", () => {
    expect(qiblaTurn(136, 134)).toEqual({ direction: "none", degrees: 0 });
    expect(qiblaTurn(1, 359)).toEqual({ direction: "none", degrees: 0 });
  });
});
