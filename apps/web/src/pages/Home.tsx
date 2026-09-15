import { Link } from "react-router-dom";
import { qiblaBearing, qiblaDistanceKm, type City, type Coordinates, type DailyPrayerTimes } from "@manarah/core";
import { findCities } from "@manarah/data";
import { CitySearch, PrayerCountdown, QiblaCompass, useTranslation } from "@manarah/ui";

export interface HomeProps {
  error: string | null;
  onCitySelect: (city: City) => void;
  coordinates: Coordinates | undefined;
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  heading: number | undefined;
}

const QUICK_LINKS = [
  { to: "/prayer", icon: "🕌", labelKey: "app.sectionPrayer" },
  { to: "/qibla", icon: "🧭", labelKey: "app.sectionQibla" },
  { to: "/quran", icon: "📖", labelKey: "app.sectionQuran" },
  { to: "/azkar", icon: "📿", labelKey: "app.sectionAzkar" },
] as const;

/** The landing page — a quick glance (today's next prayer, Qibla) plus a way into every other section. Everything else lives on its own route. */
export function Home({ error, onCitySelect, coordinates, times, tomorrowsFajr, heading }: HomeProps) {
  const { t } = useTranslation();

  return (
    <>
      {error && <p className="alert">{error}</p>}

      <CitySearch search={findCities} onSelect={onCitySelect} placeholder={t("citySearch.placeholderManual")} />

      <div className="card-row">
        {times && <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />}
        {coordinates && (
          <QiblaCompass bearing={qiblaBearing(coordinates)} distanceKm={qiblaDistanceKm(coordinates)} heading={heading} />
        )}
      </div>

      <div className="home-links">
        {QUICK_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="home-link-card">
            <span aria-hidden="true">{link.icon}</span>
            <span>{t(link.labelKey)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
