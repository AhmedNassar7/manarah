import { useEffect, useState } from "react";
import { PROGRESS_PRAYERS, type DailyPrayerTimes, type ProgressPrayer } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface PrayerTrackerProps {
  todaysTimes: DailyPrayerTimes;
  /** The prayers marked as prayed today. */
  done: ProgressPrayer[];
  onToggle: (prayer: ProgressPrayer, done: boolean) => void;
}

/**
 * "Mark today's prayers": one tap per prayer once its time has come. Kept
 * simple and private — it's between the person and their own habit, with a
 * small count and a gentle tick, nothing shown to anyone else.
 */
export function PrayerTracker({ todaysTimes, done, onToggle }: PrayerTrackerProps) {
  const { t, language } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Only the "not time yet" state depends on the clock, so a slow tick is plenty.
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const prayerName = (prayer: ProgressPrayer) => t(`prayer.name.${prayer[0].toUpperCase()}${prayer.slice(1)}`);

  return (
    <section className="prayer-tracker card" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="prayer-tracker-head">
        <h3>{t("tracker.title")}</h3>
        <span className="prayer-tracker-count">{t("tracker.count", { done: done.length })}</span>
      </div>
      <p className="prayer-tracker-hint">{t("tracker.hint")}</p>
      <ul>
        {PROGRESS_PRAYERS.map((prayer) => {
          const time = todaysTimes[prayer];
          const started = now.getTime() >= time.getTime();
          const isDone = done.includes(prayer);
          return (
            <li key={prayer}>
              <button
                type="button"
                className={isDone ? "done" : undefined}
                aria-pressed={isDone}
                disabled={!started && !isDone}
                onClick={() => onToggle(prayer, !isDone)}
                title={!started && !isDone ? t("tracker.notYet", { time: clock.format(time) }) : undefined}
              >
                <span className="prayer-tracker-tick" aria-hidden="true">
                  {isDone && <Icon name="check" size={16} />}
                </span>
                <span className="prayer-tracker-name">{prayerName(prayer)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
