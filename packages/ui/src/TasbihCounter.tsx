import { useEffect, useId, useState } from "react";
import { TASBIH_DHIKR, TASBIH_TARGETS, TASBIH_THEMES, currentDhikr, type TasbihDay, type TasbihState } from "@manarah/core";
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
  /** Turns the bead sound on or off. The control is shown when this is given. */
  onSoundChange?: (sound: boolean) => void;
  /** Chooses what the beads are made of. The picker is shown when this is given. */
  onThemeChange?: (theme: string) => void;
  /** Goes up by one each time a round completes, to play the celebration (a number, so the same event twice still shows). */
  celebration?: number;
}

/** Beads on the ring: the traditional 33. Targets of 99 and 100 simply go round it more than once. */
const BEADS = 33;
const STEP = 360 / BEADS;
const RADIUS = 78;
const BEAD_RADIUS = 8.2;

/**
 * A tasbih you can feel and see: a ring of 33 shaded beads on a cord that turns one
 * bead with every tap, the count in the middle, a guide bead with its spacer beads and
 * a tassel at the top. The beads are made of something — olive wood, amber, pearl,
 * emerald, turquoise, onyx — and the picker changes the look (and, with sound on, the
 * knock) of all of it. Beads already counted are full colour, the rest a little
 * quieter. The ring is one big button: a thumb-sized target on a phone, the space bar
 * on a keyboard. It is personal and private — the totals are only for the person who counts.
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
  onSoundChange,
  onThemeChange,
  celebration = 0,
}: TasbihCounterProps) {
  const { t, language } = useTranslation();
  // How many beads the ring has turned. Not saved: it only decides how far the ring has rotated, so it never turns backwards at the end of a round.
  const [ticks, setTicks] = useState(state.count);
  const [showDone, setShowDone] = useState(false);
  const gradientId = `tasbih-bead-${useId().replace(/:/g, "")}`;
  const guideId = `${gradientId}-guide`;

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
  const ringTurn = `rotate(${-ticks * STEP}deg)`;
  const faceTurn = `rotate(${ticks * STEP}deg)`;

  function tap() {
    setTicks((n) => n + 1);
    onTap();
  }

  function undo() {
    setTicks((n) => n - 1);
    onUndo();
  }

  return (
    <section className="tasbih" data-tasbih-theme={state.theme} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
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
            <defs>
              {/* Light from the top left: bright where it catches, dark where it turns away. The colours come from the chosen material. */}
              <radialGradient id={gradientId} cx="0.34" cy="0.3" r="0.8">
                <stop offset="0" style={{ stopColor: "var(--bead-hi)" }} />
                <stop offset="0.5" style={{ stopColor: "var(--bead-mid)" }} />
                <stop offset="1" style={{ stopColor: "var(--bead-lo)" }} />
              </radialGradient>
              <radialGradient id={guideId} cx="0.34" cy="0.3" r="0.8">
                <stop offset="0" style={{ stopColor: "var(--guide-hi)" }} />
                <stop offset="0.55" style={{ stopColor: "var(--guide-mid)" }} />
                <stop offset="1" style={{ stopColor: "var(--guide-lo)" }} />
              </radialGradient>
            </defs>

            {/* The cord the beads are strung on, and the short length that carries the guide bead and tassel. */}
            <circle className="tasbih-cord" r={RADIUS} />
            <line className="tasbih-cord" x1="0" y1={-RADIUS} x2="0" y2="-97" />

            <g className="tasbih-beads" style={{ transform: ringTurn }}>
              {Array.from({ length: BEADS }, (_, i) => {
                const angle = (i * STEP * Math.PI) / 180;
                // Beads already passed the top marker, counted back from the one now at the top.
                const passed = (((ticks - 1 - i) % BEADS) + BEADS) % BEADS;
                const isCounted = passed < counted;
                return (
                  <g
                    key={i}
                    className={isCounted ? "tasbih-bead counted" : "tasbih-bead"}
                    transform={`translate(${(RADIUS * Math.sin(angle)).toFixed(2)} ${(-RADIUS * Math.cos(angle)).toFixed(2)})`}
                  >
                    {/* Turned back as far as the ring turns, so the light always comes from the same side. */}
                    <g className="tasbih-bead-face" style={{ transform: faceTurn }}>
                      <circle className="tasbih-bead-shadow" cx="0.9" cy="1.7" r={BEAD_RADIUS} />
                      <circle className="tasbih-bead-body" r={BEAD_RADIUS} fill={`url(#${gradientId})`} />
                      <ellipse className="tasbih-bead-spec" cx="-2.6" cy="-3.1" rx="2.5" ry="1.5" transform="rotate(-35 -2.6 -3.1)" />
                    </g>
                  </g>
                );
              })}
            </g>

            {/* The guide bead (the imam) with a small bead either side, and the tassel: they stay put while the ring turns. */}
            <g className="tasbih-guide">
              <circle className="tasbih-spacer" cx="0" cy="-86" r="3.6" fill={`url(#${gradientId})`} />
              <circle className="tasbih-spacer" cx="0" cy="-92" r="3.6" fill={`url(#${gradientId})`} />
              <ellipse className="tasbih-imam" cx="0" cy="-103" rx="8.5" ry="11" fill={`url(#${guideId})`} />
              <ellipse className="tasbih-bead-spec" cx="-2.8" cy="-107" rx="2.4" ry="3.4" transform="rotate(-18 -2.8 -107)" />
              <line className="tasbih-cord" x1="0" y1="-114" x2="0" y2="-124" />
              <circle className="tasbih-knot" cx="0" cy="-126" r="4.6" />
              <g className="tasbih-fringe">
                {[-11, -7.5, -4, -1.3, 1.3, 4, 7.5, 11].map((x) => (
                  <path key={x} d={`M ${x * 0.28} -129 Q ${x * 0.7} -141 ${x} -154`} />
                ))}
              </g>
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
        {onSoundChange && (
          <button type="button" className="tasbih-sound" aria-pressed={state.sound} onClick={() => onSoundChange(!state.sound)}>
            <Icon name={state.sound ? "sound-on" : "sound-off"} size={16} /> {t("tasbih.sound")}
          </button>
        )}
      </div>

      <div className="tasbih-targets" role="group" aria-label={t("tasbih.target")}>
        <span>{t("tasbih.target")}</span>
        {TASBIH_TARGETS.map((target) => (
          <button key={target} type="button" aria-pressed={target === state.target} onClick={() => onTarget(target)}>
            {target === 0 ? t("tasbih.target.0") : target}
          </button>
        ))}
      </div>

      {onThemeChange && (
        <div className="tasbih-themes" role="radiogroup" aria-label={t("tasbih.themeLabel")}>
          {TASBIH_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={theme.id === state.theme}
              data-tasbih-theme={theme.id}
              onClick={() => onThemeChange(theme.id)}
            >
              <span className="tasbih-swatch" aria-hidden="true" />
              <span>{t(`tasbih.theme.${theme.id}`)}</span>
            </button>
          ))}
        </div>
      )}

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
