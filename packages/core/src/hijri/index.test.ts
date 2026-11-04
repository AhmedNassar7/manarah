import { describe, expect, it } from "vitest";
import {
  clampHijriAdjustment,
  currentHijriDate,
  daysInHijriMonth,
  gregorianToHijri,
  hijriMonthDays,
  hijriToGregorian,
  ISLAMIC_EVENTS,
  MAX_HIJRI_ADJUSTMENT,
  nextOccurrence,
  observancesOn,
  ramadanStatus,
  shiftHijriMonth,
  toCalendarDate,
  upcomingEvents,
} from "./index.js";

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

const DAY = 86_400_000;

describe("toCalendarDate", () => {
  it("keeps the local calendar date, whatever the time of day or the zone's offset from UTC", () => {
    expect(toCalendarDate(new Date(2026, 10, 4, 23, 30)).getTime()).toBe(Date.UTC(2026, 10, 4));
    expect(toCalendarDate(new Date(2026, 10, 4, 0, 5)).getTime()).toBe(Date.UTC(2026, 10, 4));
  });
});

describe("clampHijriAdjustment", () => {
  it("clamps to ±2 whole days and treats junk as 0", () => {
    expect(MAX_HIJRI_ADJUSTMENT).toBe(2);
    expect(clampHijriAdjustment(5)).toBe(2);
    expect(clampHijriAdjustment(-9)).toBe(-2);
    expect(clampHijriAdjustment(1.4)).toBe(1);
    expect(clampHijriAdjustment(NaN)).toBe(0);
  });
});

describe("currentHijriDate", () => {
  const noon = new Date(2026, 10, 4, 12, 0);
  const maghrib = new Date(2026, 10, 4, 16, 40);
  const base = gregorianToHijri(utc(2026, 11, 4));

  it("is the plain tabular date before Maghrib or with no Maghrib known", () => {
    expect(currentHijriDate(noon)).toEqual(base);
    expect(currentHijriDate(noon, { maghrib })).toEqual(base);
  });

  it("moves on to the next Hijri day from Maghrib — the Islamic day starts at sunset", () => {
    const evening = new Date(2026, 10, 4, 18, 0);
    expect(currentHijriDate(evening, { maghrib })).toEqual(gregorianToHijri(utc(2026, 11, 5)));
    expect(currentHijriDate(maghrib, { maghrib })).toEqual(gregorianToHijri(utc(2026, 11, 5)));
  });

  it("applies the user's adjustment (and clamps it)", () => {
    expect(currentHijriDate(noon, { adjustment: 1 })).toEqual(gregorianToHijri(utc(2026, 11, 5)));
    expect(currentHijriDate(noon, { adjustment: -1 })).toEqual(gregorianToHijri(utc(2026, 11, 3)));
    expect(currentHijriDate(noon, { adjustment: 99 })).toEqual(currentHijriDate(noon, { adjustment: 2 }));
  });

  it("rolls the month and year at the boundary", () => {
    const lastDay = hijriToGregorian({ year: 1448, month: 12, day: daysInHijriMonth(1448, 12) });
    const [y, m, d] = [lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()];
    const evening = new Date(y, m, d, 20, 0);
    const maghribThatDay = new Date(y, m, d, 17, 0);
    expect(currentHijriDate(evening, { maghrib: maghribThatDay })).toEqual({ year: 1449, month: 1, day: 1 });
  });
});

describe("daysInHijriMonth", () => {
  it("is 29 or 30 for every month, and a year totals 354 or 355 days", () => {
    for (let year = 1440; year <= 1470; year++) {
      let total = 0;
      for (let month = 1; month <= 12; month++) {
        const n = daysInHijriMonth(year, month);
        expect([29, 30]).toContain(n);
        total += n;
      }
      expect([354, 355]).toContain(total);
    }
  });

  it("agrees with the conversion functions: the month ends the day before the next one begins", () => {
    for (const [year, month] of [
      [1447, 3],
      [1447, 12],
      [1448, 1],
    ]) {
      const last = hijriToGregorian({ year, month, day: daysInHijriMonth(year, month) });
      const nextFirst = hijriToGregorian(
        month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 }
      );
      expect(nextFirst.getTime() - last.getTime()).toBe(DAY);
    }
  });
});

describe("shiftHijriMonth", () => {
  it("rolls the year in both directions", () => {
    expect(shiftHijriMonth({ year: 1447, month: 12 }, 1)).toEqual({ year: 1448, month: 1 });
    expect(shiftHijriMonth({ year: 1448, month: 1 }, -1)).toEqual({ year: 1447, month: 12 });
    expect(shiftHijriMonth({ year: 1447, month: 5 }, 0)).toEqual({ year: 1447, month: 5 });
    expect(shiftHijriMonth({ year: 1447, month: 5 }, 14)).toEqual({ year: 1448, month: 7 });
    expect(shiftHijriMonth({ year: 1447, month: 5 }, -17)).toEqual({ year: 1445, month: 12 });
  });
});

describe("observancesOn", () => {
  it("lists the fixed events on their dates", () => {
    expect(observancesOn(1, 1)).toEqual(["islamic-new-year"]);
    expect(observancesOn(1, 9)).toEqual(["tasua"]);
    expect(observancesOn(1, 10)).toEqual(["ashura"]);
    expect(observancesOn(9, 1)).toEqual(["ramadan-start"]);
    expect(observancesOn(12, 10)).toEqual(["eid-al-adha"]);
  });

  it("marks the White Days (13-15) of every month", () => {
    for (let month = 1; month <= 12; month++) {
      for (const day of [13, 14, 15]) {
        if (month === 12 && day === 13) continue;
        expect(observancesOn(month, day), `${month}/${day}`).toContain("white-days");
      }
      expect(observancesOn(month, 12)).not.toContain("white-days");
      expect(observancesOn(month, 16)).not.toContain("white-days");
    }
  });

  it("does not mark 13 Dhu al-Hijjah — a day of Tashreeq, when fasting is forbidden", () => {
    expect(observancesOn(12, 13)).toEqual([]);
    expect(observancesOn(12, 14)).toContain("white-days");
  });

  it("has nothing on an ordinary day", () => {
    expect(observancesOn(6, 4)).toEqual([]);
  });
});

describe("hijriMonthDays", () => {
  const days = hijriMonthDays(1448, 2);

  it("covers the whole month, numbered from 1, on consecutive civil dates with matching weekdays", () => {
    expect(days).toHaveLength(daysInHijriMonth(1448, 2));
    expect(days.map((d) => d.day)).toEqual(days.map((_, i) => i + 1));
    for (let i = 1; i < days.length; i++) expect(days[i].date.getTime() - days[i - 1].date.getTime()).toBe(DAY);
    for (const d of days) expect(d.weekday).toBe(d.date.getUTCDay());
  });

  it("puts day 1 where the conversion says, and every day round-trips back to its Hijri date", () => {
    expect(days[0].date.getTime()).toBe(hijriToGregorian({ year: 1448, month: 2, day: 1 }).getTime());
    for (const d of days) expect(gregorianToHijri(d.date)).toEqual({ year: 1448, month: 2, day: d.day });
  });

  it("attaches observances (White Days on 13-15)", () => {
    expect(days[12].observances).toContain("white-days");
    expect(days[3].observances).toEqual([]);
  });

  it("shifts civil dates by the adjustment — a later Hijri date means an earlier civil one", () => {
    const shifted = hijriMonthDays(1448, 2, 1);
    expect(shifted[0].date.getTime()).toBe(days[0].date.getTime() - DAY);
    expect(hijriMonthDays(1448, 2, -2)[0].date.getTime()).toBe(days[0].date.getTime() + 2 * DAY);
    expect(shifted).toHaveLength(days.length);
  });

  it("agrees with currentHijriDate under the same adjustment", () => {
    const civil = hijriMonthDays(1448, 2, 1)[9].date;
    const asLocal = new Date(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate(), 12);
    expect(currentHijriDate(asLocal, { adjustment: 1 })).toEqual({ year: 1448, month: 2, day: 10 });
  });
});

describe("upcomingEvents", () => {
  const today = utc(2026, 11, 4);

  it("lists every event once, soonest first, never in the past", () => {
    const upcoming = upcomingEvents(today);
    expect(upcoming).toHaveLength(ISLAMIC_EVENTS.length);
    const away = upcoming.map((u) => u.daysAway);
    expect(away).toEqual([...away].sort((a, b) => a - b));
    for (const u of upcoming) {
      expect(u.daysAway).toBeGreaterThanOrEqual(0);
      expect(u.daysAway).toBeLessThanOrEqual(355);
      expect(u.date.getTime() - today.getTime()).toBe(u.daysAway * DAY);
    }
  });

  it("matches nextOccurrence with no adjustment, and slides by the adjustment otherwise", () => {
    const base = upcomingEvents(today);
    for (const u of base) expect(u.date.getTime()).toBe(nextOccurrence(u.event, today).getTime());
    const later = upcomingEvents(today, 1);
    for (const u of base) {
      const shifted = later.find((x) => x.event.id === u.event.id)!;
      expect(shifted.date.getTime()).toBe(u.date.getTime() - DAY);
    }
  });
});

describe("ramadanStatus", () => {
  const first = hijriToGregorian({ year: 1448, month: 9, day: 1 });
  const at = (offsetDays: number) => new Date(first.getTime() + offsetDays * DAY);

  it("counts the days until the first of Ramadan", () => {
    expect(ramadanStatus(at(-95))).toMatchObject({ phase: "before", daysAway: 95 });
    expect(ramadanStatus(at(-1))).toMatchObject({ phase: "before", daysAway: 1 }); // starts tomorrow
  });

  it("reports the first of Ramadan's civil date", () => {
    const status = ramadanStatus(at(-10));
    expect(status.phase === "before" && status.startsOn.getTime()).toBe(first.getTime());
  });

  it("is under way from the first day, with the day number and the days left", () => {
    expect(ramadanStatus(at(0))).toMatchObject({ phase: "during", day: 1 });
    const mid = ramadanStatus(at(11));
    expect(mid).toMatchObject({ phase: "during", day: 12 });
    expect(mid.phase === "during" && mid.daysLeft).toBe(mid.phase === "during" ? mid.length - 12 : -1);
    expect(mid.phase === "during" && [29, 30]).toContain(mid.phase === "during" ? mid.length : 0);
  });

  it("reaches the last day of Ramadan with no days left", () => {
    const length = daysInHijriMonth(1448, 9);
    expect(ramadanStatus(at(length - 1))).toMatchObject({ phase: "during", day: length, daysLeft: 0 });
  });

  it("is Eid on the first of Shawwal", () => {
    expect(ramadanStatus(at(daysInHijriMonth(1448, 9)))).toEqual({ phase: "eid" });
  });

  it("counts towards NEXT year's Ramadan once this one is over", () => {
    const status = ramadanStatus(at(daysInHijriMonth(1448, 9) + 5));
    expect(status.phase).toBe("before");
    // A lunar year is ~354 days; five days past Eid, next Ramadan is about 354 - 30 - 5 away.
    expect(status.phase === "before" && status.daysAway).toBeGreaterThan(310);
    expect(status.phase === "before" && status.daysAway).toBeLessThan(330);
  });

  it("follows the user's adjustment: a later Hijri date brings Ramadan a civil day earlier", () => {
    const today = at(-10);
    const plain = ramadanStatus(today, 0);
    const later = ramadanStatus(today, 1);
    expect(plain.phase === "before" && later.phase === "before" && later.daysAway).toBe(plain.phase === "before" ? plain.daysAway - 1 : -1);
  });

  it("agrees with the calendar's own Ramadan event", () => {
    const today = at(-50);
    const fromEvents = upcomingEvents(today).find((u) => u.event.id === "ramadan-start")!;
    const status = ramadanStatus(today);
    expect(status.phase === "before" && status.daysAway).toBe(fromEvents.daysAway);
  });
});

