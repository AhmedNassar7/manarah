import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type DailyPrayerTimes,
  type UserSettings,
} from "@manarah/core";
import { ChromeSyncStore } from "@manarah/storage";
import { PrayerCountdown } from "@manarah/ui";

const store = new ChromeSyncStore();

export function Popup() {
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;

      if (settings.coordinates) {
        setTimes(computePrayerTimes(settings.coordinates, new Date(), settings.prayerTimesSettings));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const nextSettings: UserSettings = { ...settings, coordinates };
          await store.set(SETTINGS_STORAGE_KEY, nextSettings);
          setTimes(computePrayerTimes(coordinates, new Date(), nextSettings.prayerTimesSettings));
        },
        (geoError) => {
          if (!cancelled && !settings.coordinates) setError(geoError.message);
        }
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Manarah</h1>
      {error && <p role="alert">{error}</p>}
      {times && <PrayerCountdown todaysTimes={times} />}
    </div>
  );
}
