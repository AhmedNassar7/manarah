import { useTranslation } from "./i18n/index.js";

export interface QiblaCompassProps {
  /** Degrees from true north to the Kaaba, 0-360 (from core's qiblaBearing). */
  bearing: number;
  /** Great-circle distance to the Kaaba in kilometers (from core's qiblaDistanceKm). */
  distanceKm: number;
  /**
   * The device's current compass heading in degrees from true north, if a
   * live sensor reading is available (DeviceOrientationEvent). When omitted,
   * renders a static "north-up" compass — the fallback for desktop/extension
   * where no orientation sensor exists.
   */
  heading?: number;
}

/** How close the arrow must be to "straight ahead" to count as locked onto the Kaaba. */
const LOCK_THRESHOLD_DEGREES = 3;

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function angularDistanceFromZero(degrees: number): number {
  return Math.min(degrees, 360 - degrees);
}

function formatDistance(distanceKm: number, unit: string): string {
  const value = distanceKm < 10 ? distanceKm.toFixed(2) : String(Math.round(distanceKm));
  return `${value} ${unit}`;
}

/**
 * Points an arrow toward the Kaaba. With a live `heading`, the arrow rotates
 * relative to the device's actual facing direction (a real usable compass on
 * mobile); without one, it rotates directly by `bearing` against a fixed
 * north-up dial — the correct fallback wherever there's no orientation
 * sensor (desktop, the extension popup).
 *
 * "Locked" (arrow pointing within a few degrees of straight ahead) only
 * makes sense with a live heading — a static dial has no "am I facing it"
 * concept to lock onto. The ripple is a one-time moment per lock: it
 * unmounts (and its animation stops) the instant the heading drifts back
 * off, and replays fresh each time the heading re-settles, rather than
 * looping or staying on as a permanent badge.
 */
export function QiblaCompass({ bearing, distanceKm, heading }: QiblaCompassProps) {
  const { t } = useTranslation();
  const rotation = normalizeDegrees(heading === undefined ? bearing : bearing - heading);
  const roundedBearing = Math.round(normalizeDegrees(bearing));
  const isLocked = heading !== undefined && angularDistanceFromZero(rotation) < LOCK_THRESHOLD_DEGREES;
  const isSearching = heading !== undefined && !isLocked;
  const distance = formatDistance(distanceKm, t("qibla.distanceUnit"));

  return (
    <div className={`qibla-compass card${isLocked ? " qibla-compass-locked" : ""}`}>
      <div className="qibla-compass-frame">
        {/* Fixed — doesn't rotate with the dial. Marks "straight ahead" so a
            live heading has something to visibly line the needle up against;
            meaningless in static north-up mode, so omitted there. */}
        {heading !== undefined && <span className="qibla-compass-facing-tick" aria-hidden="true" />}
        <div
          className={`qibla-compass-dial${isSearching ? " qibla-compass-searching" : ""}`}
          role="img"
          aria-label={
            heading === undefined
              ? t("qibla.ariaBearing", { deg: roundedBearing })
              : isLocked
                ? t("qibla.ariaLocked")
                : t("qibla.ariaRelative")
          }
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {isLocked && <span className="qibla-compass-ripple" aria-hidden="true" />}
          {/* A two-tone needle — gold tip toward the Kaaba, muted tail behind
              it — reads unambiguously as a compass needle, unlike a plain
              arrow/pin glyph. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" className="qibla-compass-needle">
            <polygon className="qibla-compass-needle-tip" points="12,2 15.5,12 12,10 8.5,12" />
            <polygon className="qibla-compass-needle-tail" points="12,22 15.5,12 12,14 8.5,12" />
          </svg>
        </div>
      </div>
      <p className="qibla-compass-bearing">{t("qibla.fromNorth", { deg: roundedBearing })}</p>
      <p className="qibla-compass-distance">{t("qibla.toKaaba", { distance })}</p>
    </div>
  );
}
