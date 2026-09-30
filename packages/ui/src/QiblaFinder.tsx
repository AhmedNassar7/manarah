import { useRef } from "react";
import { compassPoint, qiblaTurn } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface QiblaFinderProps {
  /** Degrees from true north to the Kaaba (core's qiblaBearing). */
  bearing: number;
  /** Great-circle distance to the Kaaba in km (core's qiblaDistanceKm). */
  distanceKm: number;
  /** Live device heading in degrees from true north, when a compass sensor is reporting. */
  heading?: number;
  /**
   * Shown as an "Enable live compass" button while there's no heading —
   * iOS only delivers orientation events after an explicit, tap-triggered
   * permission request. Omit where no such request is needed or possible.
   */
  onEnableLiveCompass?: () => void;
}

/** Within this many degrees of the Qibla counts as "facing it" — same threshold as QiblaCompass's lock. */
const FACING_TOLERANCE_DEGREES = 3;

const CENTER = 100;
const RIM_RADIUS = 92;
const MARKER_RADIUS = 70;

/**
 * Returns `target` adjusted by whole turns so it's the closest value to the
 * previous one — lets the CSS transition take the short way round instead
 * of spinning a full circle when the heading crosses 359° → 0°.
 */
function useContinuousAngle(target: number): number {
  const previous = useRef(target);
  const delta = ((((target - previous.current) % 360) + 540) % 360) - 180;
  const next = previous.current + delta;
  previous.current = next;
  return next;
}

function pointOnRim(degrees: number, radius: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) };
}

function formatDistance(distanceKm: number, unit: string): string {
  const value = distanceKm < 10 ? distanceKm.toFixed(2) : Math.round(distanceKm).toLocaleString();
  return `${value} ${unit}`;
}

/**
 * The Qibla page's full-size finder: a compass rose with the Kaaba marked on
 * its rim, and one plain instruction above it.
 *
 * With a live heading the rose turns with the device (north stays real
 * north) under a fixed "you are facing" pointer, and the instruction says
 * which way to turn and by how much until the 🕋 reaches the pointer. With
 * no sensor (desktop, most laptops) the rose sits north-up and the
 * instruction gives the direction in degrees and plain words instead.
 */
export function QiblaFinder({ bearing, distanceKm, heading, onEnableLiveCompass }: QiblaFinderProps) {
  const { t } = useTranslation();
  const live = heading !== undefined;
  const turn = live ? qiblaTurn(bearing, heading, FACING_TOLERANCE_DEGREES) : undefined;
  const facing = turn?.direction === "none";
  const roseRotation = useContinuousAngle(live ? -heading : 0);
  const roundedBearing = Math.round(bearing) % 360;
  const direction = t(`compass.${compassPoint(bearing)}`);
  const marker = pointOnRim(bearing, MARKER_RADIUS);

  let instruction: string;
  if (!live) instruction = t("qiblaFinder.faceDirection", { deg: roundedBearing, direction });
  else if (facing) instruction = t("qiblaFinder.facing");
  else if (turn!.direction === "right") instruction = t("qiblaFinder.turnRight", { deg: turn!.degrees });
  else instruction = t("qiblaFinder.turnLeft", { deg: turn!.degrees });

  return (
    <section className={`qibla-finder${facing ? " qibla-finder-facing" : ""}${live ? " qibla-finder-live" : ""}`}>
      <p className="qibla-finder-instruction" aria-live="polite">
        {live && !facing && (
          <span className="qibla-finder-turn-icon" aria-hidden="true">
            {turn!.direction === "right" ? "↻" : "↺"}
          </span>
        )}
        {instruction}
      </p>

      <div className="qibla-finder-dial-wrap">
        {live && <span className="qibla-finder-pointer" aria-hidden="true" />}
        <svg
          className="qibla-finder-dial"
          viewBox="0 0 200 200"
          role="img"
          aria-label={t("qiblaFinder.ariaDial", { deg: roundedBearing, direction })}
        >
          <circle className="qibla-finder-face" cx={CENTER} cy={CENTER} r={RIM_RADIUS + 4} />
          <g className="qibla-finder-rose" style={{ transform: `rotate(${roseRotation}deg)` }}>
            {Array.from({ length: 72 }, (_, i) => {
              const deg = i * 5;
              const major = deg % 90 === 0;
              const medium = deg % 30 === 0;
              const outer = pointOnRim(deg, RIM_RADIUS);
              const inner = pointOnRim(deg, RIM_RADIUS - (major ? 12 : medium ? 8 : 4));
              return (
                <line
                  key={deg}
                  className={major ? "qibla-finder-tick-major" : "qibla-finder-tick"}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                />
              );
            })}
            {(["N", "E", "S", "W"] as const).map((point, i) => {
              const p = pointOnRim(i * 90, RIM_RADIUS - 24);
              return (
                <text
                  key={point}
                  className={point === "N" ? "qibla-finder-letter qibla-finder-north" : "qibla-finder-letter"}
                  x={p.x}
                  y={p.y}
                >
                  {t(`compass.letter.${point}`)}
                </text>
              );
            })}
            <line className="qibla-finder-line" x1={CENTER} y1={CENTER} x2={marker.x} y2={marker.y} />
            <circle className="qibla-finder-marker-bg" cx={marker.x} cy={marker.y} r={15} />
            <text className="qibla-finder-kaaba" x={marker.x} y={marker.y}>
              🕋
            </text>
          </g>
          <circle className="qibla-finder-hub" cx={CENTER} cy={CENTER} r={5} />
          {facing && <circle className="qibla-finder-ripple" cx={CENTER} cy={CENTER} r={RIM_RADIUS} />}
        </svg>
      </div>

      <dl className="qibla-finder-facts">
        <div>
          <dt>{t("qiblaFinder.bearingLabel")}</dt>
          <dd>{t("qibla.fromNorth", { deg: roundedBearing })}</dd>
        </div>
        <div>
          <dt>{t("qiblaFinder.distanceLabel")}</dt>
          <dd>{formatDistance(distanceKm, t("qibla.distanceUnit"))}</dd>
        </div>
      </dl>

      {!live && (
        <div className="qibla-finder-help">
          <p>{t("qiblaFinder.staticHint")}</p>
          {onEnableLiveCompass && (
            <button type="button" className="qibla-finder-enable" onClick={onEnableLiveCompass}>
              {t("qiblaFinder.enableLive")}
            </button>
          )}
        </div>
      )}
      {live && !facing && <p className="qibla-finder-hint">{t("qiblaFinder.liveHint")}</p>}
    </section>
  );
}
