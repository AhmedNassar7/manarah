import { CalculationMethod, Coordinates as AdhanCoordinates, Madhab, PrayerTimes } from "adhan";

export type CalculationMethodId =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran"
  | "Turkey";

export type AsrSchool = "Standard" | "Hanafi";

export interface PrayerTimesSettings {
  method: CalculationMethodId;
  asrSchool: AsrSchool;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DailyPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface UpcomingPrayer {
  name: string;
  at: Date;
}

const DISPLAY_ORDER: Array<[label: string, key: keyof DailyPrayerTimes]> = [
  ["Fajr", "fajr"],
  ["Sunrise", "sunrise"],
  ["Dhuhr", "dhuhr"],
  ["Asr", "asr"],
  ["Maghrib", "maghrib"],
  ["Isha", "isha"],
];

/**
 * The next upcoming waypoint in today's schedule, including sunrise (not a
 * prayer, but still a meaningful thing to display/count down to) — the
 * shared logic behind the countdown widget and the extension's toolbar
 * badge, so both surfaces agree on what "next" means. Not to be confused
 * with the 5-salah-only list used internally by the notification-scheduling
 * logic, which deliberately excludes sunrise.
 */
export function nextPrayer(times: DailyPrayerTimes, now: Date): UpcomingPrayer | null {
  const upcoming = DISPLAY_ORDER.find(([, key]) => times[key].getTime() > now.getTime());
  return upcoming ? { name: upcoming[0], at: times[upcoming[1]] } : null;
}

export interface PrayerProgress {
  /** The period we're in — the most recent waypoint that has begun ("Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib" or "Isha"). */
  current: string;
  /** The waypoint the period ends at. */
  next: UpcomingPrayer;
  /** When the current period began. */
  startedAt: Date;
  /** How far through the current period we are, 0 to 1. */
  fraction: number;
}

const DAY_MS = 86_400_000;

/**
 * Where we are in the day's schedule: which period (Fajr…Isha) is current, when
 * it started, and how far through it we are — what the home screen's progress
 * ring and time-of-day colouring are driven by. Before Fajr the current period
 * is last night's Isha (started about a day before today's Isha); after Isha
 * it runs to `tomorrowsFajr`, and with no tomorrow's Fajr there is nothing to
 * measure towards, so it returns null.
 */
export function prayerProgress(times: DailyPrayerTimes, tomorrowsFajr: Date | undefined, now: Date): PrayerProgress | null {
  const waypoints = DISPLAY_ORDER.map(([name, key]) => ({ name, at: times[key] }));
  const t = now.getTime();

  const nextIndex = waypoints.findIndex((w) => w.at.getTime() > t);
  let current: string;
  let startedAt: Date;
  let next: UpcomingPrayer;

  if (nextIndex === -1) {
    if (!tomorrowsFajr) return null;
    current = waypoints[waypoints.length - 1].name;
    startedAt = waypoints[waypoints.length - 1].at;
    next = { name: "Fajr", at: tomorrowsFajr };
  } else if (nextIndex === 0) {
    current = waypoints[waypoints.length - 1].name; // last night's Isha
    startedAt = new Date(waypoints[waypoints.length - 1].at.getTime() - DAY_MS);
    next = waypoints[0];
  } else {
    current = waypoints[nextIndex - 1].name;
    startedAt = waypoints[nextIndex - 1].at;
    next = waypoints[nextIndex];
  }

  const span = next.at.getTime() - startedAt.getTime();
  const fraction = span > 0 ? Math.min(1, Math.max(0, (t - startedAt.getTime()) / span)) : 0;
  return { current, next, startedAt, fraction };
}

export function computePrayerTimes(
  coordinates: Coordinates,
  date: Date,
  settings: PrayerTimesSettings
): DailyPrayerTimes {
  const params = CalculationMethod[settings.method]();
  params.madhab = settings.asrSchool === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;

  const times = new PrayerTimes(
    new AdhanCoordinates(coordinates.latitude, coordinates.longitude),
    date,
    params
  );

  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}
