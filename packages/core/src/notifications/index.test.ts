import { describe, expect, it, vi } from "vitest";
import type { AzkarCategory } from "../azkar-engine/index.js";
import { computePrayerTimes, type DailyPrayerTimes } from "../prayer-times/index.js";
import type { UserSettings } from "../settings/index.js";
import {
  computeDueNotifications,
  initialNotificationState,
  localDateKey,
  runNotificationCheck,
  type NotificationState,
} from "./index.js";

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

/**
 * Simulates exactly the manual browser test this replaces: real geolocation
 * coordinates, real adhan.js-computed prayer times, and a fake in-memory
 * store standing in for chrome.storage.sync — but with `now` injected
 * instead of waiting on the real clock, so "does it fire once Fajr has
 * passed" is a deterministic, instant, repeatable assertion instead of
 * something only verifiable by loading the extension and waiting.
 */
describe("runNotificationCheck", () => {
  const cairo = { latitude: 30.1317, longitude: 31.3382 };
  const prayerTimesSettings = { method: "UmmAlQura" as const, asrSchool: "Standard" as const };

  function fakeStore() {
    const data: { settings?: UserSettings; state?: NotificationState } = {};
    return {
      data,
      getSettings: async () => data.settings,
      setSettings: async (settings: UserSettings) => {
        data.settings = settings;
      },
      getNotificationState: async () => data.state,
      setNotificationState: async (state: NotificationState) => {
        data.state = state;
      },
    };
  }

  it("does nothing when no location has been saved yet", async () => {
    const store = fakeStore();
    const notify = vi.fn();

    const due = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      morningAzkar,
      postSalahAzkar,
    });

    expect(due).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    expect(store.data.state).toBeUndefined();
  });

  it("fires and persists state once a saved prayer time has passed", async () => {
    const store = fakeStore();
    await store.setSettings({ coordinates: cairo, prayerTimesSettings, azkarSchedules: [] });
    const notify = vi.fn();

    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    const due = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      morningAzkar,
      postSalahAzkar,
      now: times.fajr,
    });

    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "morning-azkar"]);
    expect(notify).toHaveBeenCalledTimes(3);
    expect(store.data.state).toMatchObject({ firedPrayers: ["fajr"], firedMorningAzkar: true });
  });

  it("does not re-notify on a second check moments later", async () => {
    const store = fakeStore();
    await store.setSettings({ coordinates: cairo, prayerTimesSettings, azkarSchedules: [] });
    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: vi.fn(),
      morningAzkar,
      postSalahAzkar,
      now: times.fajr,
    });

    const secondNotify = vi.fn();
    const secondDue = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: secondNotify,
      morningAzkar,
      postSalahAzkar,
      now: new Date(times.fajr.getTime() + 60_000),
    });

    expect(secondDue).toEqual([]);
    expect(secondNotify).not.toHaveBeenCalled();
  });
});
