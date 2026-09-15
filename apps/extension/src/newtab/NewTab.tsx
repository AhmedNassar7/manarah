import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type Coordinates,
  type DailyPrayerTimes,
  type Surah,
  type UserSettings,
  type Verse,
} from "@manarah/core";
import { getRandomVerse } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";
import { PrayerCountdown, QiblaCompass, VerseOfTheDay } from "@manarah/ui";

const store = new ChromeSyncStore();

export function NewTab() {
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [tomorrowsFajr, setTomorrowsFajr] = useState<Date | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [verseOfTheDay, setVerseOfTheDay] = useState<{ verse: Verse; surah: Surah } | null>(null);

  useEffect(() => {
    void getRandomVerse().then(setVerseOfTheDay);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Reads whatever location the popup already saved — deliberately doesn't
    // request geolocation itself. Prompting for location on every new tab a
    // user opens would be intrusive; the popup is where that happens once.
    async function load() {
      const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
      if (cancelled || !settings.coordinates) return;
      setCoordinates(settings.coordinates);
      setTimes(computePrayerTimes(settings.coordinates, new Date(), settings.prayerTimesSettings));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTomorrowsFajr(computePrayerTimes(settings.coordinates, tomorrow, settings.prayerTimesSettings).fajr);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="newtab-shell">
      {verseOfTheDay && <VerseOfTheDay verse={verseOfTheDay.verse} surah={verseOfTheDay.surah} />}
      <div className="card-row">
        {times && <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />}
        {coordinates && (
          <QiblaCompass bearing={qiblaBearing(coordinates)} distanceKm={qiblaDistanceKm(coordinates)} />
        )}
      </div>
    </main>
  );
}
