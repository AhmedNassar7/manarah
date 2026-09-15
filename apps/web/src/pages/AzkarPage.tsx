import type { AzkarSchedule } from "@manarah/core";
import { AZKAR_CATEGORIES, getAzkarCategory } from "@manarah/data";
import { AzkarList, AzkarScheduleEditor, useTranslation } from "@manarah/ui";

const MORNING_EVENING_AZKAR = getAzkarCategory("27")!;

export interface AzkarPageProps {
  azkarSchedules: AzkarSchedule[];
  onSchedulesChange: (schedules: AzkarSchedule[]) => void;
}

export function AzkarPage({ azkarSchedules, onSchedulesChange }: AzkarPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionAzkar")}</h2>
      <AzkarList category={MORNING_EVENING_AZKAR} />

      <section>
        <h2 className="section-title">{t("app.sectionAzkarSettings")}</h2>
        <AzkarScheduleEditor categories={AZKAR_CATEGORIES} schedules={azkarSchedules} onChange={onSchedulesChange} />
      </section>
    </>
  );
}
