import { useEffect, useState } from "react";
import { TASBIH_DHIKR, TASBIH_TARGETS, currentDhikr, type TasbihDay, type TasbihState } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface TasbihCounterProps {
  state: TasbihState;
  /** Today's totals. */
  today: TasbihDay;
  onTap: () => void;
  onUndo: () => void;
  onReset: () => void;
  onSelectDhikr: (id: string) => void;
  onTarget: (target: number) => void;
  onVibrateChange?: (vibrate: boolean) => void;
  /** Whether this device can vibrate; the switch is only shown when it can. */
  canVibrate?: boolean;
  /** Goes up by one each time a round completes, to play the celebration (a number, so the same event twice still shows). */
  celebration?: number;
}

/** Beads on the ring: the traditional 33. Targets of 99 and 100 simply go round it more than once. */
const BEADS = 33;
const STEP = 360 / BEADS;
const RADIUS = 86;
const BEAD_RADIUS = 7.5;

/**
 * A tasbih you can feel: a ring of 33 beads that turns one bead with every tap,
 * the count in the middle, rounds that complete at the target (33, 99, 100) or
 * no target at all. Beads already counted are filled; the rest are quiet. It is
 * personal and private — the totals are only for the person who counts. The ring
 * is one big button (a thumb-sized target on a phone, the space bar on a keyboard).
 */
export function TasbihCounter({
  state,
  today,
  onTap,
  onUndo,
  onReset,
  onSelectDhikr,
  onTarget,
  onVibrateChange,
  canVibrate = false,
  celebration = 0,
}: TasbihCounterProps) {
  const { t, language } = useTranslation();
  // How many beads the ring has turned. Not saved: it only decides how far the ring has rotated, so it never turns backwards at the end of a round.
  const [ticks, setTicks] = useState(state.count);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (celebration === 0) return;
    setShowDone(true);
    const timeout = window.setTimeout(() => setShowDone(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  const dhikr = currentDhikr(state);
  const free = state.target === 0;
  const counted = Math.min(state.count, BEADS);
  const ariaCount = free ? t("tasbih.countFree", { count: state.count }) : t("tasbih.count", { count: state.count, target: state.target });
  const canUndo = state.last !== null;

  function tap() {
    setTicks((n) => n + 1);
    onTap();
  }

  function undo() {
    setTicks((n) => n - 1);
    onUndo();
  }

  return (
    <section className="tasbih" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="tasbih-chips" role="group" aria-label={t("tasbih.title")}>
        {TASBIH_DHIKR.map((d) => (
          <button key={d.id} type="button" aria-pressed={d.id === state.dhikrId} onClick={() => onSelectDhikr(d.id)}>
            {t(`tasbih.dhikr.${d.id}`)}
          </button>
        ))}
      </div>

      <p className="tasbih-phrase" dir="rtl" lang="ar">
        {dhikr.arabic}
      </p>

      <div className="tasbih-stage">
        <button type="button" className="tasbih-ring" onClick={tap} aria-label={`${t("tasbih.tap")} — ${ariaCount}`}>
          <svg viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">
            {/* The thread. */}
            <circle className="tasbih-thread" r={RADIUS} />
            <g className="tasbih-beads" style={{ transform: `rotate(${-ticks * STEP}deg)` }}>
              {Array.from({ length: BEADS }, (_, i) => {
                const angle = (i * STEP * Math.PI) / 180;
                // Beads already passed the top marker, counted back from the one now at the top.
                const passed = (((ticks - 1 - i) % BEADS) + BEADS) % BEADS;
                const isCounted = passed < counted;
                return (
                  <circle
                    key={i}
                    className={isCounted ? "tasbih-bead counted" : "tasbih-bead"}
                    cx={(RADIUS * Math.sin(angle)).toFixed(2)}
                    cy={(-RADIUS * Math.cos(angle)).toFixed(2)}
                    r={BEAD_RADIUS}
                  />
                );
              })}
            </g>
            {/* The marker at the top: the larger guide bead and its tassel, which stay put while the ring turns. */}
            <g className="tasbih-guide">
              <line x1="0" y1={-RADIUS - 12} x2="0" y2={-RADIUS - 28} />
              <circle cy={-RADIUS - 12} r="10" />
            </g>
          </svg>
          <span className="tasbih-count" dir="ltr">
            <strong>{state.count}</strong>
            <small>{free ? <Icon name="infinity" size={20} /> : `/ ${state.target}`}</small>
          </span>
          {celebration > 0 && <span key={celebration} className="tasbih-glow" aria-hidden="true" />}
        </button>
      </div>

      <p className={showDone ? "tasbih-done show" : "tasbih-done"} role="status">
        {showDone ? t("tasbih.roundDone") : ""}
      </p>

      <div className="tasbih-actions">
        <button type="button" onClick={undo} disabled={!canUndo}>
          <Icon name="undo" size={16} /> {t("tasbih.undo")}
        </button>
        <button type="button" onClick={onReset} disabled={state.count === 0}>
          <Icon name="refresh" size={16} /> {t("tasbih.reset")}
        </button>
      </div>

      <div className="tasbih-targets" role="group" aria-label={t("tasbih.target")}>
        <span>{t("tasbih.target")}</span>
        {TASBIH_TARGETS.map((target) => (
          <button key={target} type="button" aria-pressed={target === state.target} onClick={() => onTarget(target)}>
            {target === 0 ? t("tasbih.target.0") : target}
          </button>
        ))}
      </div>

      <dl className="tasbih-stats">
        <div>
          <dt>{t("tasbih.today")}</dt>
          <dd dir="ltr">{today.taps}</dd>
        </div>
        <div>
          <dt>{t("tasbih.rounds")}</dt>
          <dd dir="ltr">{today.rounds}</dd>
        </div>
        <div>
          <dt>{t("tasbih.lifetime")}</dt>
          <dd dir="ltr">{state.lifetime}</dd>
        </div>
      </dl>

      {canVibrate && onVibrateChange && (
        <label className="tasbih-vibrate">
          <input type="checkbox" checked={state.vibrate} onChange={(event) => onVibrateChange(event.target.checked)} />
          <span>{t("tasbih.vibrate")}</span>
        </label>
      )}

      <p className="tasbih-hint">{t("tasbih.hint")}</p>
    </section>
  );
}
