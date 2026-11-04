import { useEffect, useState } from "react";
import { nextPrayer, type DailyPrayerTimes } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface PrayerTimesListProps {
  todaysTimes: DailyPrayerTimes;
}

/** Order shown: the five prayers with sunrise between Fajr and Dhuhr — it ends Fajr's time, so it's part of the day's picture, but isn't a prayer. */
const ROWS: Array<{ name: string; key: keyof DailyPrayerTimes }> = [
  { name: "Fajr", key: "fajr" },
  { name: "Sunrise", key: "sunrise" },
  { name: "Dhuhr", key: "dhuhr" },
  { name: "Asr", key: "asr" },
  { name: "Maghrib", key: "maghrib" },
  { name: "Isha", key: "isha" },
];

/**
 * Today's full prayer timetable, with the next prayer highlighted — what
 * people open a prayer-times app to see at a glance. The countdown widget
 * answers "how long until the next one"; this answers "when are all of them".
 */
export function PrayerTimesList({ todaysTimes }: PrayerTimesListProps) {
  const { t, language } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Only the highlight depends on the clock, and it changes at most a few times a day.
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // "-u-nu-latn": Western digits in Arabic too, matching the rest of the app.
  const format = new Intl.DateTimeFormat(language === "ar" ? "ar-u-nu-latn" : "en", { hour: "numeric", minute: "2-digit" });
  const upcoming = nextPrayer(todaysTimes, now)?.name;

  return (
    <section className="prayer-times-list card" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <h3>{t("prayer.todaysPrayers")}</h3>
      <ul>
        {ROWS.map(({ name, key }) => (
          <li
            key={name}
            className={[name === upcoming ? "next" : "", name === "Sunrise" ? "sunrise" : ""].filter(Boolean).join(" ") || undefined}
            aria-current={name === upcoming ? "true" : undefined}
          >
            <span>{t(`prayer.name.${name}`)}</span>
            <time dateTime={todaysTimes[key].toISOString()} dir="ltr">
              {format.format(todaysTimes[key])}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
