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

/** Great-circle (haversine) distance between two points, in kilometers. */
export function greatCircleDistanceKm(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/** Great-circle distance from `from` to the Kaaba, in kilometers. */
export function qiblaDistanceKm(from: Coordinates): number {
  return greatCircleDistanceKm(from, KAABA);
}

export type CompassPoint = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const COMPASS_POINTS: CompassPoint[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** The nearest of the 8 compass points to a bearing — e.g. 136° → "SE" — for a plain-words direction next to the degrees. */
export function compassPoint(bearing: number): CompassPoint {
  const normalized = ((bearing % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

export interface QiblaTurn {
  /** "none" once within `toleranceDegrees` of facing the Qibla. */
  direction: "left" | "right" | "none";
  /** Degrees to turn, 0-180, rounded. */
  degrees: number;
}

/**
 * Which way (and how far) to turn from the current `heading` to face the
 * Qibla `bearing` — always the shorter way round, so a 350° gap reads as
 * "turn left 10°", not "turn right 350°".
 */
export function qiblaTurn(bearing: number, heading: number, toleranceDegrees = 3): QiblaTurn {
  const delta = ((((bearing - heading) % 360) + 540) % 360) - 180; // (-180, 180]
  const degrees = Math.round(Math.abs(delta));
  if (Math.abs(delta) < toleranceDegrees) return { direction: "none", degrees: 0 };
  return { direction: delta > 0 ? "right" : "left", degrees };
}
