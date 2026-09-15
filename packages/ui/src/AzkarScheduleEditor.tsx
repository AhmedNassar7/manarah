import type { AzkarCategory, AzkarSchedule, AzkarTrigger } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface AzkarScheduleEditorProps {
  categories: AzkarCategory[];
  schedules: AzkarSchedule[];
  onChange: (schedules: AzkarSchedule[]) => void;
}

const TRIGGER_OPTIONS: AzkarTrigger[] = [
  "morning",
  "evening",
  "post-salah",
  "before-sleep",
  "waking",
  "situational",
  "custom-time",
];

function scheduleFor(categoryId: string, schedules: AzkarSchedule[]): AzkarSchedule | undefined {
  return schedules.find((s) => s.categoryId === categoryId);
}

/**
 * Lets a user mute a category, remap it to a different trigger, or give it a
 * fixed daily time — the UI for packages/core's applyAzkarSchedules. Fully
 * controlled: holds no state itself, just derives each row from `schedules`
 * and calls `onChange` with the next array. A row whose settings exactly
 * match the category's own default (not muted, default trigger, no custom
 * time) is dropped from the array entirely, so `schedules` only ever holds
 * real overrides.
 */
export function AzkarScheduleEditor({ categories, schedules, onChange }: AzkarScheduleEditorProps) {
  const { t } = useTranslation();

  function updateSchedule(category: AzkarCategory, patch: Partial<Omit<AzkarSchedule, "categoryId">>) {
    const current: AzkarSchedule = scheduleFor(category.id, schedules) ?? {
      categoryId: category.id,
      trigger: category.trigger,
      muted: false,
    };
    const merged: AzkarSchedule = { ...current, ...patch };
    const withoutThis = schedules.filter((s) => s.categoryId !== category.id);

    const isDefault = !merged.muted && merged.trigger === category.trigger && !merged.customTime;
    onChange(isDefault ? withoutThis : [...withoutThis, merged]);
  }

  return (
    <div className="azkar-schedule-editor">
      <table>
        <thead>
          <tr>
            <th>{t("azkarSchedule.headerCategory")}</th>
            <th>{t("azkarSchedule.headerMuted")}</th>
            <th>{t("azkarSchedule.headerTrigger")}</th>
            <th>{t("azkarSchedule.headerCustomTime")}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const schedule = scheduleFor(category.id, schedules);
            const trigger = schedule?.trigger ?? category.trigger;
            const muted = schedule?.muted ?? false;

            return (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={t("azkarSchedule.muteLabel", { category: category.name })}
                    checked={muted}
                    onChange={(event) => updateSchedule(category, { muted: event.target.checked })}
                  />
                </td>
                <td>
                  <select
                    aria-label={t("azkarSchedule.triggerLabel", { category: category.name })}
                    value={trigger}
                    disabled={muted}
                    onChange={(event) =>
                      updateSchedule(category, { trigger: event.target.value as AzkarTrigger })
                    }
                  >
                    {TRIGGER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`azkarSchedule.trigger.${option}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {trigger === "custom-time" && !muted && (
                    <input
                      type="time"
                      aria-label={t("azkarSchedule.customTimeLabel", { category: category.name })}
                      value={schedule?.customTime ?? ""}
                      onChange={(event) => updateSchedule(category, { customTime: event.target.value })}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
