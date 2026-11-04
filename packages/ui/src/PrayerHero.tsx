import { useEffect, useState } from "react";
import { prayerProgress, type DailyPrayerTimes, type HijriDate } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon, type IconName } from "./icons/Icon.js";

export interface PrayerHeroProps {
  todaysTimes: DailyPrayerTimes;
  /** Tomorrow's Fajr, so the countdown carries on through the night instead of stopping at Isha. */
  tomorrowsFajr?: Date;
  /** Today's Hijri date; shown beside the Gregorian one when given. */
  hijri?: HijriDate;
}

/** The icon for each period of the day — dawn, sunrise, midday, afternoon, sunset, night. */
const PERIOD_ICONS: Record<string, IconName> = {
  Fajr: "sunrise",
  Sunrise: "sun",
  Dhuhr: "sun",
  Asr: "cloud-sun",
  Maghrib: "sunset",
  Isha: "moon-star",
};

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * The home screen's centrepiece: the next prayer and a live countdown to it,
 * inside a sky that changes with the time of day (dawn blue, golden morning,
 * midday sky, amber afternoon, sunset, night), with a ring that fills as the
 * current period runs out and today's Gregorian and Hijri dates. The colour,
 * icon and ring all come from one fact — which period it is — so the whole
 * card reads as a glance at the clock.
 */
export function PrayerHero({ todaysTimes, tomorrowsFajr, hijri }: PrayerHeroProps) {
  const { t, language } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // "-u-nu-latn": Western digits in Arabic too, matching the rest of the app.
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const progress = prayerProgress(todaysTimes, tomorrowsFajr, now);
  const gregorian = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });

  const dates = (
    <p className="prayer-hero-dates">
      <span>{gregorian}</span>
      {hijri && (
        <span>
          {hijri.day} {t(`hijri.month.${hijri.month}`)} {hijri.year} {t("hijri.ah")}
        </span>
      )}
    </p>
  );

  if (!progress) {
    return (
      <section className="prayer-hero" data-period="isha" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
        <div className="prayer-hero-pattern" aria-hidden="true" />
        {dates}
        <h2 className="prayer-hero-name">{t("prayer.noMoreToday")}</h2>
      </section>
    );
  }

  const { current, next, fraction } = progress;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <section
      className="prayer-hero"
      data-period={current.toLowerCase()}
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="prayer-hero-pattern" aria-hidden="true" />
      <div className="prayer-hero-main">
        {dates}
        <p className="prayer-hero-label">{t("prayer.next")}</p>
        <h2 className="prayer-hero-name">{t(`prayer.name.${next.name}`)}</h2>
        <p className="prayer-hero-countdown" dir="ltr">
          {formatCountdown(next.at.getTime() - now.getTime())}
        </p>
        <p className="prayer-hero-at">{t("prayerHero.at", { time: clock.format(next.at) })}</p>
      </div>

      <div className="prayer-hero-ring" role="img" aria-label={t("prayerHero.progress", { percent: Math.round(fraction * 100) })}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="prayer-hero-ring-track" cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className="prayer-hero-ring-fill"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="prayer-hero-ring-icon">
          <Icon name={PERIOD_ICONS[current] ?? "sun"} size={24} />
        </span>
      </div>
    </section>
  );
}
