export type AzkarTrigger =
  | "morning"
  | "evening"
  | "post-salah"
  | "before-sleep"
  | "waking"
  /** Contextual duas with no fixed daily time (travel, entering a mosque, sneezing, etc.) — shown on demand, not scheduled by default. */
  | "situational"
  | "custom-time";

export interface AzkarItem {
  id: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  repeatCount: number;
  audioUrl?: string;
}

export interface AzkarCategory {
  id: string;
  name: string;
  trigger: AzkarTrigger;
  items: AzkarItem[];
}

export interface AzkarSchedule {
  categoryId: string;
  /** Overrides the category's default trigger; e.g. remapped to a custom time-of-day. */
  trigger: AzkarTrigger;
  /** 24h "HH:mm", required when trigger is "custom-time". */
  customTime?: string;
  muted: boolean;
}

export interface EffectiveAzkarAssignment {
  category: AzkarCategory;
  trigger: AzkarTrigger;
  /** 24h "HH:mm"; only meaningful when trigger is "custom-time". */
  customTime?: string;
}

/**
 * Merges the default Hisn al-Muslim categories with the user's overrides:
 * a muted category is dropped entirely, a scheduled category takes its
 * override trigger (and customTime, for "custom-time"), and everything else
 * keeps its default trigger. Pure and side-effect-free, so the notification
 * scheduler (and any future "what shows in the app right now" UI) can share
 * one source of truth for "what does this category actually do today."
 */
export function applyAzkarSchedules(
  categories: AzkarCategory[],
  schedules: AzkarSchedule[]
): EffectiveAzkarAssignment[] {
  const scheduleByCategoryId = new Map(schedules.map((schedule) => [schedule.categoryId, schedule]));

  const assignments: EffectiveAzkarAssignment[] = [];
  for (const category of categories) {
    const schedule = scheduleByCategoryId.get(category.id);
    if (schedule?.muted) continue;

    assignments.push(
      schedule
        ? { category, trigger: schedule.trigger, customTime: schedule.customTime }
        : { category, trigger: category.trigger }
    );
  }
  return assignments;
}

export function getEffectiveCategoriesForTrigger(
  assignments: EffectiveAzkarAssignment[],
  trigger: AzkarTrigger
): AzkarCategory[] {
  return assignments.filter((a) => a.trigger === trigger).map((a) => a.category);
}
