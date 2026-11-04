import { Link } from "react-router-dom";
import {
  currentHijriDate,
  qiblaBearing,
  qiblaDistanceKm,
  toCalendarDate,
  type Coordinates,
  type DailyPrayerTimes,
} from "@manarah/core";
import { todaysMaghrib } from "./CalendarPage.js";
import {
  HijriToday,
  Icon,
  LocationSummary,
  PrayerHero,
  PrayerTimesList,
  QiblaCompass,
  RamadanCountdown,
  useTranslation,
  type LocationSummaryProps,
} from "@manarah/ui";

export interface HomeProps {
  locationSummary: LocationSummaryProps;
  coordinates: Coordinates | undefined;
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  heading: number | undefined;
  hijriAdjustment: number;
}

const QUICK_LINKS = [
  { to: "/prayer", icon: "mosque", labelKey: "app.sectionPrayer", hue: "prayer" },
  { to: "/qibla", icon: "qibla", labelKey: "app.sectionQibla", hue: "qibla" },
  { to: "/quran", icon: "quran", labelKey: "app.sectionQuran", hue: "quran" },
  { to: "/hadith", icon: "hadith", labelKey: "app.sectionHadith", hue: "hadith" },
  { to: "/calendar", icon: "calendar", labelKey: "app.sectionCalendar", hue: "calendar" },
  { to: "/zakat", icon: "zakat", labelKey: "app.sectionZakat", hue: "zakat" },
  { to: "/azkar", icon: "tasbih", labelKey: "app.sectionAzkar", hue: "azkar" },
] as const;

/**
 * The landing page: the day's sky with the next prayer, the day's timetable,
 * the Ramadan countdown and the Qibla — then a way into every other section
 * (the tiles show on phones; on desktop the sidebar already does that job).
 */
export function Home({ locationSummary, coordinates, times, tomorrowsFajr, heading, hijriAdjustment }: HomeProps) {
  const { t } = useTranslation();
  const now = new Date();
  const hijri = currentHijriDate(now, { maghrib: todaysMaghrib(times, now), adjustment: hijriAdjustment });

  return (
    <>
      <LocationSummary {...locationSummary} />

      {/* Without a location there are no prayer times, so the hero is absent — keep the date visible. */}
      {!times && (
        <p className="home-hijri">
          <Icon name="calendar" size={16} /> <HijriToday hijri={hijri} />
        </p>
      )}

      <div className="home-grid">
        {times && <PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} hijri={hijri} />}
        {times && <PrayerTimesList todaysTimes={times} />}
        <div className="home-side">
          <RamadanCountdown todayCivil={toCalendarDate(now)} adjustment={hijriAdjustment} />
          {coordinates && (
            <QiblaCompass
              bearing={qiblaBearing(coordinates)}
              distanceKm={qiblaDistanceKm(coordinates)}
              heading={heading}
            />
          )}
        </div>
      </div>

      <div className="home-links">
        {QUICK_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="home-link-card" data-hue={link.hue}>
            <Icon name={link.icon} size={24} />
            <span>{t(link.labelKey)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
