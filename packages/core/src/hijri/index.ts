const MS_PER_DAY = 86_400_000;

export interface HijriDate {
  year: number;
  /** 1-12, Muharram through Dhul Hijjah. */
  month: number;
  /** 1-30. */
  day: number;
}

export interface IslamicEvent {
  id: string;
  name: string;
  hijriMonth: number;
  hijriDay: number;
}

function dayNumberFromUTC(year: number, monthIndex: number, day: number): number {
  return Math.floor(Date.UTC(year, monthIndex, day) / MS_PER_DAY);
}

function dayNumber(date: Date): number {
  return dayNumberFromUTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * 1 Muharram 1 AH = 19 July 622 CE in the proleptic Gregorian calendar (16
 * July 622 CE Julian) — the standard epoch for the tabular/arithmetic
 * Islamic calendar used here and by most offline hijri converters.
 */
const ISLAMIC_EPOCH_DAY = dayNumberFromUTC(622, 6, 19);

/** Day count (same linear scale as dayNumber above) for 1 Hijri-month-day of the given Hijri year, per the standard 30-year/11-leap-year tabular cycle. */
function islamicToDayNumber(year: number, month: number, day: number): number {
  return (
    ISLAMIC_EPOCH_DAY - 1 + day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30)
  );
}

/**
 * Converts a Gregorian date to the tabular (arithmetic) Islamic calendar —
 * computed client-side, no network call, per the zero-cost constraint.
 *
 * This is the same well-known 30-year-cycle/11-leap-year arithmetic every
 * offline hijri converter uses; it is NOT the real-world Umm al-Qura
 * calendar, which is based on lunar sighting/astronomical criteria decided
 * per country and can fall 1-2 days earlier or later. Good for a rough
 * "what Hijri date is it" display — not authoritative for determining
 * when a religious observance (Ramadan start/end, Eid) actually falls,
 * which should follow local moon-sighting announcements instead.
 */
export function gregorianToHijri(date: Date): HijriDate {
  const jdn = dayNumber(date);
  const year = Math.floor((30 * (jdn - ISLAMIC_EPOCH_DAY) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jdn - (29 + islamicToDayNumber(year, 1, 1))) / 29.5) + 1);
  const day = jdn - islamicToDayNumber(year, month, 1) + 1;
  return { year, month, day };
}

/** Inverse of gregorianToHijri — same tabular calendar, same caveats. */
export function hijriToGregorian(hijri: HijriDate): Date {
  return new Date(islamicToDayNumber(hijri.year, hijri.month, hijri.day) * MS_PER_DAY);
}

/** A handful of fixed-Hijri-date annual observances. Ramadan/Eid dates here follow the tabular calendar above, so treat them as an estimate, not an announcement. */
export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { id: "islamic-new-year", name: "Islamic New Year", hijriMonth: 1, hijriDay: 1 },
  { id: "ashura", name: "Ashura", hijriMonth: 1, hijriDay: 10 },
  { id: "ramadan-start", name: "Start of Ramadan", hijriMonth: 9, hijriDay: 1 },
  { id: "eid-al-fitr", name: "Eid al-Fitr", hijriMonth: 10, hijriDay: 1 },
  { id: "day-of-arafah", name: "Day of Arafah", hijriMonth: 12, hijriDay: 9 },
  { id: "eid-al-adha", name: "Eid al-Adha", hijriMonth: 12, hijriDay: 10 },
];

/** The next Gregorian date on/after `from` whose Hijri month/day matches `event` — checks this Hijri year first, then rolls over to the next one if it's already passed. */
export function nextOccurrence(event: IslamicEvent, from: Date): Date {
  const fromDay = dayNumber(from);
  const hijriNow = gregorianToHijri(from);

  const thisYear = islamicToDayNumber(hijriNow.year, event.hijriMonth, event.hijriDay);
  const resultDay = thisYear >= fromDay ? thisYear : islamicToDayNumber(hijriNow.year + 1, event.hijriMonth, event.hijriDay);

  return new Date(resultDay * MS_PER_DAY);
}
