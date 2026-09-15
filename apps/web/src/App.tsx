import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AzkarSchedule,
  type City,
  type DailyPrayerTimes,
  type UserSettings,
  type Verse,
} from "@manarah/core";
import { AZKAR_CATEGORIES, findCities, getAzkarCategory, getSurah, getVersesForSurah, SURAHS } from "@manarah/data";
import { IndexedDbStore } from "@manarah/storage";
import {
  AzkarList,
  AzkarScheduleEditor,
  CitySearch,
  PrayerCountdown,
  QiblaCompass,
  QuranReader,
  SurahList,
} from "@manarah/ui";

const MORNING_EVENING_AZKAR = getAzkarCategory("27")!;

const store = new IndexedDbStore();

export function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [selectedSurahVerses, setSelectedSurahVerses] = useState<Verse[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
      if (cancelled) return;
      setSettings(stored);
      // Resume wherever the user last left off, rather than always starting at Al-Fatiha.
      setSelectedSurahNumber(stored.lastRead?.surah ?? 1);
      if (stored.coordinates) {
        setTimes(computePrayerTimes(stored.coordinates, new Date(), stored.prayerTimesSettings));
      }

      if (!("geolocation" in navigator)) {
        if (!stored.coordinates) setError("Geolocation is not available in this browser.");
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

  function handleCitySelect(city: City) {
    const coordinates = { latitude: city.latitude, longitude: city.longitude };
    setSettings((prev) => {
      const next = { ...prev, coordinates };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
    setError(null);
    setTimes(computePrayerTimes(coordinates, new Date(), settings.prayerTimesSettings));
  }

  function handleSurahSelect(surahNumber: number) {
    setSelectedSurahNumber(surahNumber);
    setSettings((prev) => {
      const next = { ...prev, lastRead: { surah: surahNumber, ayah: 1 } };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  const selectedSurah = selectedSurahNumber !== null ? getSurah(selectedSurahNumber) : undefined;

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Manarah</h1>
        <span className="tagline">منارة — prayer, azkar, Qur'an, and Qibla</span>
      </header>

      {error && <p className="alert">{error}</p>}

      <CitySearch search={findCities} onSelect={handleCitySelect} placeholder="Set location manually…" />

      <div className="card-row">
        {times && <PrayerCountdown todaysTimes={times} />}
        {settings.coordinates && (
          <QiblaCompass
            bearing={qiblaBearing(settings.coordinates)}
            distanceKm={qiblaDistanceKm(settings.coordinates)}
            heading={heading}
          />
        )}
      </div>

      <section>
        <h2 className="section-title">Quran</h2>
        <SurahList surahs={SURAHS} onSelect={handleSurahSelect} selectedSurah={selectedSurahNumber ?? undefined} />
        {selectedSurah && selectedSurahVerses && <QuranReader surah={selectedSurah} verses={selectedSurahVerses} />}
      </section>

      <AzkarList category={MORNING_EVENING_AZKAR} />

      <section>
        <h2 className="section-title">Azkar settings</h2>
        <AzkarScheduleEditor
          categories={AZKAR_CATEGORIES}
          schedules={settings.azkarSchedules}
          onChange={handleSchedulesChange}
        />
      </section>
    </main>
  );
}
