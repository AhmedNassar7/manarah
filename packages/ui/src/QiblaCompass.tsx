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

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
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
 */
export function QiblaCompass({ bearing, distanceKm, heading }: QiblaCompassProps) {
  const rotation = normalizeDegrees(heading === undefined ? bearing : bearing - heading);
  const roundedBearing = Math.round(normalizeDegrees(bearing));

  return (
    <div>
      <div
        role="img"
        aria-label={
          heading === undefined
            ? `Qibla direction: ${roundedBearing} degrees from north`
            : `Qibla direction relative to your current heading`
        }
        style={{ transform: `rotate(${rotation}deg)`, width: "80px", height: "80px" }}
      >
        <svg viewBox="0 0 24 24" width="80" height="80" aria-hidden="true">
          <polygon points="12,2 18,20 12,15 6,20" fill="currentColor" />
        </svg>
      </div>
      <p>{roundedBearing}° from North</p>
      <p>{formatDistance(distanceKm)} to the Kaaba</p>
    </div>
  );
}
