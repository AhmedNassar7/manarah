import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type City,
  type Coordinates,
  type DailyPrayerTimes,
  type UserSettings,
} from "@manarah/core";
import { findCities } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";
import { CitySearch, PrayerCountdown, QiblaCompass } from "@manarah/ui";

const store = new ChromeSyncStore();

function tomorrowsFajrFor(coordinates: Coordinates, settings: UserSettings["prayerTimesSettings"]): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return computePrayerTimes(coordinates, tomorrow, settings).fajr;
}

export function Popup() {
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [tomorrowsFajr, setTomorrowsFajr] = useState<Date | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;

      if (settings.coordinates) {
        setCoordinates(settings.coordinates);
        setTimes(computePrayerTimes(settings.coordinates, new Date(), settings.prayerTimesSettings));
        setTomorrowsFajr(tomorrowsFajrFor(settings.coordinates, settings.prayerTimesSettings));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const nextCoordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const nextSettings: UserSettings = { ...settings, coordinates: nextCoordinates };
          await store.set(SETTINGS_STORAGE_KEY, nextSettings);
          setCoordinates(nextCoordinates);
          setTimes(computePrayerTimes(nextCoordinates, new Date(), nextSettings.prayerTimesSettings));
          setTomorrowsFajr(tomorrowsFajrFor(nextCoordinates, nextSettings.prayerTimesSettings));
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

  async function handleCitySelect(city: City) {
    const nextCoordinates = { latitude: city.latitude, longitude: city.longitude };
    const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
    const nextSettings: UserSettings = { ...settings, coordinates: nextCoordinates };
    await store.set(SETTINGS_STORAGE_KEY, nextSettings);
    setError(null);
    setCoordinates(nextCoordinates);
    setTimes(computePrayerTimes(nextCoordinates, new Date(), nextSettings.prayerTimesSettings));
    setTomorrowsFajr(tomorrowsFajrFor(nextCoordinates, nextSettings.prayerTimesSettings));
  }

  return (
    <div className="popup-shell">
      <h1>Manarah</h1>
      {error && (
        <div className="alert">
          <p>{error}</p>
          <CitySearch search={findCities} onSelect={handleCitySelect} placeholder="Set your city instead…" />
        </div>
      )}
      {times && <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />}
      {coordinates && (
        // No orientation sensor in a browser extension popup — static, north-up compass.
        <QiblaCompass bearing={qiblaBearing(coordinates)} distanceKm={qiblaDistanceKm(coordinates)} />
      )}
    </div>
  );
}
