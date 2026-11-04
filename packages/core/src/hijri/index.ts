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
  { id: "tasua", name: "Tasu'a", hijriMonth: 1, hijriDay: 9 },
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

/* ---------- Calendar support (month grids, adjustment, observances) ---------- */

/** How many days the user can nudge the tabular calendar either way to match their local moon-sighting announcement. */
export const MAX_HIJRI_ADJUSTMENT = 2;

/** Clamps a stored/requested adjustment to a whole number of days in [-2, +2] (NaN and fractions from a hand-edited import included). */
export function clampHijriAdjustment(days: number): number {
  if (!Number.isFinite(days)) return 0;
  return Math.min(MAX_HIJRI_ADJUSTMENT, Math.max(-MAX_HIJRI_ADJUSTMENT, Math.round(days)));
}

/**
 * The *local* calendar date of `date` expressed as a UTC-midnight Date — the
 * form every function in this module works in. A plain `new Date()` at 23:30
 * in Cairo is already "tomorrow" in UTC terms for some zones, which would put
 * the Hijri date a day off; this reads the local year/month/day instead.
 */
export function toCalendarDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export interface CurrentHijriOptions {
  /** Today's Maghrib time. The Islamic day begins at sunset, so from Maghrib onward the Hijri date is already tomorrow's. */
  maghrib?: Date;
  /** User adjustment in days (clamped to ±2) — +1 means the Hijri date shown is one day later than the tabular calendar says. */
  adjustment?: number;
}

/** The Hijri date right now: the local civil date, moved on a day once Maghrib has passed, plus the user's adjustment. */
export function currentHijriDate(now: Date, { maghrib, adjustment = 0 }: CurrentHijriOptions = {}): HijriDate {
  const afterMaghrib = maghrib !== undefined && now.getTime() >= maghrib.getTime();
  return gregorianToHijri(addDays(toCalendarDate(now), (afterMaghrib ? 1 : 0) + clampHijriAdjustment(adjustment)));
}

/** Length of a Hijri month in the tabular calendar: 29 or 30 days (30 for Dhu al-Hijjah in a leap year). */
export function daysInHijriMonth(year: number, month: number): number {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return islamicToDayNumber(nextYear, nextMonth, 1) - islamicToDayNumber(year, month, 1);
}

/** Moves a (year, month) pair forwards or backwards by whole months, rolling the year. */
export function shiftHijriMonth(view: { year: number; month: number }, delta: number): { year: number; month: number } {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
}

/**
 * Observances that fall on a Hijri month/day: the fixed events above, plus
 * the "White Days" (13th–15th of every month) — except 13 Dhu al-Hijjah,
 * which is a day of Tashreeq on which fasting is forbidden.
 */
export function observancesOn(month: number, day: number): string[] {
  const ids = ISLAMIC_EVENTS.filter((e) => e.hijriMonth === month && e.hijriDay === day).map((e) => e.id);
  const tashreeq = month === 12 && day === 13;
  if (day >= 13 && day <= 15 && !tashreeq) ids.push("white-days");
  return ids;
}

export interface HijriMonthDay {
  /** Day of the Hijri month, 1-30. */
  day: number;
  /** The civil (Gregorian) date it falls on, as UTC midnight — format with timeZone "UTC". */
  date: Date;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** Observance ids for this day (see observancesOn). */
  observances: string[];
}

/** Every day of a Hijri month with its Gregorian date, weekday and observances, shifted by the user's adjustment. */
export function hijriMonthDays(year: number, month: number, adjustment = 0): HijriMonthDay[] {
  const shift = clampHijriAdjustment(adjustment);
  const length = daysInHijriMonth(year, month);
  return Array.from({ length }, (_, i) => {
    const day = i + 1;
    const date = addDays(hijriToGregorian({ year, month, day }), -shift);
    return { day, date, weekday: date.getUTCDay(), observances: observancesOn(month, day) };
  });
}

export interface UpcomingEvent {
  event: IslamicEvent;
  /** Civil date (UTC midnight). */
  date: Date;
  daysAway: number;
}

/** The next occurrence of each fixed event on/after `today` (a civil date from toCalendarDate), soonest first, with the user's adjustment applied. */
export function upcomingEvents(today: Date, adjustment = 0): UpcomingEvent[] {
  const shift = clampHijriAdjustment(adjustment);
  return ISLAMIC_EVENTS.map((event) => {
    const date = addDays(nextOccurrence(event, addDays(today, shift)), -shift);
    return { event, date, daysAway: Math.round((date.getTime() - today.getTime()) / MS_PER_DAY) };
  }).sort((a, b) => a.daysAway - b.daysAway);
}
