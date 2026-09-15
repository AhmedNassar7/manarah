import type { Coordinates, DailyPrayerTimes, PrayerTimesSettings } from "@manarah/core";
import { CALCULATION_METHODS } from "@manarah/data";
import { PrayerCountdown, PrayerSettingsEditor, useTranslation } from "@manarah/ui";
import { LocationPrompt } from "../LocationPrompt.js";

export interface PrayerPageProps {
  coordinates: Coordinates | undefined;
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  prayerTimesSettings: PrayerTimesSettings;
  onPrayerSettingsChange: (settings: PrayerTimesSettings) => void;
}

export function PrayerPage({ coordinates, times, tomorrowsFajr, prayerTimesSettings, onPrayerSettingsChange }: PrayerPageProps) {
  const { t } = useTranslation();

  if (!coordinates) return <LocationPrompt />;

  return (
    <>
      <h2 className="section-title">{t("app.sectionPrayer")}</h2>
      {times && <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />}

      <section>
        <h2 className="section-title">{t("app.sectionPrayerSettings")}</h2>
        <PrayerSettingsEditor methods={CALCULATION_METHODS} settings={prayerTimesSettings} onChange={onPrayerSettingsChange} />
      </section>
    </>
  );
}
