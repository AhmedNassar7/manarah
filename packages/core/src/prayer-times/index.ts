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
