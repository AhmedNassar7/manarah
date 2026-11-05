import { describe, expect, it } from "vitest";
import {
  BADGES,
  DAILY_CAPS,
  MESSAGE_VARIANTS,
  POINTS,
  PROGRESS_PRAYERS,
  applyEvent,
  currentStreak,
  dayKey,
  emptyProgress,
  isActiveDay,
  levelFor,
  longestStreak,
  normalizeProgress,
  pointsForLevel,
  recentDays,
  todaysRecord,
  type ProgressEvent,
  type ProgressState,
} from "./index.js";

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);
const DAY1 = at(2026, 11, 1);

/** Applies events in order on one day, returning the last result. */
function run(events: ProgressEvent[], now = DAY1, from: ProgressState = emptyProgress()) {
  let state = from;
  let last = applyEvent(state, events[0], now);
  state = last.state;
  for (const e of events.slice(1)) {
    last = applyEvent(state, e, now);
    state = last.state;
  }
  return last;
}

const prayed = (prayer: (typeof PROGRESS_PRAYERS)[number], done = true): ProgressEvent => ({ type: "prayer", prayer, done });

describe("dayKey", () => {
  it("is the local calendar day, zero-padded", () => {
    expect(dayKey(at(2026, 3, 5, 23))).toBe("2026-03-05");
    expect(dayKey(at(2026, 12, 31, 0))).toBe("2026-12-31");
  });
});

describe("prayers", () => {
  it("earns points for marking a prayer, and says so", () => {
    const r = run([prayed("fajr")]);
    expect(r.pointsDelta).toBe(POINTS.prayer);
    expect(r.state.points).toBe(POINTS.prayer);
    expect(r.encouragement === "prayer" || r.encouragement === "badge").toBe(true);
    expect(todaysRecord(r.state, DAY1).prayers).toEqual(["fajr"]);
  });

  it("does not pay twice for the same prayer", () => {
    const r = run([prayed("fajr"), prayed("fajr")]);
    expect(r.pointsDelta).toBe(0);
    expect(r.state.points).toBe(POINTS.prayer);
  });

  it("gives a bonus for all five in a day", () => {
    const r = run(PROGRESS_PRAYERS.map((p) => prayed(p)));
    expect(r.state.points).toBe(5 * POINTS.prayer + POINTS.allFiveBonus);
    expect(r.pointsDelta).toBe(POINTS.prayer + POINTS.allFiveBonus);
    expect(r.encouragement).toBe("all-five");
  });

  it("takes the points back if a prayer is un-marked, including the bonus, and never goes below zero", () => {
    const five = run(PROGRESS_PRAYERS.map((p) => prayed(p))).state;
    const undone = applyEvent(five, prayed("asr", false), DAY1);
    expect(undone.pointsDelta).toBe(-(POINTS.prayer + POINTS.allFiveBonus));
    expect(undone.state.points).toBe(4 * POINTS.prayer);
    expect(todaysRecord(undone.state, DAY1).prayers).not.toContain("asr");

    const nothing = applyEvent(emptyProgress(), prayed("fajr", false), DAY1);
    expect(nothing.state.points).toBe(0);
    expect(nothing.pointsDelta).toBe(0);
  });

  it("keeps the prayers in their daily order", () => {
    const r = run([prayed("isha"), prayed("fajr"), prayed("asr")]);
    expect(todaysRecord(r.state, DAY1).prayers).toEqual(["fajr", "asr", "isha"]);
  });
});

describe("azkar and quiz", () => {
  it("pays for each dhikr completed, up to a daily cap — practice, not farming", () => {
    let state = emptyProgress();
    let paid = 0;
    for (let i = 0; i < DAILY_CAPS.azkar + 10; i++) {
      const r = applyEvent(state, { type: "azkar-completed" }, DAY1);
      paid += r.pointsDelta;
      state = r.state;
    }
    expect(paid).toBe(DAILY_CAPS.azkar * POINTS.azkar);
    expect(todaysRecord(state, DAY1).azkar).toBe(DAILY_CAPS.azkar + 10); // still counted for badges and streaks
  });

  it("pays only for correct quiz answers, up to a daily cap", () => {
    expect(applyEvent(emptyProgress(), { type: "quiz-answer", correct: true }, DAY1).pointsDelta).toBe(POINTS.quizCorrect);
    const wrong = applyEvent(emptyProgress(), { type: "quiz-answer", correct: false }, DAY1);
    expect(wrong.pointsDelta).toBe(0);
    expect(wrong.encouragement).toBe("quiz-wrong");
    expect(todaysRecord(wrong.state, DAY1).quizAnswered).toBe(1);

    let state = emptyProgress();
    let paid = 0;
    for (let i = 0; i < DAILY_CAPS.quizCorrect + 5; i++) {
      const r = applyEvent(state, { type: "quiz-answer", correct: true }, DAY1);
      paid += r.pointsDelta;
      state = r.state;
    }
    expect(paid).toBe(DAILY_CAPS.quizCorrect * POINTS.quizCorrect);
  });

  it("a wrong answer alone does not count as an active day", () => {
    const r = applyEvent(emptyProgress(), { type: "quiz-answer", correct: false }, DAY1);
    expect(currentStreak(r.state, DAY1)).toBe(0);
  });
});

describe("streaks", () => {
  /** A state with activity on each of the given days. */
  const withDays = (...days: Array<[number, number, number]>): ProgressState => {
    let state = emptyProgress();
    for (const [y, m, d] of days) state = applyEvent(state, { type: "azkar-completed" }, at(y, m, d)).state;
    return state;
  };

  it("counts consecutive active days up to today", () => {
    const state = withDays([2026, 11, 1], [2026, 11, 2], [2026, 11, 3]);
    expect(currentStreak(state, at(2026, 11, 3))).toBe(3);
  });

  it("does not break the streak just because today is still empty — it runs back from yesterday", () => {
    const state = withDays([2026, 11, 1], [2026, 11, 2]);
    expect(currentStreak(state, at(2026, 11, 3))).toBe(2);
  });

  it("is broken by a missed day", () => {
    const state = withDays([2026, 11, 1], [2026, 11, 2], [2026, 11, 4]);
    expect(currentStreak(state, at(2026, 11, 4))).toBe(1);
    expect(currentStreak(state, at(2026, 11, 6))).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    const state = withDays([2026, 12, 30], [2026, 12, 31], [2027, 1, 1]);
    expect(currentStreak(state, at(2027, 1, 1))).toBe(3);
  });

  it("remembers the longest run ever, even after it is broken", () => {
    const state = withDays([2026, 10, 1], [2026, 10, 2], [2026, 10, 3], [2026, 10, 4], [2026, 10, 10], [2026, 10, 11]);
    expect(longestStreak(state)).toBe(4);
    expect(longestStreak(emptyProgress())).toBe(0);
  });

  it("shows the last days as a strip, oldest first, with today last", () => {
    const state = withDays([2026, 11, 2], [2026, 11, 4]);
    const strip = recentDays(state, at(2026, 11, 4), 4);
    expect(strip.map((d) => d.key)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(strip.map((d) => d.active)).toEqual([false, true, false, true]);
    expect(strip.map((d) => d.isToday)).toEqual([false, false, false, true]);
  });
});

describe("levels", () => {
  it("starts at level 1 and rises on a gentle curve", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0 });
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(50);
    expect(pointsForLevel(3)).toBe(150);
    expect(levelFor(49).level).toBe(1);
    expect(levelFor(50).level).toBe(2);
    expect(levelFor(150).level).toBe(3);
  });

  it("reports progress through the current level", () => {
    const info = levelFor(100); // level 2 spans 50..150
    expect(info).toMatchObject({ level: 2, into: 50, span: 100 });
    expect(info.fraction).toBeCloseTo(0.5, 6);
  });

  it("keeps the fraction within 0 to 1 for any number of points", () => {
    for (const p of [0, 1, 49, 50, 149, 150, 1000, 123456]) {
      const { fraction } = levelFor(p);
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThan(1);
    }
  });
});

describe("badges and encouragement", () => {
  it("awards the first-prayer badge once, and announces it", () => {
    const r = applyEvent(emptyProgress(), prayed("fajr"), DAY1);
    expect(r.newBadges).toContain("first-prayer");
    expect(r.encouragement).toBe("badge");
    const again = applyEvent(r.state, prayed("dhuhr"), DAY1);
    expect(again.newBadges).not.toContain("first-prayer");
    expect(again.state.badges.filter((b) => b === "first-prayer")).toHaveLength(1);
  });

  it("keeps a badge even if the deed is undone", () => {
    const r = applyEvent(emptyProgress(), prayed("fajr"), DAY1);
    const undone = applyEvent(r.state, prayed("fajr", false), DAY1);
    expect(undone.state.badges).toContain("first-prayer");
  });

  it("awards all-five and the points badges", () => {
    const r = run(PROGRESS_PRAYERS.map((p) => prayed(p)));
    expect(r.state.badges).toContain("all-five");
    expect(r.state.badges).not.toContain("points-500");
  });

  it("celebrates a streak milestone on the day it is reached", () => {
    let state = emptyProgress();
    let last = applyEvent(state, { type: "azkar-completed" }, at(2026, 11, 1));
    state = last.state;
    for (const day of [2, 3]) {
      last = applyEvent(state, { type: "azkar-completed" }, at(2026, 11, day));
      state = last.state;
    }
    expect(last.encouragement).toBe("streak");
    expect(last.streak).toBe(3);
    expect(last.newBadges).toContain("streak-3");
  });

  it("is quiet about the streak on later deeds the same day", () => {
    let state = emptyProgress();
    for (const day of [1, 2, 3]) state = applyEvent(state, { type: "azkar-completed" }, at(2026, 11, day)).state;
    const again = applyEvent(state, { type: "azkar-completed" }, at(2026, 11, 3));
    expect(again.encouragement).toBe("azkar");
  });

  it("picks a message wording within the available variants", () => {
    for (let i = 0; i < 30; i++) {
      const r = applyEvent(emptyProgress(), { type: "quiz-answer", correct: i % 2 === 0 }, at(2026, 11, 1 + (i % 20)));
      expect(r.variant).toBeGreaterThanOrEqual(0);
      expect(r.variant).toBeLessThan(MESSAGE_VARIANTS);
    }
  });

  it("every badge has a unique id and can be earned", () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BADGES.some((b) => b.earned(emptyProgress()))).toBe(false);
  });

  it("does not mutate the state it was given", () => {
    const state = emptyProgress();
    applyEvent(state, prayed("fajr"), DAY1);
    expect(state).toEqual(emptyProgress());
  });
});

describe("normalizeProgress", () => {
  it("round-trips a valid state", () => {
    const state = run([prayed("fajr"), { type: "azkar-completed" }]).state;
    expect(normalizeProgress(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("returns an empty state for junk", () => {
    for (const bad of [null, undefined, 5, "x", []]) expect(normalizeProgress(bad), String(bad)).toEqual(emptyProgress());
  });

  it("keeps the valid parts and drops the rest", () => {
    const cleaned = normalizeProgress({
      points: -5,
      badges: ["first-prayer", "made-up", 3],
      days: {
        "2026-11-01": { prayers: ["fajr", "bogus"], azkar: 3, quizCorrect: -1, quizAnswered: "x" },
        "not-a-date": { prayers: ["fajr"] },
        "2026-11-02": "junk",
      },
    });
    expect(cleaned.points).toBe(0);
    expect(cleaned.badges).toEqual(["first-prayer"]);
    expect(cleaned.days).toEqual({ "2026-11-01": { prayers: ["fajr"], azkar: 3, quizCorrect: 0, quizAnswered: 0, tasbih: 0 } });
  });
});

describe("tasbih rounds", () => {
  const noon = new Date(2026, 10, 5, 12);
  const round = (state: ProgressState, now = noon) => applyEvent(state, { type: "tasbih-round" }, now);

  it("earns a few points and an encouraging word for a completed round", () => {
    const r = round(emptyProgress());
    expect(r.pointsDelta).toBe(POINTS.tasbihRound);
    expect(r.encouragement === "tasbih" || r.encouragement === "badge" || r.encouragement === "streak").toBe(true);
    expect(todaysRecord(r.state, noon).tasbih).toBe(1);
    expect(r.state.points).toBe(POINTS.tasbihRound);
  });

  it("stops earning points after the daily cap, but still counts the rounds", () => {
    let state = emptyProgress();
    for (let i = 0; i < DAILY_CAPS.tasbihRound; i++) state = round(state).state;
    const over = round(state);
    expect(over.pointsDelta).toBe(0);
    expect(over.state.points).toBe(DAILY_CAPS.tasbihRound * POINTS.tasbihRound);
    expect(todaysRecord(over.state, noon).tasbih).toBe(DAILY_CAPS.tasbihRound + 1);
  });

  it("makes the day count towards the streak", () => {
    const r = round(emptyProgress());
    expect(isActiveDay(todaysRecord(r.state, noon))).toBe(true);
    expect(currentStreak(r.state, noon)).toBe(1);
  });

  it("earns a badge after ten rounds", () => {
    let state = emptyProgress();
    for (let i = 0; i < 9; i++) state = round(state).state;
    expect(state.badges).not.toContain("tasbih-10");
    expect(round(state).state.badges).toContain("tasbih-10");
  });

  it("is kept when saved progress is loaded", () => {
    const state = round(emptyProgress()).state;
    expect(normalizeProgress(JSON.parse(JSON.stringify(state))).days["2026-11-05"].tasbih).toBe(1);
  });
});
