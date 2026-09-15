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

function formatDistance(distanceKm: number): string {
  return distanceKm < 10 ? `${distanceKm.toFixed(2)} km` : `${Math.round(distanceKm)} km`;
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
  const rotation = normalizeDegrees(heading === undefined ? bearing : bearing - heading);
  const roundedBearing = Math.round(normalizeDegrees(bearing));
  const isLocked = heading !== undefined && angularDistanceFromZero(rotation) < LOCK_THRESHOLD_DEGREES;

  return (
    <div className={`qibla-compass card${isLocked ? " qibla-compass-locked" : ""}`}>
      <div
        className="qibla-compass-dial"
        role="img"
        aria-label={
          heading === undefined
            ? `Qibla direction: ${roundedBearing} degrees from north`
            : isLocked
              ? "Qibla direction: locked onto the Kaaba"
              : "Qibla direction relative to your current heading"
        }
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {isLocked && <span className="qibla-compass-ripple" aria-hidden="true" />}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,2 18,20 12,15 6,20" fill="currentColor" />
        </svg>
      </div>
      <p className="qibla-compass-bearing">{roundedBearing}° from North</p>
      <p className="qibla-compass-distance">{formatDistance(distanceKm)} to the Kaaba</p>
    </div>
  );
}
