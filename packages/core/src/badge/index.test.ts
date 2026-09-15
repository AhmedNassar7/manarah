import { describe, expect, it } from "vitest";
import type { DailyPrayerTimes } from "../prayer-times/index.js";
import { computeBadgeState } from "./index.js";

function timesOn(dateStr: string): DailyPrayerTimes {
  return {
    fajr: new Date(`${dateStr}T05:00:00`),
    sunrise: new Date(`${dateStr}T06:20:00`),
    dhuhr: new Date(`${dateStr}T12:00:00`),
    asr: new Date(`${dateStr}T15:30:00`),
    maghrib: new Date(`${dateStr}T18:00:00`),
    isha: new Date(`${dateStr}T19:30:00`),
  };
}

const TEAL_TILE = "#1e5c55";
const HENNA = "#7a3b2e";

describe("computeBadgeState", () => {
  it("shows minutes remaining in teal-tile when well outside the warning window", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T11:30:00"), times);
    expect(state).toEqual({ text: "30m", color: TEAL_TILE });
  });

  it("switches to henna once inside the 15-minute warning window", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T11:50:00"), times);
    expect(state).toEqual({ text: "10m", color: HENNA });
  });

  it("stays henna at exactly the 15-minute boundary", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T11:45:00"), times);
    expect(state).toEqual({ text: "15m", color: HENNA });
  });

  it("switches back to teal-tile just outside the boundary", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T11:44:00"), times);
    expect(state).toEqual({ text: "16m", color: TEAL_TILE });
  });

  it("formats hours once more than 60 minutes remain", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T09:00:00"), times);
    expect(state).toEqual({ text: "3h", color: TEAL_TILE });
  });

  it("shows an empty badge once every waypoint for the day has passed", () => {
    const times = timesOn("2026-09-15");
    const state = computeBadgeState(new Date("2026-09-15T23:00:00"), times);
    expect(state).toEqual({ text: "", color: TEAL_TILE });
  });
});
