import { describe, expect, it } from "vitest";
import {
  TASBIH_DHIKR,
  TASBIH_TARGETS,
  currentDhikr,
  emptyTasbih,
  normalizeTasbih,
  resetTasbih,
  selectDhikr,
  setTarget,
  setSound,
  setTasbihTheme,
  setVibrate,
  currentTimbre,
  TASBIH_THEMES,
  tapTasbih,
  todaysTasbih,
  undoTasbih,
  type TasbihState,
} from "./index.js";

const noon = new Date(2026, 10, 5, 12);
const nextDay = new Date(2026, 10, 6, 12);

function tapTimes(state: TasbihState, n: number, now = noon) {
  let s = state;
  let rounds = 0;
  for (let i = 0; i < n; i++) {
    const r = tapTasbih(s, now);
    s = r.state;
    if (r.roundCompleted) rounds++;
  }
  return { state: s, rounds };
}

describe("tapTasbih", () => {
  it("counts a bead and keeps the day's and lifetime totals", () => {
    const { state } = tapTasbih(emptyTasbih(), noon);
    expect(state.count).toBe(1);
    expect(state.lifetime).toBe(1);
    expect(todaysTasbih(state, noon)).toEqual({ taps: 1, rounds: 0 });
  });

  it("completes a round exactly at the target and starts the next from zero", () => {
    const { state, rounds } = tapTimes(emptyTasbih(), 33);
    expect(rounds).toBe(1);
    expect(state.count).toBe(0);
    expect(todaysTasbih(state, noon)).toEqual({ taps: 33, rounds: 1 });
    expect(state.lifetime).toBe(33);
  });

  it("reports the completion on the tap that finishes the round, and only that one", () => {
    const almost = tapTimes(emptyTasbih(), 32).state;
    expect(tapTasbih(almost, noon).roundCompleted).toBe(true);
    expect(tapTasbih(emptyTasbih(), noon).roundCompleted).toBe(false);
  });

  it("counts several rounds", () => {
    const { state, rounds } = tapTimes(emptyTasbih(), 100);
    expect(rounds).toBe(3); // 33 x 3 = 99, one bead into the fourth
    expect(state.count).toBe(1);
  });

  it("with no target just keeps counting, with no rounds", () => {
    const free = setTarget(emptyTasbih(), 0);
    const { state, rounds } = tapTimes(free, 250);
    expect(rounds).toBe(0);
    expect(state.count).toBe(250);
  });

  it("keeps each day's totals apart", () => {
    let s = tapTimes(emptyTasbih(), 10).state;
    s = tapTimes(s, 5, nextDay).state;
    expect(todaysTasbih(s, noon).taps).toBe(10);
    expect(todaysTasbih(s, nextDay).taps).toBe(5);
    expect(s.lifetime).toBe(15);
  });

  it("keeps only the last 60 days of daily totals", () => {
    let s = emptyTasbih();
    for (let i = 0; i < 70; i++) s = tapTasbih(s, new Date(2026, 0, 1 + i, 12)).state;
    expect(Object.keys(s.days)).toHaveLength(60);
    expect(s.lifetime).toBe(70);
  });
});

describe("undoTasbih", () => {
  it("takes back the last bead", () => {
    const s = tapTimes(emptyTasbih(), 5).state;
    const undone = undoTasbih(s, noon);
    expect(undone.count).toBe(4);
    expect(undone.lifetime).toBe(4);
    expect(todaysTasbih(undone, noon).taps).toBe(4);
  });

  it("takes back the tap that completed a round — the count returns to the last bead and the round is not counted", () => {
    const s = tapTimes(emptyTasbih(), 33).state;
    expect(todaysTasbih(s, noon).rounds).toBe(1);
    const undone = undoTasbih(s, noon);
    expect(undone.count).toBe(32);
    expect(todaysTasbih(undone, noon)).toEqual({ taps: 32, rounds: 0 });
    expect(undone.lifetime).toBe(32);
  });

  it("is one step only, and does nothing when there is nothing to take back", () => {
    const s = tapTimes(emptyTasbih(), 5).state;
    const once = undoTasbih(s, noon);
    expect(undoTasbih(once, noon)).toBe(once);
    expect(undoTasbih(emptyTasbih(), noon)).toEqual(emptyTasbih());
  });

  it("cannot take back into another day's counting", () => {
    const s = tapTimes(emptyTasbih(), 5).state;
    expect(undoTasbih(s, nextDay)).toBe(s);
  });
});

describe("choices", () => {
  it("resetting starts the round again but keeps the totals", () => {
    const s = tapTimes(emptyTasbih(), 20).state;
    const r = resetTasbih(s);
    expect(r.count).toBe(0);
    expect(r.lifetime).toBe(20);
    expect(todaysTasbih(r, noon).taps).toBe(20);
  });

  it("choosing another dhikr starts it from zero; an unknown one is ignored", () => {
    const s = tapTimes(emptyTasbih(), 7).state;
    const chosen = selectDhikr(s, "alhamdulillah");
    expect(chosen.dhikrId).toBe("alhamdulillah");
    expect(chosen.count).toBe(0);
    expect(selectDhikr(s, "nonsense")).toBe(s);
    expect(currentDhikr(chosen).id).toBe("alhamdulillah");
  });

  it("changing the target keeps the count unless it would already be past the new target", () => {
    const s = tapTimes(emptyTasbih(), 20).state;
    expect(setTarget(s, 99).count).toBe(20);
    expect(setTarget(s, 99).target).toBe(99);
    const big = tapTimes(setTarget(emptyTasbih(), 100), 60).state;
    expect(big.count).toBe(60);
    expect(setTarget(big, 33).count).toBe(0);
    expect(setTarget(s, 7)).toBe(s); // not one of the offered targets
  });

  it("keeps a vibration preference — on by default, and kept when it is off", () => {
    expect(emptyTasbih().vibrate).toBe(true);
    const off = setVibrate(emptyTasbih(), false);
    expect(off.vibrate).toBe(false);
    expect(normalizeTasbih(JSON.parse(JSON.stringify(off))).vibrate).toBe(false);
    expect(normalizeTasbih({ vibrate: "yes" }).vibrate).toBe(true);
    expect(tapTasbih(off, noon).state.vibrate).toBe(false);
  });

  it("is silent until sound is turned on, and remembers the choice", () => {
    expect(emptyTasbih().sound).toBe(false);
    const on = setSound(emptyTasbih(), true);
    expect(on.sound).toBe(true);
    expect(normalizeTasbih(JSON.parse(JSON.stringify(on))).sound).toBe(true);
    expect(normalizeTasbih({ sound: "loud" }).sound).toBe(false);
    expect(tapTasbih(on, noon).state.sound).toBe(true);
    expect(setSound(on, true)).toBe(on);
  });

  it("starts with olive-wood beads, can change material, and ignores a material that does not exist", () => {
    expect(emptyTasbih().theme).toBe("wood");
    const pearl = setTasbihTheme(emptyTasbih(), "pearl");
    expect(pearl.theme).toBe("pearl");
    expect(setTasbihTheme(pearl, "gold-plated")).toBe(pearl);
    expect(normalizeTasbih(JSON.parse(JSON.stringify(pearl))).theme).toBe("pearl");
    expect(normalizeTasbih({ theme: "nonsense" }).theme).toBe("wood");
    expect(tapTasbih(pearl, noon).state.theme).toBe("pearl");
  });

  it("gives every material a sound that suits it: wood knocks, glass ticks, stone clacks", () => {
    const timbre = (theme: string) => currentTimbre(setTasbihTheme(emptyTasbih(), theme));
    expect(timbre("wood")).toBe("wood");
    expect(timbre("pearl")).toBe("glass");
    expect(timbre("onyx")).toBe("stone");
    expect(timbre("amber")).toBe("soft");
    expect(new Set(TASBIH_THEMES.map((t) => t.id)).size).toBe(TASBIH_THEMES.length);
  });

  it("offers the traditional rounds and a free count", () => {
    expect(TASBIH_TARGETS).toEqual([33, 99, 100, 0]);
  });

  it("has unique ids and Arabic text for every phrase", () => {
    const ids = TASBIH_DHIKR.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of TASBIH_DHIKR) expect(d.arabic).toMatch(/[؀-ۿ]/);
  });
});

describe("normalizeTasbih", () => {
  it("returns a fresh state for anything that is not an object", () => {
    for (const bad of [undefined, null, 5, "x", []]) expect(normalizeTasbih(bad)).toEqual(emptyTasbih());
  });

  it("keeps valid parts and drops malformed ones", () => {
    const s = normalizeTasbih({
      dhikrId: "alhamdulillah",
      target: 99,
      count: 40,
      lifetime: 500,
      last: "tap",
      days: { "2026-11-05": { taps: 40, rounds: 1 }, "not-a-date": { taps: 9, rounds: 9 }, "2026-11-04": "bad" },
    });
    expect(s).toMatchObject({ dhikrId: "alhamdulillah", target: 99, count: 40, lifetime: 500, last: "tap" });
    expect(Object.keys(s.days)).toEqual(["2026-11-05"]);
  });

  it("repairs impossible values: an unknown dhikr, a target not on offer, a count past the target, negative numbers", () => {
    const s = normalizeTasbih({ dhikrId: "?", target: 7, count: -3, lifetime: -1, last: "weird", days: { "2026-11-05": { taps: -2, rounds: 1.5 } } });
    expect(s.dhikrId).toBe(TASBIH_DHIKR[0].id);
    expect(s.target).toBe(33);
    expect(s.count).toBe(0);
    expect(s.lifetime).toBe(0);
    expect(s.last).toBeNull();
    expect(s.days["2026-11-05"]).toEqual({ taps: 0, rounds: 0 });
    expect(normalizeTasbih({ target: 33, count: 50 }).count).toBe(0);
  });
});
