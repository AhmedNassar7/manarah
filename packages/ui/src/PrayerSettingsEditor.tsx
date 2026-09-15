import type { AsrSchool, CalculationMethodId, PrayerTimesSettings } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface CalculationMethodOption {
  id: CalculationMethodId;
  /** English fallback, used only if a translation is somehow missing for this id. */
  label: string;
}

export interface PrayerSettingsEditorProps {
  methods: CalculationMethodOption[];
  settings: PrayerTimesSettings;
  onChange: (settings: PrayerTimesSettings) => void;
}

const ASR_SCHOOLS: AsrSchool[] = ["Standard", "Hanafi"];

/**
 * Lets a user pick which calculation method and Asr school their prayer
 * times are computed with — every reference prayer-times app (Athan,
 * Pillars, Muslim Pro) treats this as a first-class setting since the
 * right choice depends on region/madhab, not something an app should
 * silently assume. Fully controlled, like AzkarScheduleEditor: holds no
 * state itself, just renders `settings` and reports the next value.
 */
export function PrayerSettingsEditor({ methods, settings, onChange }: PrayerSettingsEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="prayer-settings-editor">
      <label htmlFor="prayer-settings-method">
        <span>{t("prayerSettings.calculationMethod")}</span>
        <select
          id="prayer-settings-method"
          value={settings.method}
          onChange={(event) => onChange({ ...settings, method: event.target.value as CalculationMethodId })}
        >
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {t(`calculationMethod.${method.id}`)}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="prayer-settings-asr">
        <span>{t("prayerSettings.asrCalculation")}</span>
        <select
          id="prayer-settings-asr"
          value={settings.asrSchool}
          onChange={(event) => onChange({ ...settings, asrSchool: event.target.value as AsrSchool })}
        >
          {ASR_SCHOOLS.map((school) => (
            <option key={school} value={school}>
              {t(`prayerSettings.asr${school}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
