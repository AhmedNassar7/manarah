import { useEffect, useState } from "react";
import {
  computePrayerTimes,
  qiblaBearing,
  qiblaDistanceKm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AzkarSchedule,
  type DailyPrayerTimes,
  type UserSettings,
} from "@manarah/core";
import { AZKAR_CATEGORIES, getAzkarCategory, getSurah, getVersesForSurah } from "@manarah/data";
import { IndexedDbStore } from "@manarah/storage";
import { AzkarList, AzkarScheduleEditor, PrayerCountdown, QiblaCompass, QuranReader } from "@manarah/ui";

const AL_FATIHA = getSurah(1)!;
const AL_FATIHA_VERSES = getVersesForSurah(1);
const MORNING_EVENING_AZKAR = getAzkarCategory("27")!;

const store = new IndexedDbStore();

export function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
      if (cancelled) return;
      setSettings(stored);
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

  return (
    <main>
      <h1>Manarah</h1>
      {error && <p role="alert">{error}</p>}
      {times && <PrayerCountdown todaysTimes={times} />}
      {settings.coordinates && (
        <QiblaCompass
          bearing={qiblaBearing(settings.coordinates)}
          distanceKm={qiblaDistanceKm(settings.coordinates)}
          heading={heading}
        />
      )}
      <QuranReader surah={AL_FATIHA} verses={AL_FATIHA_VERSES} />
      <AzkarList category={MORNING_EVENING_AZKAR} />
      <h2>Azkar settings</h2>
      <AzkarScheduleEditor
        categories={AZKAR_CATEGORIES}
        schedules={settings.azkarSchedules}
        onChange={handleSchedulesChange}
      />
    </main>
  );
}
