import { describe, expect, it } from "vitest";
import { hijriToGregorian } from "../hijri/index.js";
import { eventsOnDate, nextHistoricalEvents, type HistoricalEvent } from "./index.js";

const DAY = 86_400_000;
const text = (s: string) => ({ en: s, ar: s });
const ev = (id: string, partial: Partial<HistoricalEvent>): HistoricalEvent => ({
  id,
  confidence: "established",
  title: text(id),
  note: text(id),
  ...partial,
});

const badr = ev("badr", { hijri: { month: 9, day: 17, year: 2 } });
const jerusalem = ev("jerusalem", { hijri: { month: 7, day: 27, year: 583 }, gregorian: { month: 10, day: 2, year: 1187 } });
const events = [badr, jerusalem];

/** The civil date of a Hijri day in year 1448. */
const civil = (month: number, day: number, adjustment = 0) => new Date(hijriToGregorian({ year: 1448, month, day }).getTime() - adjustment * DAY);

describe("eventsOnDate", () => {
  it("finds an event on its Hijri date, whatever the year", () => {
    expect(eventsOnDate(events, civil(9, 17)).map((e) => e.id)).toEqual(["badr"]);
  });

  it("finds nothing on an ordinary day", () => {
    expect(eventsOnDate(events, civil(6, 4))).toEqual([]);
  });

  it("matches an event with a recorded Gregorian date on that date too", () => {
    expect(eventsOnDate(events, new Date(Date.UTC(2026, 9, 2))).map((e) => e.id)).toContain("jerusalem");
    expect(eventsOnDate(events, new Date(Date.UTC(2026, 9, 3))).map((e) => e.id)).not.toContain("jerusalem");
  });

  it("follows the user's Hijri adjustment: a later Hijri date lands on an earlier civil day", () => {
    expect(eventsOnDate(events, civil(9, 17, 1), 1).map((e) => e.id)).toEqual(["badr"]);
    expect(eventsOnDate(events, civil(9, 17, 1), 0).map((e) => e.id)).not.toContain("badr");
  });

  it("returns several events that share a day", () => {
    const both = [badr, ev("other", { hijri: { month: 9, day: 17 } })];
    expect(eventsOnDate(both, civil(9, 17)).map((e) => e.id)).toEqual(["badr", "other"]);
  });
});

describe("nextHistoricalEvents", () => {
  it("lists the next occurrence of each event, soonest first, never in the past", () => {
    const today = civil(6, 4);
    const next = nextHistoricalEvents(events, today);
    expect(next.map((n) => n.event.id)).toEqual(["jerusalem", "badr"].sort((a, b) => next.findIndex((n) => n.event.id === a) - next.findIndex((n) => n.event.id === b)));
    const days = next.map((n) => n.daysAway);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    for (const n of next) expect(n.daysAway).toBeGreaterThanOrEqual(0);
  });

  it("is today (0 days) on the day itself", () => {
    expect(nextHistoricalEvents([badr], civil(9, 17))[0]).toMatchObject({ daysAway: 0 });
  });

  it("rolls over to next year once it has passed", () => {
    const next = nextHistoricalEvents([badr], civil(9, 18))[0];
    expect(next.daysAway).toBeGreaterThan(340);
    expect(next.daysAway).toBeLessThan(360);
  });

  it("counts the exact days to an event this year", () => {
    expect(nextHistoricalEvents([badr], new Date(civil(9, 17).getTime() - 10 * DAY))[0].daysAway).toBe(10);
  });

  it("uses whichever calendar's date comes sooner for an event with both", () => {
    const today = new Date(Date.UTC(2026, 9, 1)); // 1 Oct: the Gregorian date (2 Oct) is a day away
    const next = nextHistoricalEvents([jerusalem], today)[0];
    expect(next.daysAway).toBe(1);
  });

  it("respects the adjustment and the limit", () => {
    const today = new Date(civil(9, 17).getTime() - 10 * DAY);
    expect(nextHistoricalEvents([badr], today, 1)[0].daysAway).toBe(9);
    expect(nextHistoricalEvents(events, today, 0, 1)).toHaveLength(1);
  });
});
