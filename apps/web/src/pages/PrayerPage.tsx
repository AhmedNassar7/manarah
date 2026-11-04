import type { Coordinates, DailyPrayerTimes, PrayerTimesSettings } from "@manarah/core";
import { CALCULATION_METHODS } from "@manarah/data";
import {
  LocationSummary,
  PrayerCountdown,
  PrayerSettingsEditor,
  PrayerTimesList,
  useTranslation,
  type LocationSummaryProps,
} from "@manarah/ui";

export interface PrayerPageProps {
  locationSummary: LocationSummaryProps;
  coordinates: Coordinates | undefined;
  times: DailyPrayerTimes | null;
  tomorrowsFajr: Date | null;
  prayerTimesSettings: PrayerTimesSettings;
  onPrayerSettingsChange: (settings: PrayerTimesSettings) => void;
}

export function PrayerPage({
  locationSummary,
  coordinates,
  times,
  tomorrowsFajr,
  prayerTimesSettings,
  onPrayerSettingsChange,
}: PrayerPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionPrayer")}</h2>
      {/* Always shown — the saved location is what every time below is computed for. */}
      <LocationSummary {...locationSummary} />
      {coordinates && (
        <div className="page-split">
          {times && (
            <div className="card-stack">
              <PrayerCountdown todaysTimes={times} tomorrowsFajr={tomorrowsFajr ?? undefined} />
              <PrayerTimesList todaysTimes={times} />
            </div>
          )}

          <section>
            <h2 className="section-title">{t("app.sectionPrayerSettings")}</h2>
            <PrayerSettingsEditor
              methods={CALCULATION_METHODS}
              settings={prayerTimesSettings}
              onChange={onPrayerSettingsChange}
            />
          </section>
        </div>
      )}
    </>
  );
}
