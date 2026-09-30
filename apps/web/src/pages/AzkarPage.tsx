import type { AzkarSchedule } from "@manarah/core";
import { AZKAR_CATEGORIES, AZKAR_SECTIONS } from "@manarah/data";
import { AzkarBrowser, AzkarScheduleEditor, useTranslation } from "@manarah/ui";

export interface AzkarPageProps {
  azkarSchedules: AzkarSchedule[];
  onSchedulesChange: (schedules: AzkarSchedule[]) => void;
}

export function AzkarPage({ azkarSchedules, onSchedulesChange }: AzkarPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionAzkar")}</h2>
      <AzkarBrowser sections={AZKAR_SECTIONS} categories={AZKAR_CATEGORIES} />

      {/* 132 rows — collapsed by default so it doesn't bury the azkar themselves. */}
      <details className="azkar-settings">
        <summary>{t("app.sectionAzkarSettings")}</summary>
        <AzkarScheduleEditor categories={AZKAR_CATEGORIES} schedules={azkarSchedules} onChange={onSchedulesChange} />
      </details>
    </>
  );
}
