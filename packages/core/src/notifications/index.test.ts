import { describe, expect, it, vi } from "vitest";
import type { AzkarCategory } from "../azkar-engine/index.js";
import { hijriToGregorian, ISLAMIC_EVENTS } from "../hijri/index.js";
import { computePrayerTimes, type DailyPrayerTimes } from "../prayer-times/index.js";
import { DEFAULT_SETTINGS, type UserSettings } from "../settings/index.js";
import {
  computeDueNotifications,
  initialNotificationState,
  localDateKey,
  OBSERVANCE_REMINDER_POLICY,
  runNotificationCheck,
  type CustomTimeAzkar,
  type DueNotification,
  type NotificationState,
  type ScheduledAzkar,
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

const morningEveningCategory: AzkarCategory = {
  id: "27",
  name: "Words of remembrance for morning and evening",
  trigger: "morning-evening",
  items: [],
};
const wakingCategory: AzkarCategory = { id: "1", name: "Upon waking", trigger: "waking", items: [] };
const sleepCategory: AzkarCategory = { id: "28", name: "Before sleeping", trigger: "before-sleep", items: [] };
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

const defaultAzkar: ScheduledAzkar = {
  byTrigger: {
    "morning-evening": [morningEveningCategory],
    waking: [wakingCategory],
    "before-sleep": [sleepCategory],
    "post-salah": [postSalahCategory],
  },
  customTime: [],
};
const noAzkar: ScheduledAzkar = { byTrigger: {}, customTime: [] };

const minutes = (date: Date, n: number) => new Date(date.getTime() + n * 60_000);

describe("computeDueNotifications", () => {
  it("fires nothing before Fajr", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(
      new Date("2026-09-15T04:00:00"),
      times,
      defaultAzkar,
      initialNotificationState("2026-09-15")
    );
    expect(due).toEqual([]);
  });

  it("fires prayer + post-salah azkar + one combined waking/morning reminder exactly once at Fajr", () => {
    const times = timesOn("2026-09-15");
    const { due, nextState } = computeDueNotifications(
      times.fajr,
      times,
      defaultAzkar,
      initialNotificationState("2026-09-15")
    );
    expect(due).toEqual([
      { type: "prayer", prayer: "fajr" },
      { type: "post-salah-azkar", prayer: "fajr", categories: [postSalahCategory] },
      { type: "azkar-reminder", slot: "fajr", categories: [wakingCategory, morningEveningCategory] },
    ]);
    expect(nextState.firedPrayers).toEqual(["fajr"]);
    expect(nextState.firedPostSalahAzkar).toEqual(["fajr"]);
    expect(nextState.firedAzkarSlots).toEqual(["fajr"]);
  });

  it("does not re-fire the same prayer when checked again a few minutes later", () => {
    const times = timesOn("2026-09-15");
    const first = computeDueNotifications(times.fajr, times, defaultAzkar, initialNotificationState("2026-09-15"));
    const second = computeDueNotifications(minutes(times.fajr, 5), times, defaultAzkar, first.nextState);
    expect(second.due).toEqual([]);
  });

  it("fires the next prayer's notifications without re-firing the morning reminder", () => {
    const times = timesOn("2026-09-15");
    const afterFajr = computeDueNotifications(times.fajr, times, defaultAzkar, initialNotificationState("2026-09-15"));
    const atDhuhr = computeDueNotifications(times.dhuhr, times, defaultAzkar, afterFajr.nextState);

    expect(atDhuhr.due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar"]);
    expect(atDhuhr.nextState.firedPrayers).toEqual(["fajr", "dhuhr"]);
  });

  it("reminds evening azkar at Asr — including the combined morning-and-evening chapter", () => {
    const times = timesOn("2026-09-15");
    const state = { ...initialNotificationState("2026-09-15"), firedPrayers: ["fajr", "dhuhr"] };
    const { due } = computeDueNotifications(times.asr, times, defaultAzkar, state);
    expect(due).toContainEqual({ type: "azkar-reminder", slot: "asr", categories: [morningEveningCategory] });
  });

  it("reminds a category remapped to plain 'evening' at Asr", () => {
    const times = timesOn("2026-09-15");
    const eveningOnly: ScheduledAzkar = { byTrigger: { evening: [travelCategory] }, customTime: [] };
    const { due } = computeDueNotifications(times.asr, times, eveningOnly, initialNotificationState("2026-09-15"));
    expect(due).toEqual([
      { type: "prayer", prayer: "asr" },
      { type: "azkar-reminder", slot: "asr", categories: [travelCategory] },
    ]);
  });

  it("reminds before-sleep azkar an hour after Isha", () => {
    const times = timesOn("2026-09-15");
    const afterIsha = computeDueNotifications(times.isha, times, defaultAzkar, initialNotificationState("2026-09-15"));
    expect(afterIsha.due.some((d) => d.type === "azkar-reminder" && d.slot === "night")).toBe(false);

    const hourLater = computeDueNotifications(minutes(times.isha, 60), times, defaultAzkar, afterIsha.nextState);
    expect(hourLater.due).toEqual([{ type: "azkar-reminder", slot: "night", categories: [sleepCategory] }]);
  });

  it("clamps a late Isha's before-sleep reminder to 23:59 so it can't slip into the next day", () => {
    const times = { ...timesOn("2026-06-21"), isha: new Date("2026-06-21T23:30:00") };
    const { due } = computeDueNotifications(
      new Date("2026-06-21T23:59:00"),
      times,
      { byTrigger: { "before-sleep": [sleepCategory] }, customTime: [] },
      { ...initialNotificationState("2026-06-21"), firedPrayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"] }
    );
    expect(due).toEqual([{ type: "azkar-reminder", slot: "night", categories: [sleepCategory] }]);
  });

  it("resets and fires again on a new day", () => {
    const day1 = timesOn("2026-09-15");
    const day1Result = computeDueNotifications(day1.fajr, day1, defaultAzkar, initialNotificationState("2026-09-15"));

    const day2 = timesOn("2026-09-16");
    const day2Result = computeDueNotifications(day2.fajr, day2, defaultAzkar, day1Result.nextState);

    expect(day2Result.due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "azkar-reminder"]);
    expect(day2Result.nextState.date).toBe("2026-09-16");
  });

  it("skips azkar notifications when no categories are assigned", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(times.fajr, times, noAzkar, initialNotificationState("2026-09-15"));
    expect(due.map((d) => d.type)).toEqual(["prayer"]);
  });

  it("marks long-passed items handled without notifying, instead of a burst when the app opens late", () => {
    const times = timesOn("2026-09-15");
    // First check of the day at 20:31 — Isha was an hour ago, everything else earlier still.
    const { due, nextState } = computeDueNotifications(
      new Date("2026-09-15T20:31:00"),
      times,
      defaultAzkar,
      initialNotificationState("2026-09-15")
    );
    // Only the before-sleep reminder (due 20:30) is still fresh.
    expect(due).toEqual([{ type: "azkar-reminder", slot: "night", categories: [sleepCategory] }]);
    expect(nextState.firedPrayers).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
    expect(nextState.firedAzkarSlots).toEqual(["fajr", "asr", "night"]);
  });

  it("still delivers an item checked up to 30 minutes late", () => {
    const times = timesOn("2026-09-15");
    const { due } = computeDueNotifications(
      minutes(times.fajr, 30),
      times,
      noAzkar,
      initialNotificationState("2026-09-15")
    );
    expect(due).toEqual([{ type: "prayer", prayer: "fajr" }]);
  });

  it("upgrades state saved by older builds, which only tracked morning azkar", () => {
    const times = timesOn("2026-09-15");
    const legacy = {
      date: "2026-09-15",
      firedPrayers: ["fajr"],
      firedPostSalahAzkar: ["fajr"],
      firedMorningAzkar: true,
      firedCustomAzkar: [],
    };
    const { due, nextState } = computeDueNotifications(minutes(times.fajr, 1), times, defaultAzkar, legacy);
    expect(due).toEqual([]);
    expect(nextState.firedAzkarSlots).toEqual(["fajr"]);
    expect(nextState).not.toHaveProperty("firedMorningAzkar");
  });

  describe("custom-time azkar", () => {
    // All 5 prayers set to 23:59 so none of them are "due" during this
    // block's test window (10:00-16:00) — isolates custom-time behavior
    // from the prayer/post-salah/slot logic already covered above.
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
      const customAzkar: ScheduledAzkar = {
        byTrigger: {},
        customTime: [{ category: travelCategory, time: "14:30" }],
      };

      const before = computeDueNotifications(
        new Date("2026-09-15T14:00:00"),
        times,
        customAzkar,
        initialNotificationState("2026-09-15")
      );
      expect(before.due).toEqual([]);

      const atTime = computeDueNotifications(new Date("2026-09-15T14:30:00"), times, customAzkar, before.nextState);
      expect(atTime.due).toEqual([{ type: "custom-azkar", category: travelCategory, time: "14:30" }]);
      expect(atTime.nextState.firedCustomAzkar).toEqual(["96"]);

      const later = computeDueNotifications(new Date("2026-09-15T15:00:00"), times, customAzkar, atTime.nextState);
      expect(later.due).toEqual([]);
    });

    it("tracks multiple custom-time categories independently", () => {
      const times = noPrayersYetTimes("2026-09-15");
      const secondCategory: AzkarCategory = { id: "97", name: "Second custom dua", trigger: "situational", items: [] };
      const customTime: CustomTimeAzkar[] = [
        { category: travelCategory, time: "10:50" },
        { category: secondCategory, time: "16:00" },
      ];

      const result = computeDueNotifications(
        new Date("2026-09-15T11:00:00"),
        times,
        { byTrigger: {}, customTime },
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
  const allCategories = [morningEveningCategory, sleepCategory, postSalahCategory, travelCategory];

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

  const baseSettings: UserSettings = {
    ...DEFAULT_SETTINGS,
    coordinates: cairo,
    prayerTimesSettings,
    azkarSchedules: [],
    language: "en",
    reciterId: "alafasy",
  };

  it("passes the user's language to notify so the text can be rendered in it", async () => {
    const store = fakeStore();
    await store.setSettings({ ...baseSettings, language: "ar" });
    const notify = vi.fn();
    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify,
      azkarCategories: allCategories,
      now: times.fajr,
    });

    expect(notify).toHaveBeenCalledWith({ type: "prayer", prayer: "fajr" }, "ar");
  });

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
    await store.setSettings(baseSettings);
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

    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar", "azkar-reminder"]);
    expect(notify).toHaveBeenCalledTimes(3);
    expect(store.data.state).toMatchObject({ firedPrayers: ["fajr"], firedAzkarSlots: ["fajr"] });
  });

  it("reminds the default morning-and-evening chapter again at the real Asr", async () => {
    const store = fakeStore();
    await store.setSettings(baseSettings);
    const times = computePrayerTimes(cairo, new Date("2026-09-15T12:00:00"), prayerTimesSettings);

    const due = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: vi.fn(),
      azkarCategories: allCategories,
      now: times.asr,
    });

    expect(due).toContainEqual({ type: "azkar-reminder", slot: "asr", categories: [morningEveningCategory] });
  });

  it("does not re-notify on a second check moments later", async () => {
    const store = fakeStore();
    await store.setSettings(baseSettings);
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
      now: minutes(times.fajr, 1),
    });

    expect(secondDue).toEqual([]);
    expect(secondNotify).not.toHaveBeenCalled();
  });

  it("respects a muted schedule — a muted category never fires", async () => {
    const store = fakeStore();
    await store.setSettings({
      ...baseSettings,
      azkarSchedules: [{ categoryId: "27", trigger: "morning-evening", muted: true }],
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

    // Prayer + post-salah still fire; the morning reminder (its only category muted) does not.
    expect(due.map((d) => d.type)).toEqual(["prayer", "post-salah-azkar"]);
  });

  it("fires a situational category remapped to a custom time, once that time passes", async () => {
    const store = fakeStore();
    await store.setSettings({
      ...baseSettings,
      azkarSchedules: [{ categoryId: "96", trigger: "custom-time", customTime: "14:30", muted: false }],
    });

    const before = await runNotificationCheck({
      getSettings: store.getSettings,
      getNotificationState: store.getNotificationState,
      setNotificationState: store.setNotificationState,
      notify: vi.fn(),
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
    expect(notify2).toHaveBeenCalledWith({ type: "custom-azkar", category: travelCategory, time: "14:30" }, "en");
  });
});

/* ---------- Observance reminders ---------- */

describe("observance reminders", () => {
  /** Local YYYY-MM-DD of the civil day on which a Hijri date falls (tabular calendar, no adjustment). */
  function civilStr(hijri: { year: number; month: number; day: number }, offsetDays = 0, adjustment = 0): string {
    const d = new Date(hijriToGregorian(hijri).getTime() + (offsetDays - adjustment) * 86_400_000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  /** Runs one check at `at` on civil day `dateStr`, returning only the observance notifications. */
  function check(
    dateStr: string,
    at: (t: DailyPrayerTimes) => Date,
    options: { adjustment?: number; state?: NotificationState | undefined; disabled?: boolean } = {}
  ) {
    const times = timesOn(dateStr);
    const result = computeDueNotifications(
      at(times),
      times,
      noAzkar,
      options.state ?? initialNotificationState(dateStr),
      options.disabled ? undefined : { adjustment: options.adjustment ?? 0 }
    );
    return {
      ...result,
      observances: result.due.filter((d) => d.type === "observance"),
    };
  }

  const atMaghrib = (t: DailyPrayerTimes) => minutes(t.maghrib, 1);
  const atFajr = (t: DailyPrayerTimes) => minutes(t.fajr, 1);

  const ASHURA = { year: 1448, month: 1, day: 10 };
  const EID_FITR = { year: 1448, month: 10, day: 1 };

  it("reminds the evening before, at Maghrib — not earlier", () => {
    const eve = civilStr(ASHURA, -1);
    expect(check(eve, (t) => minutes(t.maghrib, -1)).observances).toEqual([]);
    expect(check(eve, atMaghrib).observances).toEqual([{ type: "observance", observance: "ashura", when: "tomorrow" }]);
  });

  it("fires once, and not again on the next check", () => {
    const eve = civilStr(ASHURA, -1);
    const first = check(eve, atMaghrib);
    expect(first.observances).toHaveLength(1);
    const times = timesOn(eve);
    const second = computeDueNotifications(minutes(times.maghrib, 6), times, noAzkar, first.nextState, { adjustment: 0 });
    expect(second.due.filter((d) => d.type === "observance")).toEqual([]);
  });

  it("gives Ashura an evening-before reminder only — a fast needs the night before, not a morning nudge", () => {
    expect(check(civilStr(ASHURA), atFajr).observances).toEqual([]);
  });

  it("gives Eid al-Fitr both: the evening before, and again at Fajr on the day", () => {
    expect(check(civilStr(EID_FITR, -1), atMaghrib).observances).toEqual([
      { type: "observance", observance: "eid-al-fitr", when: "tomorrow" },
    ]);
    expect(check(civilStr(EID_FITR), atFajr).observances).toEqual([
      { type: "observance", observance: "eid-al-fitr", when: "today" },
    ]);
  });

  it("does not remind on an ordinary day", () => {
    const ordinary = { year: 1448, month: 6, day: 4 };
    expect(check(civilStr(ordinary, -1), atMaghrib).observances).toEqual([]);
    expect(check(civilStr(ordinary), atFajr).observances).toEqual([]);
  });

  it("reminds once for the White Days block — the evening before the 13th, not before the 14th or 15th", () => {
    const base = { year: 1448, month: 6 };
    expect(check(civilStr({ ...base, day: 13 }, -1), atMaghrib).observances).toEqual([
      { type: "observance", observance: "white-days", when: "tomorrow" },
    ]);
    expect(check(civilStr({ ...base, day: 14 }, -1), atMaghrib).observances).toEqual([]);
    expect(check(civilStr({ ...base, day: 15 }, -1), atMaghrib).observances).toEqual([]);
    expect(check(civilStr({ ...base, day: 13 }), atFajr).observances).toEqual([]);
  });

  it("starts the White Days at the 14th in Dhu al-Hijjah, where the 13th is a day of Tashreeq", () => {
    const base = { year: 1448, month: 12 };
    expect(check(civilStr({ ...base, day: 13 }, -1), atMaghrib).observances).toEqual([]);
    expect(check(civilStr({ ...base, day: 14 }, -1), atMaghrib).observances).toEqual([
      { type: "observance", observance: "white-days", when: "tomorrow" },
    ]);
  });

  it("marks a reminder missed by more than 30 minutes handled without notifying", () => {
    const eve = civilStr(ASHURA, -1);
    const late = check(eve, (t) => minutes(t.maghrib, 120));
    expect(late.observances).toEqual([]);
    expect(late.nextState.firedObservances).toContain("eve:ashura");
  });

  it("is off unless asked for", () => {
    const eve = civilStr(ASHURA, -1);
    const result = check(eve, atMaghrib, { disabled: true });
    expect(result.observances).toEqual([]);
    expect(result.nextState.firedObservances).toEqual([]);
  });

  it("follows the user's Hijri adjustment — a later Hijri date means the observance comes a civil day earlier", () => {
    // With +1 the Hijri day 10 Muharram lands one civil day earlier, so the evening-before moves too.
    const eveWithAdjustment = civilStr(ASHURA, -1, 1);
    expect(check(eveWithAdjustment, atMaghrib, { adjustment: 1 }).observances).toEqual([
      { type: "observance", observance: "ashura", when: "tomorrow" },
    ]);
    // Unadjusted, that same evening is the one before Tasu'a (9 Muharram) — not Ashura.
    expect(check(eveWithAdjustment, atMaghrib, { adjustment: 0 }).observances).toEqual([
      { type: "observance", observance: "tasua", when: "tomorrow" },
    ]);
  });

  it("starts a new day's observance bookkeeping afresh", () => {
    const eve = civilStr(ASHURA, -1);
    const first = check(eve, atMaghrib);
    const nextDay = civilStr(ASHURA);
    const times = timesOn(nextDay);
    const next = computeDueNotifications(minutes(times.fajr, 1), times, noAzkar, first.nextState, { adjustment: 0 });
    expect(next.nextState.date).toBe(nextDay);
    expect(next.nextState.firedObservances).not.toContain("eve:ashura");
  });

  it("upgrades state saved before observance reminders existed", () => {
    const legacy = {
      date: civilStr(ASHURA, -1),
      firedPrayers: [],
      firedPostSalahAzkar: [],
      firedAzkarSlots: [],
      firedCustomAzkar: [],
    };
    const result = check(civilStr(ASHURA, -1), atMaghrib, { state: legacy as unknown as NotificationState });
    expect(result.observances).toHaveLength(1);
    expect(result.nextState.firedObservances).toEqual(["eve:ashura"]);
  });

  it("has a reminder policy for every fixed event and the White Days, and no stray entries", () => {
    const ids = [...ISLAMIC_EVENTS.map((e) => e.id), "white-days"].sort();
    expect(Object.keys(OBSERVANCE_REMINDER_POLICY).sort()).toEqual(ids);
    for (const policy of Object.values(OBSERVANCE_REMINDER_POLICY)) expect(policy.eve || policy.day).toBe(true);
  });
});

describe("runNotificationCheck — observance reminders", () => {
  const cairo = { latitude: 30.1317, longitude: 31.3382 };
  const prayerTimesSettings = { method: "UmmAlQura" as const, asrSchool: "Standard" as const };

  function run(settings: Partial<UserSettings>) {
    const data: { state?: NotificationState } = {};
    const notified: DueNotification[] = [];
    // The evening before Ashura 1448 (tabular), five minutes after the real Cairo Maghrib.
    const eveCivil = hijriToGregorian({ year: 1448, month: 1, day: 10 });
    const eveDay = new Date(eveCivil.getUTCFullYear(), eveCivil.getUTCMonth(), eveCivil.getUTCDate() - 1, 12);
    const maghrib = computePrayerTimes(cairo, eveDay, prayerTimesSettings).maghrib;
    const now = new Date(maghrib.getTime() + 5 * 60_000);
    return runNotificationCheck({
      getSettings: async () => ({ ...DEFAULT_SETTINGS, coordinates: cairo, prayerTimesSettings, ...settings }),
      getNotificationState: async () => data.state,
      setNotificationState: async (s) => {
        data.state = s;
      },
      notify: (n) => notified.push(n),
      azkarCategories: [],
      now,
    }).then((due) => ({ due, notified }));
  }

  it("delivers the evening-before reminder from the real prayer times", async () => {
    const { notified } = await run({});
    expect(notified.filter((n) => n.type === "observance")).toEqual([
      { type: "observance", observance: "ashura", when: "tomorrow" },
    ]);
  });

  it("stays silent when the user has turned observance reminders off", async () => {
    const { notified } = await run({ observanceReminders: false });
    expect(notified.filter((n) => n.type === "observance")).toEqual([]);
  });

  it("passes the user's Hijri adjustment through", async () => {
    const { notified } = await run({ hijriAdjustment: 1 });
    expect(notified.filter((n) => n.type === "observance")).toEqual([]);
  });
});
