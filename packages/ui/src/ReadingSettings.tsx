import { READER_FONT_SCALES, clampReaderFontStep, readerFontScale, type Reciter } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface ReadingSettingsProps {
  /** Index into READER_FONT_SCALES. */
  fontStep: number;
  onFontStepChange: (step: number) => void;
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
  reciters: Reciter[];
  reciterId: string;
  onReciterChange: (id: string) => void;
}

/**
 * One collapsed place for the choices the reader and audio player otherwise
 * scatter: text size, translation on/off, and the default reciter. State
 * lives in the caller (persisted user settings), so these controls, the
 * reader's own translation toggle and the player's reciter picker stay in
 * sync rather than each keeping a private copy.
 */
export function ReadingSettings({
  fontStep,
  onFontStepChange,
  showTranslation,
  onShowTranslationChange,
  reciters,
  reciterId,
  onReciterChange,
}: ReadingSettingsProps) {
  const { t, language } = useTranslation();
  const step = clampReaderFontStep(fontStep);
  const lastStep = READER_FONT_SCALES.length - 1;

  return (
    <details className="reading-settings" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <summary>{t("readingSettings.title")}</summary>

      <div className="reading-settings-row">
        <span id="reading-settings-size-label">{t("readingSettings.textSize")}</span>
        <div className="reading-settings-stepper" role="group" aria-labelledby="reading-settings-size-label">
          <button
            type="button"
            aria-label={t("readingSettings.smaller")}
            disabled={step === 0}
            onClick={() => onFontStepChange(step - 1)}
          >
            <Icon name="text-smaller" size={20} />
          </button>
          <output aria-live="polite">{Math.round(readerFontScale(step) * 100)}%</output>
          <button
            type="button"
            aria-label={t("readingSettings.larger")}
            disabled={step === lastStep}
            onClick={() => onFontStepChange(step + 1)}
          >
            <Icon name="text-larger" size={20} />
          </button>
        </div>
      </div>

      <label className="reading-settings-row">
        <span>{t("readingSettings.showTranslation")}</span>
        <input
          type="checkbox"
          checked={showTranslation}
          onChange={(event) => onShowTranslationChange(event.target.checked)}
        />
      </label>

      <label className="reading-settings-row">
        <span>{t("readingSettings.reciter")}</span>
        <select value={reciterId} onChange={(event) => onReciterChange(event.target.value)}>
          {reciters.map((r) => (
            <option key={r.id} value={r.id}>
              {t(`reciter.${r.id}`)}
            </option>
          ))}
        </select>
      </label>
    </details>
  );
}
