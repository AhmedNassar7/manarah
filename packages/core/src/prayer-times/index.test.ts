import { describe, expect, it } from "vitest";
import { computePrayerTimes, nextPrayer, prayerProgress, type CalculationMethodId, type DailyPrayerTimes } from "./index.js";

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

describe("prayerProgress", () => {
  const times = timesOn("2026-11-05");
  const tomorrowsFajr = new Date("2026-11-06T05:01:00");

  it("is inside a period, with its start, end and how far through it we are", () => {
    // Dhuhr 12:00 -> Asr 15:30 is 210 minutes; 13:45 is 105 minutes in = half way.
    const progress = prayerProgress(times, tomorrowsFajr, new Date("2026-11-05T13:45:00"))!;
    expect(progress.current).toBe("Dhuhr");
    expect(progress.next).toEqual({ name: "Asr", at: times.asr });
    expect(progress.startedAt).toEqual(times.dhuhr);
    expect(progress.fraction).toBeCloseTo(0.5, 5);
  });

  it("treats sunrise as a waypoint: Fajr ends at sunrise", () => {
    const progress = prayerProgress(times, tomorrowsFajr, new Date("2026-11-05T05:30:00"))!;
    expect(progress.current).toBe("Fajr");
    expect(progress.next.name).toBe("Sunrise");
  });

  it("is 0 at the instant a period begins", () => {
    expect(prayerProgress(times, tomorrowsFajr, times.asr)!.fraction).toBe(0);
    expect(prayerProgress(times, tomorrowsFajr, times.asr)!.current).toBe("Asr");
  });

  it("runs from Isha to tomorrow's Fajr once Isha has begun", () => {
    const progress = prayerProgress(times, tomorrowsFajr, new Date("2026-11-05T23:00:00"))!;
    expect(progress.current).toBe("Isha");
    expect(progress.next).toEqual({ name: "Fajr", at: tomorrowsFajr });
    expect(progress.fraction).toBeGreaterThan(0.2);
    expect(progress.fraction).toBeLessThan(0.5);
  });

  it("is still last night's Isha before today's Fajr, started about a day before today's Isha", () => {
    const progress = prayerProgress(times, tomorrowsFajr, new Date("2026-11-05T03:00:00"))!;
    expect(progress.current).toBe("Isha");
    expect(progress.next.name).toBe("Fajr");
    expect(progress.startedAt.getTime()).toBe(times.isha.getTime() - 86_400_000);
    expect(progress.fraction).toBeGreaterThan(0.5);
    expect(progress.fraction).toBeLessThan(1);
  });

  it("has nothing to measure towards after Isha when tomorrow's Fajr isn't known", () => {
    expect(prayerProgress(times, undefined, new Date("2026-11-05T23:00:00"))).toBeNull();
  });

  it("always stays within 0 to 1", () => {
    for (let h = 0; h < 24; h++) {
      const p = prayerProgress(times, tomorrowsFajr, new Date(`2026-11-05T${String(h).padStart(2, "0")}:15:00`))!;
      expect(p.fraction).toBeGreaterThanOrEqual(0);
      expect(p.fraction).toBeLessThanOrEqual(1);
    }
  });
});

