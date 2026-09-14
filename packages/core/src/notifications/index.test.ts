import { describe, expect, it } from "vitest";
import type { AzkarCategory } from "../azkar-engine/index.js";
import type { DailyPrayerTimes } from "../prayer-times/index.js";
import { computeDueNotifications, initialNotificationState, localDateKey } from "./index.js";

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

const morningAzkar: AzkarCategory[] = [
  { id: "27", name: "Words of remembrance for morning and evening", trigger: "morning", items: [] },
];
const postSalahAzkar: AzkarCategory[] = [
  { id: "25", name: "What to say after completing the prayer", trigger: "post-salah", items: [] },
];

describe("computeDueNotifications", () => {
  it("fires nothing before Fajr", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(
      new Date("2026-09-15T04:00:00"),
      times,
      morningAzkar,
      postSalahAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    expect(due).toEqual([]);
  });

  it("fires prayer + post-salah azkar + morning azkar exactly once at Fajr", () => {
    const times = timesOn("2026-09-15");
    const { due, nextState } = computeDueNotifications(
      times.fajr,
      times,
      morningAzkar,
      postSalahAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "morning-azkar"]);
    expect(nextState.firedPrayers).toEqual(["fajr"]);
    expect(nextState.firedPostSalahAzkar).toEqual(["fajr"]);
    expect(nextState.firedMorningAzkar).toBe(true);
  });

  it("does not re-fire the same prayer when checked again later the same minute", () => {
    const times = timesOn("2026-09-15");
    const first = computeDueNotifications(
      times.fajr,
      times,
      morningAzkar,
      postSalahAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    const second = computeDueNotifications(
      new Date(times.fajr.getTime() + 5 * 60_000),
      times,
      morningAzkar,
      postSalahAzkar,
      first.nextState
    );
    expect(second.due).toEqual([]);
  });

  it("fires the next prayer's notifications without re-firing morning azkar", () => {
    const times = timesOn("2026-09-15");
    const afterFajr = computeDueNotifications(
      times.fajr,
      times,
      morningAzkar,
      postSalahAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    const atDhuhr = computeDueNotifications(times.dhuhr, times, morningAzkar, postSalahAzkar, afterFajr.nextState);

    expect(atDhuhr.due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar"]);
    expect(atDhuhr.nextState.firedPrayers).toEqual(["fajr", "dhuhr"]);
  });

  it("resets and fires again on a new day", () => {
    const day1 = timesOn("2026-09-15");
    const day1Result = computeDueNotifications(
      day1.fajr,
      day1,
      morningAzkar,
      postSalahAzkar,
      initialNotificationState(localDateKey(day1.fajr))
    );

    const day2 = timesOn("2026-09-16");
    const day2Result = computeDueNotifications(day2.fajr, day2, morningAzkar, postSalahAzkar, day1Result.nextState);

    expect(day2Result.due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "morning-azkar"]);
    expect(day2Result.nextState.date).toBe("2026-09-16");
  });

  it("skips post-salah/morning azkar notifications when no categories are assigned", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(
      times.fajr,
      times,
      [],
      [],
      initialNotificationState(localDateKey(times.fajr))
    );
    expect(due.map((d) => d.type)).toEqual(["prayer"]);
  });
});
