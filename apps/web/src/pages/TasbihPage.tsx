import { useEffect, useRef, useState } from "react";
import {
  currentTimbre,
  resetTasbih,
  selectDhikr,
  setSound,
  setTasbihTheme,
  setVibrate,
  tapTasbih,
  todaysTasbih,
  undoTasbih,
  type TasbihState,
} from "@manarah/core";
import { virtuesForTasbih } from "@manarah/data";
import { TasbihCounter, createTasbihSound, useTranslation, type TasbihSound } from "@manarah/ui";

export interface TasbihPageProps {
  state: TasbihState;
  onChange: (state: TasbihState) => void;
  /** A round was completed — for progress. */
  onRoundCompleted: () => void;
}

const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * The tasbih: the counter, with the device's small vibration (if it has one and it is on),
 * and — only if the person has turned sound on — a knock for each bead in the sound of the
 * beads' material and a chime when a round is complete.
 */
export function TasbihPage({ state, onChange, onRoundCompleted }: TasbihPageProps) {
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

  function vibrate(pattern: number | number[]) {
    if (canVibrate && state.vibrate) navigator.vibrate(pattern);
  }

  function tap() {
    const result = tapTasbih(state, new Date());
    onChange(result.state);
    if (result.roundCompleted) {
      vibrate([30, 50, 30]);
      if (state.sound) engine().round();
      setCelebration((n) => n + 1);
      onRoundCompleted();
    } else {
      vibrate(8);
      if (state.sound) engine().bead(currentTimbre(state));
    }
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
        onVibrateChange={(on) => onChange(setVibrate(state, on))}
        canVibrate={canVibrate}
        onSoundChange={(on) => {
          onChange(setSound(state, on));
          // Turning it on plays one bead, so you hear what you chose.
          if (on) engine().bead(currentTimbre(state));
        }}
        onThemeChange={(theme) => {
          const next = setTasbihTheme(state, theme);
          onChange(next);
          if (state.sound) engine().bead(currentTimbre(next));
        }}
        virtues={virtuesForTasbih(state.dhikrId)}
        celebration={celebration}
      />
    </>
  );
}
