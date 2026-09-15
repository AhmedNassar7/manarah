import { describe, expect, it, vi } from "vitest";
import type { AzkarCategory } from "../azkar-engine/index.js";
import { computePrayerTimes, type DailyPrayerTimes } from "../prayer-times/index.js";
import type { UserSettings } from "../settings/index.js";
import {
  computeDueNotifications,
  initialNotificationState,
  localDateKey,
  runNotificationCheck,
  type CustomTimeAzkar,
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

const morningCategory: AzkarCategory = {
  id: "27",
  name: "Words of remembrance for morning and evening",
  trigger: "morning",
  items: [],
};
const postSalahCategory: AzkarCategory = {
  id: "25",
  name: "What to say after completing the prayer",
  trigger: "post-salah",
  items: [],
};
const travelCategory: AzkarCategory = {
  id: "96",
  name: "Invocation for traveling",
  trigger: "situational",
  items: [],
};

const morningAzkar = [morningCategory];
const postSalahAzkar = [postSalahCategory];
const noCustomAzkar: CustomTimeAzkar[] = [];

describe("computeDueNotifications", () => {
  it("fires nothing before Fajr", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(
      new Date("2026-09-15T04:00:00"),
      times,
      morningAzkar,
      postSalahAzkar,
      noCustomAzkar,
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
      noCustomAzkar,
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
      noCustomAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    const second = computeDueNotifications(
      new Date(times.fajr.getTime() + 5 * 60_000),
      times,
      morningAzkar,
      postSalahAzkar,
      noCustomAzkar,
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
      noCustomAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    const atDhuhr = computeDueNotifications(
      times.dhuhr,
      times,
      morningAzkar,
      postSalahAzkar,
      noCustomAzkar,
      afterFajr.nextState
    );

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
      noCustomAzkar,
      initialNotificationState(localDateKey(day1.fajr))
    );

    const day2 = timesOn("2026-09-16");
    const day2Result = computeDueNotifications(
      day2.fajr,
      day2,
      morningAzkar,
      postSalahAzkar,
      noCustomAzkar,
      day1Result.nextState
    );

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
      noCustomAzkar,
      initialNotificationState(localDateKey(times.fajr))
    );
    expect(due.map((d) => d.type)).toEqual(["prayer"]);
  });

  describe("custom-time azkar", () => {
    // All 5 prayers set to 23:59 so none of them are "due" during this
    // block's test window (10:00-16:00) — isolates custom-time behavior
    // from the prayer/post-salah/morning logic already covered above.
    function noPrayersYetTimes(dateStr: string): DailyPrayerTimes {
      const lateInTheDay = new Date(`${dateStr}T23:59:00`);
      return {
        fajr: lateInTheDay,
        sunrise: lateInTheDay,
        dhuhr: lateInTheDay,
        asr: lateInTheDay,
        maghrib: lateInTheDay,
        isha: lateInTheDay,
      };
    }

    it("fires once the custom time has passed, and only once", () => {
      const times = noPrayersYetTimes("2026-09-15");
      const customAzkar: CustomTimeAzkar[] = [{ category: travelCategory, time: "14:30" }];

      const before = computeDueNotifications(
        new Date("2026-09-15T14:00:00"),
        times,
        [],
        [],
        customAzkar,
        initialNotificationState("2026-09-15")
      );
      expect(before.due).toEqual([]);

      const atTime = computeDueNotifications(
        new Date("2026-09-15T14:30:00"),
        times,
        [],
        [],
        customAzkar,
        before.nextState
      );
      expect(atTime.due.map((d) => d.type)).toEqual(["custom-azkar"]);
      expect(atTime.nextState.firedCustomAzkar).toEqual(["96"]);

      const later = computeDueNotifications(
        new Date("2026-09-15T15:00:00"),
        times,
        [],
        [],
        customAzkar,
        atTime.nextState
      );
      expect(later.due).toEqual([]);
    });

    it("tracks multiple custom-time categories independently", () => {
      const times = noPrayersYetTimes("2026-09-15");
      const secondCategory: AzkarCategory = { id: "97", name: "Second custom dua", trigger: "situational", items: [] };
      const customAzkar: CustomTimeAzkar[] = [
        { category: travelCategory, time: "10:00" },
        { category: secondCategory, time: "16:00" },
      ];

      const result = computeDueNotifications(
        new Date("2026-09-15T11:00:00"),
        times,
        [],
        [],
        customAzkar,
        initialNotificationState("2026-09-15")
      );

      expect(result.due).toHaveLength(1);
      expect(result.nextState.firedCustomAzkar).toEqual(["96"]);
    });
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
  const allCategories = [morningCategory, postSalahCategory, travelCategory];

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
      azkarCategories: allCategories,
    });

    expect(due).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    expect(store.data.state).toBeUndefined();
  });

  it("fires and persists state once a saved prayer time has passed", async () => {
    const store = fakeStore();
    await store.setSettings({
      coordinates: cairo,
      prayerTimesSettings,
      azkarSchedules: [],
      language: "en",
      reciterId: "alafasy",
    });
    const notify = vi.fn();

    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    const due = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      azkarCategories: allCategories,
      now: times.fajr,
    });

    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "morning-azkar"]);
    expect(notify).toHaveBeenCalledTimes(3);
    expect(store.data.state).toMatchObject({ firedPrayers: ["fajr"], firedMorningAzkar: true });
  });

  it("does not re-notify on a second check moments later", async () => {
    const store = fakeStore();
    await store.setSettings({
      coordinates: cairo,
      prayerTimesSettings,
      azkarSchedules: [],
      language: "en",
      reciterId: "alafasy",
    });
    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: vi.fn(),
      azkarCategories: allCategories,
      now: times.fajr,
    });

    const secondNotify = vi.fn();
    const secondDue = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: secondNotify,
      azkarCategories: allCategories,
      now: new Date(times.fajr.getTime() + 60_000),
    });

    expect(secondDue).toEqual([]);
    expect(secondNotify).not.toHaveBeenCalled();
  });

  it("respects a muted schedule — a muted category never fires", async () => {
    const store = fakeStore();
    await store.setSettings({
      coordinates: cairo,
      prayerTimesSettings,
      azkarSchedules: [{ categoryId: "27", trigger: "morning", muted: true }],
      language: "en",
      reciterId: "alafasy",
    });
    const notify = vi.fn();
    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    const due = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      azkarCategories: allCategories,
      now: times.fajr,
    });

    // Prayer + post-salah still fire; morning azkar (muted) does not.
    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar"]);
  });

  it("fires a situational category remapped to a custom time, once that time passes", async () => {
    const store = fakeStore();
    await store.setSettings({
      coordinates: cairo,
      prayerTimesSettings,
      azkarSchedules: [{ categoryId: "96", trigger: "custom-time", customTime: "14:30", muted: false }],
      language: "en",
      reciterId: "alafasy",
    });
    const notify = vi.fn();

    const before = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      azkarCategories: allCategories,
      now: new Date("2026-09-15T14:00:00"),
    });
    expect(before.some((d) => d.type === "custom-azkar")).toBe(false);

    // Asserting membership rather than an exact array: this only cares that
    // the custom-time remap fired, not whether a real Cairo prayer also
    // happened to fall in this 30-minute window (that's covered elsewhere).
    const notify2 = vi.fn();
    const after = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: notify2,
      azkarCategories: allCategories,
      now: new Date("2026-09-15T14:30:00"),
    });
    expect(after.some((d) => d.type === "custom-azkar")).toBe(true);
    expect(notify2).toHaveBeenCalledWith(expect.objectContaining({ title: travelCategory.name }));
  });
});
