import { useEffect, useState } from "react";
import { nextPrayer, type DailyPrayerTimes, type ProgressPrayer } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface PrayerTimesListProps {
  todaysTimes: DailyPrayerTimes;
  /**
   * When given, each prayer row gets a tick: "I prayed this". One list for both
   * jobs — the timetable and the day's log — instead of two cards listing the
   * same five prayers.
   */
  tracking?: {
    /** The prayers marked as prayed today. */
    done: ProgressPrayer[];
    onToggle: (prayer: ProgressPrayer, done: boolean) => void;
  };
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
 * With `tracking`, it is also the place to tick off the prayers as they are
 * prayed (a tick opens once that prayer's time has started — you can't mark
 * Isha at noon). The tick is private and personal; nothing is shown to anyone.
 */
export function PrayerTimesList({ todaysTimes, tracking }: PrayerTimesListProps) {
  const { t, language } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Only the highlight and the ticks depend on the clock, and they change at most a few times a day.
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // "-u-nu-latn": Western digits in Arabic too, matching the rest of the app.
  const format = new Intl.DateTimeFormat(language === "ar" ? "ar-u-nu-latn" : "en", { hour: "numeric", minute: "2-digit" });
  const upcoming = nextPrayer(todaysTimes, now)?.name;

  return (
    <section className="prayer-times-list card" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="prayer-times-head">
        <h3>{t("prayer.todaysPrayers")}</h3>
        {tracking && <span className="prayer-times-count">{t("tracker.count", { done: tracking.done.length })}</span>}
      </div>
      <ul>
        {ROWS.map(({ name, key }) => {
          const isPrayer = key !== "sunrise";
          const prayer = key as ProgressPrayer;
          const isDone = tracking?.done.includes(prayer) ?? false;
          const started = now.getTime() >= todaysTimes[key].getTime();
          const label = t(`prayer.name.${name}`);
          const classes = [name === upcoming ? "next" : "", name === "Sunrise" ? "sunrise" : "", isDone ? "done" : ""].filter(Boolean).join(" ");
          return (
            <li key={name} className={classes || undefined} aria-current={name === upcoming ? "true" : undefined}>
              {tracking &&
                (isPrayer ? (
                  <button
                    type="button"
                    className="prayer-tick"
                    aria-pressed={isDone}
                    aria-label={t("tracker.mark", { prayer: label })}
                    disabled={!started && !isDone}
                    title={!started && !isDone ? t("tracker.notYet", { time: format.format(todaysTimes[key]) }) : undefined}
                    onClick={() => tracking.onToggle(prayer, !isDone)}
                  >
                    {isDone && <Icon name="check" size={16} />}
                  </button>
                ) : (
                  <span className="prayer-tick-spacer" aria-hidden="true" />
                ))}
              <span className="prayer-row-name">{label}</span>
              <time dateTime={todaysTimes[key].toISOString()} dir="ltr">
                {format.format(todaysTimes[key])}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
