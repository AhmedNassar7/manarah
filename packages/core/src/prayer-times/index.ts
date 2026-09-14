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
