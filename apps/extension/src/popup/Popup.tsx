import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type Coordinates,
  type DailyPrayerTimes,
  type UserSettings,
} from "@manarah/core";
import { ChromeSyncStore } from "@manarah/storage";
import { PrayerCountdown, QiblaCompass } from "@manarah/ui";

const store = new ChromeSyncStore();

export function Popup() {
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;

      if (settings.coordinates) {
        setCoordinates(settings.coordinates);
        setTimes(computePrayerTimes(settings.coordinates, new Date(), settings.prayerTimesSettings));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const nextCoordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const nextSettings: UserSettings = { ...settings, coordinates: nextCoordinates };
          await store.set(SETTINGS_STORAGE_KEY, nextSettings);
          setCoordinates(nextCoordinates);
          setTimes(computePrayerTimes(nextCoordinates, new Date(), nextSettings.prayerTimesSettings));
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
    <div className="popup-shell">
      <h1>Manarah</h1>
      {error && <p className="alert">{error}</p>}
      {times && <PrayerCountdown todaysTimes={times} />}
      {coordinates && (
        // No orientation sensor in a browser extension popup — static, north-up compass.
        <QiblaCompass bearing={qiblaBearing(coordinates)} distanceKm={qiblaDistanceKm(coordinates)} />
      )}
    </div>
  );
}
