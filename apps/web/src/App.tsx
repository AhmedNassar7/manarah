import { useEffect, useState, type ReactNode } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import {
  computePrayerTimes,
  withDefaultSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AzkarSchedule,
  type City,
  type Coordinates,
  type DailyPrayerTimes,
  type Language,
  type PrayerTimesSettings,
  type Translation,
  type UserSettings,
  type Verse,
} from "@manarah/core";
import { getSurah, getTranslationForSurah, getVersesForSurah } from "@manarah/data";
import { IndexedDbStore } from "@manarah/storage";
import { LanguageProvider, LanguageSwitcher, translate, useTranslation } from "@manarah/ui";
import { Nav } from "./Nav.js";
import { NotificationPrompt } from "./NotificationPrompt.js";
import { startNotificationLoop } from "./notifications.js";
import { AzkarPage } from "./pages/AzkarPage.js";
import { Home } from "./pages/Home.js";
import { PrayerPage } from "./pages/PrayerPage.js";
import { QiblaPage } from "./pages/QiblaPage.js";
import { QuranPage } from "./pages/QuranPage.js";

const store = new IndexedDbStore();

/** The one translation edition wired in so far — a per-user choice among TRANSLATION_EDITIONS is future work. */
const DEFAULT_TRANSLATION_EDITION = "en.sahih";

/** Tomorrow's Fajr — lets PrayerCountdown roll over once tonight's Isha has passed, instead of going dead until midnight. */
function tomorrowsFajrFor(coordinates: Coordinates, settings: UserSettings["prayerTimesSettings"]): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return computePrayerTimes(coordinates, tomorrow, settings).fajr;
}

export function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [tomorrowsFajr, setTomorrowsFajr] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [selectedSurahVerses, setSelectedSurahVerses] = useState<Verse[] | null>(null);
  const [selectedSurahTranslation, setSelectedSurahTranslation] = useState<Translation[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = withDefaultSettings(await store.get<UserSettings>(SETTINGS_STORAGE_KEY));
      if (cancelled) return;
      setSettings(stored);
      // Resume wherever the user last left off, rather than always starting at Al-Fatiha.
      setSelectedSurahNumber(stored.lastRead?.surah ?? 1);
      if (stored.coordinates) {
        setTimes(computePrayerTimes(stored.coordinates, new Date(), stored.prayerTimesSettings));
        setTomorrowsFajr(tomorrowsFajrFor(stored.coordinates, stored.prayerTimesSettings));
      }

      if (!("geolocation" in navigator)) {
        if (!stored.coordinates) setError(translate(stored.language, "app.geolocationUnavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setSettings((prev) => {
            const next = { ...prev, coordinates };
            void store.set(SETTINGS_STORAGE_KEY, next);
            return next;
          });
          setTimes(computePrayerTimes(coordinates, new Date(), stored.prayerTimesSettings));
          setTomorrowsFajr(tomorrowsFajrFor(coordinates, stored.prayerTimesSettings));
        },
        (geoError) => {
          if (!cancelled && !stored.coordinates) setError(geoError.message);
        }
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedSurahNumber === null) return;
    let cancelled = false;
    void getVersesForSurah(selectedSurahNumber).then((verses) => {
      if (!cancelled) setSelectedSurahVerses(verses);
    });
    setSelectedSurahTranslation(null);
    void getTranslationForSurah(selectedSurahNumber, DEFAULT_TRANSLATION_EDITION).then((translation) => {
      if (!cancelled) setSelectedSurahTranslation(translation);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSurahNumber]);

  useEffect(() => {
    // Best-effort live compass heading — most desktops/laptops have no
    // orientation sensor at all, in which case no event ever fires and
    // QiblaCompass just stays in its static, north-up fallback mode.
    function handleOrientation(event: DeviceOrientationEvent) {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkitHeading === "number") {
        setHeading(webkitHeading);
      } else if (event.absolute && event.alpha !== null) {
        setHeading(360 - event.alpha);
      }
    }

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    return startNotificationLoop(store);
  }, []);

  function handleSchedulesChange(azkarSchedules: AzkarSchedule[]) {
    setSettings((prev) => {
      const next = { ...prev, azkarSchedules };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handlePrayerSettingsChange(prayerTimesSettings: PrayerTimesSettings) {
    setSettings((prev) => {
      const next = { ...prev, prayerTimesSettings };
      void store.set(SETTINGS_STORAGE_KEY, next);
      if (next.coordinates) {
        setTimes(computePrayerTimes(next.coordinates, new Date(), prayerTimesSettings));
        setTomorrowsFajr(tomorrowsFajrFor(next.coordinates, prayerTimesSettings));
      }
      return next;
    });
  }

  function handleCitySelect(city: City) {
    const coordinates = { latitude: city.latitude, longitude: city.longitude };
    setSettings((prev) => {
      const next = { ...prev, coordinates };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
    setError(null);
    setTimes(computePrayerTimes(coordinates, new Date(), settings.prayerTimesSettings));
    setTomorrowsFajr(tomorrowsFajrFor(coordinates, settings.prayerTimesSettings));
  }

  function handleSurahSelect(surahNumber: number) {
    setSelectedSurahNumber(surahNumber);
    setSettings((prev) => {
      const next = { ...prev, lastRead: { surah: surahNumber, ayah: 1 } };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleLanguageChange(language: Language) {
    setSettings((prev) => {
      const next = { ...prev, language };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  const selectedSurah = selectedSurahNumber !== null ? getSurah(selectedSurahNumber) : undefined;

  return (
    <LanguageProvider language={settings.language} onLanguageChange={handleLanguageChange}>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  error={error}
                  onCitySelect={handleCitySelect}
                  coordinates={settings.coordinates}
                  times={times}
                  tomorrowsFajr={tomorrowsFajr}
                  heading={heading}
                />
              }
            />
            <Route
              path="/prayer"
              element={
                <PrayerPage
                  coordinates={settings.coordinates}
                  times={times}
                  tomorrowsFajr={tomorrowsFajr}
                  prayerTimesSettings={settings.prayerTimesSettings}
                  onPrayerSettingsChange={handlePrayerSettingsChange}
                />
              }
            />
            <Route path="/qibla" element={<QiblaPage coordinates={settings.coordinates} heading={heading} />} />
            <Route
              path="/quran"
              element={
                <QuranPage
                  selectedSurahNumber={selectedSurahNumber}
                  selectedSurah={selectedSurah}
                  selectedSurahVerses={selectedSurahVerses}
                  selectedSurahTranslation={selectedSurahTranslation}
                  onSurahSelect={handleSurahSelect}
                />
              }
            />
            <Route
              path="/azkar"
              element={<AzkarPage azkarSchedules={settings.azkarSchedules} onSchedulesChange={handleSchedulesChange} />}
            />
          </Routes>
        </AppShell>
      </HashRouter>
    </LanguageProvider>
  );
}

/** Header + nav, shared by every route. Sits inside LanguageProvider so it (and the routed page inside it) can call useTranslation(). */
function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Manarah</h1>
        <span className="tagline">منارة — {t("app.tagline")}</span>
        <LanguageSwitcher />
      </header>
      <Nav />
      <NotificationPrompt />
      {children}
    </main>
  );
}
