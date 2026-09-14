import type { Coordinates } from "../prayer-times/index.js";

const KAABA: Coordinates = { latitude: 21.4225, longitude: 39.8262 };
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Great-circle bearing from `from` to the Kaaba, in degrees clockwise from true north (0-360). */
export function qiblaBearing(from: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(KAABA.latitude);
  const deltaLon = toRadians(KAABA.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance from `from` to the Kaaba, in kilometers. */
export function qiblaDistanceKm(from: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(KAABA.latitude);
  const deltaLat = toRadians(KAABA.latitude - from.latitude);
  const deltaLon = toRadians(KAABA.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
