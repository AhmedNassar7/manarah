import { useState } from "react";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface AzkarVoiceChoice {
  id: string;
  name: string;
  /** Where the recording is served from. */
  src: string;
}

export interface AzkarVoicePlayerProps {
  /** The reciters who have a recording of this list. Nothing to show when there are none. */
  choices: AzkarVoiceChoice[];
  /** Which reciter was chosen last time (kept by the caller, per device). */
  initialId?: string;
  onChoose?: (id: string) => void;
}

/**
 * "Listen to the whole list": the morning or evening azkar read start to finish by a reciter the
 * person picks. A plain audio control (play, seek, time) — the browser's own, so it is accessible
 * and familiar — and, when more than one reciter has recorded this list, a row to choose between
 * them. Nothing is downloaded until play is pressed.
 */
export function AzkarVoicePlayer({ choices, initialId, onChoose }: AzkarVoicePlayerProps) {
  const { t, language } = useTranslation();
  const [chosenId, setChosenId] = useState(initialId);

  if (choices.length === 0) return null;
  const chosen = choices.find((c) => c.id === chosenId) ?? choices[0];

  return (
    <section className="azkar-voice" aria-label={t("azkarVoice.title")} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <h3>
        <Icon name="sound-on" size={20} /> {t("azkarVoice.title")}
      </h3>
      {choices.length > 1 && (
        <div className="azkar-voice-choices" role="radiogroup" aria-label={t("azkarVoice.reciter")}>
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === chosen.id}
              className="azkar-voice-choice"
              onClick={() => {
                setChosenId(c.id);
                onChoose?.(c.id);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {choices.length === 1 && <p className="azkar-voice-name">{chosen.name}</p>}
      {/* Keyed so choosing another reciter loads his recording rather than carrying on with the old one. */}
      <audio key={chosen.id} className="azkar-voice-audio" controls preload="none" src={chosen.src} aria-label={`${t("azkarVoice.title")} — ${chosen.name}`} />
    </section>
  );
}
