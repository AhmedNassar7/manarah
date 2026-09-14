import { useEffect, useState } from "react";
import { computePrayerTimes, type DailyPrayerTimes } from "@manarah/core";
import { PrayerCountdown } from "@manarah/ui";

const DEFAULT_SETTINGS = { method: "UmmAlQura" as const, asrSchool: "Standard" as const };

export function App() {
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTimes(
          computePrayerTimes(
            { latitude: position.coords.latitude, longitude: position.coords.longitude },
            new Date(),
            DEFAULT_SETTINGS
          )
        );
      },
      (geoError) => setError(geoError.message)
    );
  }, []);

  return (
    <main>
      <h1>Manarah</h1>
      {error && <p role="alert">{error}</p>}
      {times && <PrayerCountdown todaysTimes={times} />}
    </main>
  );
}
