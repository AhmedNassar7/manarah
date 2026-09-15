import { describe, expect, it } from "vitest";
import { computePrayerTimes, nextPrayer, type CalculationMethodId, type DailyPrayerTimes } from "./index.js";

const cairo = { latitude: 30.0444, longitude: 31.2357 };
const date = new Date("2026-06-15T00:00:00");

function timesOn(dateStr: string): DailyPrayerTimes {
  return {
    fajr: new Date(`${dateStr}T05:00:00`),
    sunrise: new Date(`${dateStr}T06:20:00`),
    dhuhr: new Date(`${dateStr}T12:00:00`),
    asr: new Date(`${dateStr}T15:30:00`),
    maghrib: new Date(`${dateStr}T18:00:00`),
    isha: new Date(`${dateStr}T19:30:00`),
  };
}

describe("computePrayerTimes", () => {
  it("returns the five daily prayers plus sunrise in chronological order", () => {
    const times = computePrayerTimes(cairo, date, { method: "UmmAlQura", asrSchool: "Standard" });
    const order = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha];
    for (let i = 1; i < order.length; i++) {
      expect(order[i].getTime()).toBeGreaterThan(order[i - 1].getTime());
    }
  });

  it("gives a later Asr for the Hanafi school than the Standard (Shafi) school, same day/location", () => {
    const standard = computePrayerTimes(cairo, date, { method: "UmmAlQura", asrSchool: "Standard" });
    const hanafi = computePrayerTimes(cairo, date, { method: "UmmAlQura", asrSchool: "Hanafi" });
    expect(hanafi.asr.getTime()).toBeGreaterThan(standard.asr.getTime());
  });

  it("produces different Fajr times for different locations on the same day", () => {
    const jakarta = { latitude: -6.2088, longitude: 106.8456 };
    const cairoTimes = computePrayerTimes(cairo, date, { method: "MuslimWorldLeague", asrSchool: "Standard" });
    const jakartaTimes = computePrayerTimes(jakarta, date, { method: "MuslimWorldLeague", asrSchool: "Standard" });
    expect(cairoTimes.fajr.getTime()).not.toBe(jakartaTimes.fajr.getTime());
  });

  it("accepts every documented calculation method without throwing", () => {
    const methods: CalculationMethodId[] = [
      "MuslimWorldLeague",
      "Egyptian",
      "Karachi",
      "UmmAlQura",
      "Dubai",
      "MoonsightingCommittee",
      "NorthAmerica",
      "Kuwait",
      "Qatar",
      "Singapore",
      "Tehran",
      "Turkey",
    ];
    for (const method of methods) {
      expect(() => computePrayerTimes(cairo, date, { method, asrSchool: "Standard" })).not.toThrow();
    }
  });
});

describe("nextPrayer", () => {
  it("finds the next upcoming waypoint, including sunrise", () => {
    const times = timesOn("2026-09-15");
    expect(nextPrayer(times, new Date("2026-09-15T05:30:00"))).toEqual({ name: "Sunrise", at: times.sunrise });
    expect(nextPrayer(times, new Date("2026-09-15T04:00:00"))).toEqual({ name: "Fajr", at: times.fajr });
  });

  it("returns null once every waypoint for the day has passed", () => {
    const times = timesOn("2026-09-15");
    expect(nextPrayer(times, new Date("2026-09-15T23:00:00"))).toBeNull();
  });

  it("returns the very next waypoint exactly at a boundary instant", () => {
    const times = timesOn("2026-09-15");
    expect(nextPrayer(times, times.dhuhr)).toEqual({ name: "Asr", at: times.asr });
  });
});
