import { currentHijriDate, type Coordinates, type DailyPrayerTimes, type PrayerTimesSettings } from "@manarah/core";
import { todaysMaghrib } from "./CalendarPage.js";
import { CALCULATION_METHODS } from "@manarah/data";
import {
  LocationSummary,
  PrayerHero,
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
  hijriAdjustment: number;
}

export function PrayerPage({
  locationSummary,
  coordinates,
  times,
  tomorrowsFajr,
  prayerTimesSettings,
  onPrayerSettingsChange,
  hijriAdjustment,
}: PrayerPageProps) {
  const { t } = useTranslation();
  const now = new Date();

  return (
    <>
      <h2 className="section-title">{t("app.sectionPrayer")}</h2>
      {/* Always shown — the saved location is what every time below is computed for. */}
      <LocationSummary {...locationSummary} />
      {coordinates && (
        <div className="page-split">
          {times && (
            <div className="card-stack">
              <PrayerHero
                todaysTimes={times}
                tomorrowsFajr={tomorrowsFajr ?? undefined}
                hijri={currentHijriDate(now, { maghrib: todaysMaghrib(times, now), adjustment: hijriAdjustment })}
              />
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
