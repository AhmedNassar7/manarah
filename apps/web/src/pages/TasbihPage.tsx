import { useState } from "react";
import { resetTasbih, selectDhikr, setTarget, setVibrate, tapTasbih, todaysTasbih, undoTasbih, type TasbihState } from "@manarah/core";
import { TasbihCounter, useTranslation } from "@manarah/ui";

export interface TasbihPageProps {
  state: TasbihState;
  onChange: (state: TasbihState) => void;
  /** A round was completed — for progress. */
  onRoundCompleted: () => void;
}

const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/** The tasbih: the counter, with the device's small vibration (if it has one and it is on) on each bead and a longer one at the end of a round. */
export function TasbihPage({ state, onChange, onRoundCompleted }: TasbihPageProps) {
  const { t } = useTranslation();
  const [celebration, setCelebration] = useState(0);

  function vibrate(pattern: number | number[]) {
    if (canVibrate && state.vibrate) navigator.vibrate(pattern);
  }

  function tap() {
    const result = tapTasbih(state, new Date());
    onChange(result.state);
    if (result.roundCompleted) {
      vibrate([30, 50, 30]);
      setCelebration((n) => n + 1);
      onRoundCompleted();
    } else {
      vibrate(8);
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
        onTarget={(target) => onChange(setTarget(state, target))}
        onVibrateChange={(on) => onChange(setVibrate(state, on))}
        canVibrate={canVibrate}
        celebration={celebration}
      />
    </>
  );
}
