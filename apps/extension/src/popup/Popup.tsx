import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  withDefaultSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type City,
  type Coordinates,
  type DailyPrayerTimes,
  type Language,
  type UserSettings,
} from "@manarah/core";
import { findCities } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";
import {
  CitySearch,
  LanguageProvider,
  LanguageSwitcher,
  PrayerCountdown,
  QiblaCompass,
  useTranslation,
} from "@manarah/ui";

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
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const settings = withDefaultSettings(await store.get<UserSettings>(SETTINGS_STORAGE_KEY));
      setLanguage(settings.language);

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
    const settings = withDefaultSettings(await store.get<UserSettings>(SETTINGS_STORAGE_KEY));
    const nextSettings: UserSettings = { ...settings, coordinates: nextCoordinates };
    await store.set(SETTINGS_STORAGE_KEY, nextSettings);
    setError(null);
    setCoordinates(nextCoordinates);
    setTimes(computePrayerTimes(nextCoordinates, new Date(), nextSettings.prayerTimesSettings));
    setTomorrowsFajr(tomorrowsFajrFor(nextCoordinates, nextSettings.prayerTimesSettings));
  }

  async function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    const settings = withDefaultSettings(await store.get<UserSettings>(SETTINGS_STORAGE_KEY));
    await store.set(SETTINGS_STORAGE_KEY, { ...settings, language: nextLanguage });
  }

  return (
    <LanguageProvider language={language} onLanguageChange={handleLanguageChange}>
      <PopupBody
        times={times}
        tomorrowsFajr={tomorrowsFajr}
        coordinates={coordinates}
        error={error}
        onCitySelect={handleCitySelect}
      />
    </LanguageProvider>
  );
}

interface PopupBodyProps {
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  coordinates: Coordinates | null;
  error: string | null;
  onCitySelect: (city: City) => void;
}

function PopupBody({ times, tomorrowsFajr, coordinates, error, onCitySelect }: PopupBodyProps) {
  const { t } = useTranslation();

  return (
    <div className="popup-shell">
      <header className="app-header">
        <h1>Manarah</h1>
        <LanguageSwitcher />
      </header>
      {error && (
        <div className="alert">
          <p>{error}</p>
          <CitySearch search={findCities} onSelect={onCitySelect} placeholder={t("citySearch.placeholderPopupFallback")} />
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
