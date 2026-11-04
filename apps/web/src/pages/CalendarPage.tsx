import { currentHijriDate, toCalendarDate, type DailyPrayerTimes } from "@manarah/core";
import { HISTORICAL_EVENTS } from "@manarah/data";
import { HijriCalendar, OnThisDay, useTranslation } from "@manarah/ui";

export interface CalendarPageProps {
  times: DailyPrayerTimes | null;
  hijriAdjustment: number;
  onHijriAdjustmentChange: (days: number) => void;
  observanceReminders: boolean;
  onObservanceRemindersChange: (enabled: boolean) => void;
}

/** Today's Maghrib, but only if `times` was computed for today — a tab left open past midnight would otherwise treat yesterday's Maghrib as already passed. */
export function todaysMaghrib(times: DailyPrayerTimes | null, now: Date): Date | undefined {
  if (!times) return undefined;
  const m = times.maghrib;
  const sameDay = m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth() && m.getDate() === now.getDate();
  return sameDay ? m : undefined;
}

/** The Hijri calendar route. */
export function CalendarPage({
  times,
  hijriAdjustment,
  onHijriAdjustmentChange,
  observanceReminders,
  onObservanceRemindersChange,
}: CalendarPageProps) {
  const { t } = useTranslation();
  const now = new Date();

  return (
    <>
      <h2 className="section-title">{t("app.sectionCalendar")}</h2>
      <HijriCalendar
        today={currentHijriDate(now, { maghrib: todaysMaghrib(times, now), adjustment: hijriAdjustment })}
        todayCivil={toCalendarDate(now)}
        adjustment={hijriAdjustment}
        onAdjustmentChange={onHijriAdjustmentChange}
        remindersEnabled={observanceReminders}
        onRemindersChange={onObservanceRemindersChange}
        aside={<OnThisDay events={HISTORICAL_EVENTS} todayCivil={toCalendarDate(now)} adjustment={hijriAdjustment} />}
      />
    </>
  );
}
