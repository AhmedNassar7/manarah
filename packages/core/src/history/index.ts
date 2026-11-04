import {
  clampHijriAdjustment,
  hijriDateOfCivilDay,
  nextOccurrence,
  type IslamicEvent,
} from "../hijri/index.js";

/**
 * "On this day" in Islamic history — the logic only (the events themselves
 * live in @manarah/data). An event is pinned to a Hijri month/day, a
 * Gregorian month/day, or both (the later events, whose Gregorian dates are
 * well recorded). Dates in early Islamic history are often reported with
 * different days, so every event says how sure it is: "established" (agreed)
 * or "traditional" (the commonly given date, which scholars may dispute).
 */

export type EventConfidence = "established" | "traditional";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface HistoricalEvent {
  id: string;
  /** The Hijri day it is remembered on; `year` is the year it happened (AH). */
  hijri?: { month: number; day: number; year?: number };
  /**
   * The Gregorian day, for events whose Gregorian date is known. Only for events
   * after 1582: earlier events' Western dates are Julian, 6-9 days off today's
   * Gregorian calendar, so they are pinned by their Hijri date instead.
   */
  gregorian?: { month: number; day: number; year: number };
  confidence: EventConfidence;
  title: LocalizedText;
  note: LocalizedText;
}

const MS_PER_DAY = 86_400_000;

/** Events that fall on today's date — by the Hijri calendar (with the user's adjustment) or the Gregorian one. `today` is a civil date from toCalendarDate. */
export function eventsOnDate(events: HistoricalEvent[], today: Date, adjustment = 0): HistoricalEvent[] {
  const hijri = hijriDateOfCivilDay(today, adjustment);
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  return events.filter(
    (e) =>
      (e.hijri !== undefined && e.hijri.month === hijri.month && e.hijri.day === hijri.day) ||
      (e.gregorian !== undefined && e.gregorian.month === month && e.gregorian.day === day)
  );
}

export interface UpcomingHistoricalEvent {
  event: HistoricalEvent;
  /** The civil date it is next remembered on (UTC midnight). */
  date: Date;
  /** 0 = today. */
  daysAway: number;
}

/** The next time a Gregorian month/day comes round on or after `today`. */
function nextGregorian(month: number, day: number, today: Date): Date {
  const thisYear = new Date(Date.UTC(today.getUTCFullYear(), month - 1, day));
  return thisYear.getTime() >= today.getTime() ? thisYear : new Date(Date.UTC(today.getUTCFullYear() + 1, month - 1, day));
}

/** The next occurrences of every event on or after `today`, soonest first (an event with both calendars uses whichever comes sooner). */
export function nextHistoricalEvents(events: HistoricalEvent[], today: Date, adjustment = 0, limit = Infinity): UpcomingHistoricalEvent[] {
  const shift = clampHijriAdjustment(adjustment);
  const results = events.map((event) => {
    const candidates: Date[] = [];
    if (event.hijri) {
      const stub: IslamicEvent = { id: event.id, name: event.id, hijriMonth: event.hijri.month, hijriDay: event.hijri.day };
      const shifted = nextOccurrence(stub, new Date(today.getTime() + shift * MS_PER_DAY));
      candidates.push(new Date(shifted.getTime() - shift * MS_PER_DAY));
    }
    if (event.gregorian) candidates.push(nextGregorian(event.gregorian.month, event.gregorian.day, today));
    const date = candidates.reduce((a, b) => (b.getTime() < a.getTime() ? b : a));
    return { event, date, daysAway: Math.round((date.getTime() - today.getTime()) / MS_PER_DAY) };
  });
  return results.sort((a, b) => a.daysAway - b.daysAway).slice(0, limit);
}
