import { useEffect, useState } from "react";
import { nextPrayer, type DailyPrayerTimes } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface PrayerCountdownProps {
  todaysTimes: DailyPrayerTimes;
  /**
   * Tomorrow's Fajr time. Once tonight's Isha has passed, the countdown
   * rolls over to this instead of going dead until midnight — matching
   * how Athan/prayer-time apps always show a live countdown to the next
   * prayer. Optional so callers that don't have it yet still get the
   * "No more prayers today" fallback rather than breaking.
   */
  tomorrowsFajr?: Date;
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Shared prayer-countdown widget: used in the extension popup, the web/PWA header, and the desktop tray. */
export function PrayerCountdown({ todaysTimes, tomorrowsFajr }: PrayerCountdownProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = nextPrayer(todaysTimes, now) ?? (tomorrowsFajr ? { name: "Fajr", at: tomorrowsFajr } : null);

  if (!upcoming) {
    return (
      <div className="prayer-countdown card">
        <p className="prayer-countdown-label">{t("prayer.todaysPrayers")}</p>
        <div className="prayer-countdown-name">{t("prayer.noMoreToday")}</div>
      </div>
    );
  }

  return (
    <div className="prayer-countdown card">
      <div className="prayer-countdown-label">{t("prayer.next")}</div>
      <div className="prayer-countdown-name">{t(`prayer.name.${upcoming.name}`)}</div>
      <div className="prayer-countdown-time">{formatCountdown(upcoming.at.getTime() - now.getTime())}</div>
    </div>
  );
}
