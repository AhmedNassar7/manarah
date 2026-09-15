import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  withDefaultSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AzkarSchedule,
  type City,
  type Coordinates,
  type DailyPrayerTimes,
  type Language,
  type PrayerTimesSettings,
  type Surah,
  type UserSettings,
  type Verse,
} from "@manarah/core";
import {
  AZKAR_CATEGORIES,
  CALCULATION_METHODS,
  findCities,
  getAzkarCategory,
  getSurah,
  getVersesForSurah,
  SURAHS,
} from "@manarah/data";
import { IndexedDbStore } from "@manarah/storage";
import {
  AzkarList,
  AzkarScheduleEditor,
  CitySearch,
  LanguageProvider,
  LanguageSwitcher,
  PrayerCountdown,
  PrayerSettingsEditor,
  QiblaCompass,
  QuranReader,
  SurahList,
  translate,
  useTranslation,
} from "@manarah/ui";

const MORNING_EVENING_AZKAR = getAzkarCategory("27")!;

const store = new IndexedDbStore();

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
      <AppBody
        settings={settings}
        times={times}
        tomorrowsFajr={tomorrowsFajr}
        error={error}
        heading={heading}
        selectedSurahNumber={selectedSurahNumber}
        selectedSurah={selectedSurah}
        selectedSurahVerses={selectedSurahVerses}
        onCitySelect={handleCitySelect}
        onPrayerSettingsChange={handlePrayerSettingsChange}
        onSurahSelect={handleSurahSelect}
        onSchedulesChange={handleSchedulesChange}
      />
    </LanguageProvider>
  );
}

interface AppBodyProps {
  settings: UserSettings;
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  error: string | null;
  heading: number | undefined;
  selectedSurahNumber: number | null;
  selectedSurah: Surah | undefined;
  selectedSurahVerses: Verse[] | null;
  onCitySelect: (city: City) => void;
  onPrayerSettingsChange: (settings: PrayerTimesSettings) => void;
  onSurahSelect: (surahNumber: number) => void;
  onSchedulesChange: (schedules: AzkarSchedule[]) => void;
}

/** The presentational half of the app — split out so it (and everything it renders) sits *inside* LanguageProvider and can call useTranslation(). */
function AppBody({
  settings,
  times,
  tomorrowsFajr,
  error,
  heading,
  selectedSurahNumber,
  selectedSurah,
  selectedSurahVerses,
  onCitySelect,
  onPrayerSettingsChange,
  onSurahSelect,
  onSchedulesChange,
}: AppBodyProps) {
  const { t } = useTranslation();

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Manarah</h1>
        <span className="tagline">منارة — {t("app.tagline")}</span>
        <LanguageSwitcher />
      </header>

      {error && <p className="alert">{error}</p>}

      <CitySearch search={findCities} onSelect={onCitySelect} placeholder={t("citySearch.placeholderManual")} />

      <div className="card-row">
        {times && <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />}
        {settings.coordinates && (
          <QiblaCompass
            bearing={qiblaBearing(settings.coordinates)}
            distanceKm={qiblaDistanceKm(settings.coordinates)}
            heading={heading}
          />
        )}
      </div>

      <section>
        <h2 className="section-title">{t("app.sectionPrayerSettings")}</h2>
        <PrayerSettingsEditor
          methods={CALCULATION_METHODS}
          settings={settings.prayerTimesSettings}
          onChange={onPrayerSettingsChange}
        />
      </section>

      <section>
        <h2 className="section-title">{t("app.sectionQuran")}</h2>
        <SurahList surahs={SURAHS} onSelect={onSurahSelect} selectedSurah={selectedSurahNumber ?? undefined} />
        {selectedSurah && selectedSurahVerses && <QuranReader surah={selectedSurah} verses={selectedSurahVerses} />}
      </section>

      <AzkarList category={MORNING_EVENING_AZKAR} />

      <section>
        <h2 className="section-title">{t("app.sectionAzkarSettings")}</h2>
        <AzkarScheduleEditor
          categories={AZKAR_CATEGORIES}
          schedules={settings.azkarSchedules}
          onChange={onSchedulesChange}
        />
      </section>
    </main>
  );
}
