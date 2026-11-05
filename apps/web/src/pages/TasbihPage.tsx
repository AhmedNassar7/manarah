import { useEffect, useRef, useState } from "react";
import { resetTasbih, selectDhikr, setSound, setTasbihTheme, tapTasbih, todaysTasbih, undoTasbih, type TasbihSoundId, type TasbihState } from "@manarah/core";
import { virtuesForTasbih } from "@manarah/data";
import { TasbihCounter, createTasbihSound, useTranslation, type TasbihSound } from "@manarah/ui";

export interface TasbihPageProps {
  state: TasbihState;
  onChange: (state: TasbihState) => void;
  /** A full turn of the ring (every 33) was reached — for progress. */
  onMilestone: () => void;
}

/**
 * The tasbih: the counter and — only if the person has chosen a sound — a soft sound for each
 * bead and a small bell at every full turn of the ring. No vibration: it was not wanted.
 */
export function TasbihPage({ state, onChange, onMilestone }: TasbihPageProps) {
  const { t } = useTranslation();
  const [celebration, setCelebration] = useState(0);
  const sound = useRef<TasbihSound | null>(null);

  // The audio context is created on the first sound (inside a tap) and released when the page closes.
  const engine = () => (sound.current ??= createTasbihSound());
  useEffect(
    () => () => {
      sound.current?.dispose();
      sound.current = null;
    },
    [],
  );

  function tap() {
    const result = tapTasbih(state, new Date());
    onChange(result.state);
    if (result.milestone) {
      if (state.sound !== "off") engine().milestone();
      setCelebration((n) => n + 1);
      onMilestone();
    } else if (state.sound !== "off") {
      engine().bead(state.sound);
    }
  }

  function chooseSound(choice: TasbihSoundId) {
    onChange(setSound(state, choice));
    // Choosing one plays a single bead, so you hear what you chose.
    if (choice !== "off") engine().bead(choice);
  }

  return (
    <>
      <h2 className="section-title">{t("app.sectionTasbih")}</h2>
      <TasbihCounter
        state={state}
        today={todaysTasbih(state, new Date())}
        onTap={tap}
        onUndo={() => onChange(undoTasbih(state, new Date()))}
        onReset={() => onChange(resetTasbih(state))}
        onSelectDhikr={(id) => onChange(selectDhikr(state, id))}
        onSoundChange={chooseSound}
        onThemeChange={(theme) => onChange(setTasbihTheme(state, theme))}
        virtues={virtuesForTasbih(state.dhikrId)}
        celebration={celebration}
      />
    </>
  );
}
