import { describe, expect, it } from "vitest";
import { gregorianToHijri, hijriToGregorian, ISLAMIC_EVENTS, nextOccurrence } from "./index.js";

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("gregorianToHijri / hijriToGregorian", () => {
  it("places the calendar epoch at 1 Muharram 1 AH", () => {
    expect(gregorianToHijri(utc(622, 7, 19))).toEqual({ year: 1, month: 1, day: 1 });
  });

  it("round-trips through the Islamic calendar for a wide range of dates without drifting", () => {
    for (let day = utc(1900, 1, 1).getTime(); day <= utc(2100, 1, 1).getTime(); day += 37 * 86_400_000) {
      const date = new Date(day);
      const hijri = gregorianToHijri(date);
      expect(hijriToGregorian(hijri)).toEqual(date);
      expect(hijri.month).toBeGreaterThanOrEqual(1);
      expect(hijri.month).toBeLessThanOrEqual(12);
      expect(hijri.day).toBeGreaterThanOrEqual(1);
      expect(hijri.day).toBeLessThanOrEqual(30);
    }
  });

  it("matches the officially-announced Hijri new year for 1445 AH (19 July 2023) within the expected tabular-vs-sighting tolerance", () => {
    // The tabular/arithmetic calendar implemented here is an estimate — it
    // can differ from real moon-sighting-based announcements by a day or
    // two, but should land close. 1445 AH's new year was widely reported as
    // 19 July 2023 by Umm al-Qura, which is what this checks against.
    expect(gregorianToHijri(utc(2023, 7, 19))).toEqual({ year: 1445, month: 1, day: 1 });
  });

  it("keeps every 30-year cycle at exactly 10631 days (19 years of 354 + 11 leap years of 355)", () => {
    const cycleStart = hijriToGregorian({ year: 1, month: 1, day: 1 });
    const cycleEnd = hijriToGregorian({ year: 31, month: 1, day: 1 });
    const daysInCycle = (cycleEnd.getTime() - cycleStart.getTime()) / 86_400_000;
    expect(daysInCycle).toBe(10631);
  });
});

describe("nextOccurrence", () => {
  const ramadanStart = ISLAMIC_EVENTS.find((e) => e.id === "ramadan-start")!;

  it("returns this Hijri year's occurrence when it hasn't passed yet", () => {
    // Ramadan 1445 began 11 March 2024 (tabular calendar, see above) — a day
    // before that should still resolve to that same occurrence.
    expect(nextOccurrence(ramadanStart, utc(2024, 3, 10))).toEqual(hijriToGregorian({ year: 1445, month: 9, day: 1 }));
  });

  it("returns exactly today's date when today is the occurrence", () => {
    expect(nextOccurrence(ramadanStart, utc(2024, 3, 11))).toEqual(hijriToGregorian({ year: 1445, month: 9, day: 1 }));
  });

  it("rolls over to next Hijri year's occurrence once this year's has passed", () => {
    expect(nextOccurrence(ramadanStart, utc(2024, 3, 12))).toEqual(hijriToGregorian({ year: 1446, month: 9, day: 1 }));
  });
});

describe("ISLAMIC_EVENTS", () => {
  it("has unique ids and valid Hijri month/day ranges", () => {
    const ids = ISLAMIC_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const event of ISLAMIC_EVENTS) {
      expect(event.hijriMonth).toBeGreaterThanOrEqual(1);
      expect(event.hijriMonth).toBeLessThanOrEqual(12);
      expect(event.hijriDay).toBeGreaterThanOrEqual(1);
      expect(event.hijriDay).toBeLessThanOrEqual(30);
    }
  });
});
