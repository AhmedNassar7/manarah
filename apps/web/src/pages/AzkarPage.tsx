import type { AzkarSchedule } from "@manarah/core";
import { AZKAR_CATEGORIES, AZKAR_SECTIONS, QURANIC_DUA_CATEGORIES, QURANIC_DUA_SECTION } from "@manarah/data";
import { AzkarBrowser, AzkarScheduleEditor, useTranslation } from "@manarah/ui";

/** What the browser shows: the Hisn al-Muslim sections plus the Quranic duas. (Scheduling a reminder still applies to the Hisn corpus only.) */
const BROWSER_SECTIONS = [...AZKAR_SECTIONS, QURANIC_DUA_SECTION];
const BROWSER_CATEGORIES = [...AZKAR_CATEGORIES, ...QURANIC_DUA_CATEGORIES];

export interface AzkarPageProps {
  azkarSchedules: AzkarSchedule[];
  onSchedulesChange: (schedules: AzkarSchedule[]) => void;
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
  /** A dhikr was completed — for progress. */
  onAzkarCompleted?: () => void;
  /** Today's tallies for every list, and a way to save a list's tallies — so progress survives leaving the page. */
  todaysCounts?: Record<string, Record<string, number>>;
  onCountsChange?: (categoryId: string, counts: Record<string, number>) => void;
}

export function AzkarPage({
  azkarSchedules,
  onSchedulesChange,
  showTranslation,
  onShowTranslationChange,
  onAzkarCompleted,
  todaysCounts,
  onCountsChange,
}: AzkarPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionAzkar")}</h2>
      <AzkarBrowser
        sections={BROWSER_SECTIONS}
        categories={BROWSER_CATEGORIES}
        showTranslation={showTranslation}
        onShowTranslationChange={onShowTranslationChange}
        onItemComplete={onAzkarCompleted}
        todaysCounts={todaysCounts}
        onCountsChange={onCountsChange}
      />

      {/* 132 rows — collapsed by default so it doesn't bury the azkar themselves. */}
      <details className="azkar-settings">
        <summary>{t("app.sectionAzkarSettings")}</summary>
        <AzkarScheduleEditor categories={AZKAR_CATEGORIES} schedules={azkarSchedules} onChange={onSchedulesChange} />
      </details>
    </>
  );
}
