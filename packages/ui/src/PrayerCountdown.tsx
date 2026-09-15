import { useEffect, useState } from "react";
import type { DailyPrayerTimes } from "@manarah/core";

export interface PrayerCountdownProps {
  todaysTimes: DailyPrayerTimes;
}

function nextPrayer(times: DailyPrayerTimes, now: Date): { name: string; at: Date } | null {
  const entries: Array<[string, Date]> = [
    ["Fajr", times.fajr],
    ["Sunrise", times.sunrise],
    ["Dhuhr", times.dhuhr],
    ["Asr", times.asr],
    ["Maghrib", times.maghrib],
    ["Isha", times.isha],
  ];
  const upcoming = entries.find(([, at]) => at.getTime() > now.getTime());
  return upcoming ? { name: upcoming[0], at: upcoming[1] } : null;
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Shared prayer-countdown widget: used in the extension popup, the web/PWA header, and the desktop tray. */
export function PrayerCountdown({ todaysTimes }: PrayerCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = nextPrayer(todaysTimes, now);

  if (!upcoming) {
    return (
      <div className="prayer-countdown card">
        <p className="prayer-countdown-label">Today's prayers</p>
        <div className="prayer-countdown-name">No more prayers today</div>
      </div>
    );
  }

  return (
    <div className="prayer-countdown card">
      <div className="prayer-countdown-label">Next prayer</div>
      <div className="prayer-countdown-name">{upcoming.name}</div>
      <div className="prayer-countdown-time">{formatCountdown(upcoming.at.getTime() - now.getTime())}</div>
    </div>
  );
}
