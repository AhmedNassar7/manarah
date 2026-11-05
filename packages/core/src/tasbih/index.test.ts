import { describe, expect, it } from "vitest";
import {
  TASBIH_BEADS,
  TASBIH_DHIKR,
  TASBIH_SOUNDS,
  TASBIH_THEMES,
  currentDhikr,
  emptyTasbih,
  normalizeTasbih,
  resetTasbih,
  selectDhikr,
  setSound,
  setTasbihTheme,
  tapTasbih,
  todaysTasbih,
  undoTasbih,
  type TasbihState,
} from "./index.js";

const noon = new Date(2026, 10, 5, 12);
const nextDay = new Date(2026, 10, 6, 12);

function tapTimes(state: TasbihState, n: number, now = noon) {
  let s = state;
  let milestones = 0;
  for (let i = 0; i < n; i++) {
    const r = tapTasbih(s, now);
    s = r.state;
    if (r.milestone) milestones++;
  }
  return { state: s, milestones };
}

describe("tapTasbih", () => {
  it("counts a bead and keeps the day's and lifetime totals", () => {
    const { state } = tapTasbih(emptyTasbih(), noon);
    expect(state.count).toBe(1);
    expect(state.lifetime).toBe(1);
    expect(todaysTasbih(state, noon)).toEqual({ taps: 1 });
  });

  it("just goes on counting — there is no round to finish, and no limit at 33", () => {
    const { state } = tapTimes(emptyTasbih(), 250);
    expect(state.count).toBe(250);
    expect(state.lifetime).toBe(250);
    expect(todaysTasbih(state, noon).taps).toBe(250);
  });

  it("marks every full turn of the ring (the 33rd, 66th, 99th…) as a milestone, and only those", () => {
    const at32 = tapTimes(emptyTasbih(), 32).state;
    expect(tapTasbih(at32, noon).milestone).toBe(true);
    expect(tapTasbih(emptyTasbih(), noon).milestone).toBe(false);
    expect(tapTimes(emptyTasbih(), 100).milestones).toBe(3);
    expect(tapTimes(emptyTasbih(), 99).milestones).toBe(3);
    expect(tapTimes(emptyTasbih(), 32).milestones).toBe(0);
    expect(TASBIH_BEADS).toBe(33);
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
    const undone = undoTasbih(tapTimes(emptyTasbih(), 5).state, noon);
    expect(undone.count).toBe(4);
    expect(undone.lifetime).toBe(4);
    expect(todaysTasbih(undone, noon).taps).toBe(4);
  });

  it("works across a milestone too", () => {
    const undone = undoTasbih(tapTimes(emptyTasbih(), 33).state, noon);
    expect(undone.count).toBe(32);
    expect(todaysTasbih(undone, noon).taps).toBe(32);
  });

  it("is one step only, and does nothing when there is nothing to take back", () => {
    const once = undoTasbih(tapTimes(emptyTasbih(), 5).state, noon);
    expect(undoTasbih(once, noon)).toBe(once);
    expect(undoTasbih(emptyTasbih(), noon)).toEqual(emptyTasbih());
  });

  it("cannot take back into another day's counting", () => {
    const s = tapTimes(emptyTasbih(), 5).state;
    expect(undoTasbih(s, nextDay)).toBe(s);
  });
});

describe("choices", () => {
  it("resetting starts the count again but keeps the totals", () => {
    const r = resetTasbih(tapTimes(emptyTasbih(), 20).state);
    expect(r.count).toBe(0);
    expect(r.lifetime).toBe(20);
    expect(todaysTasbih(r, noon).taps).toBe(20);
    expect(r.canUndo).toBe(false);
  });

  it("choosing another dhikr starts it from zero; an unknown one is ignored", () => {
    const s = tapTimes(emptyTasbih(), 7).state;
    const chosen = selectDhikr(s, "alhamdulillah");
    expect(chosen.dhikrId).toBe("alhamdulillah");
    expect(chosen.count).toBe(0);
    expect(selectDhikr(s, "nonsense")).toBe(s);
    expect(selectDhikr(s, s.dhikrId)).toBe(s);
    expect(currentDhikr(chosen).id).toBe("alhamdulillah");
  });

  it("is silent until a sound is chosen, and remembers which", () => {
    expect(emptyTasbih().sound).toBe("off");
    for (const sound of TASBIH_SOUNDS) {
      const s = setSound(emptyTasbih(), sound);
      expect(s.sound).toBe(sound);
      expect(normalizeTasbih(JSON.parse(JSON.stringify(s))).sound).toBe(sound);
      expect(tapTasbih(s, noon).state.sound).toBe(sound);
    }
    const wood = setSound(emptyTasbih(), "wood");
    expect(setSound(wood, "wood")).toBe(wood);
    expect(setSound(wood, "thunder" as never)).toBe(wood);
  });

  it("offers three soft sounds besides silence", () => {
    expect(TASBIH_SOUNDS).toEqual(["off", "click", "wood", "bell"]);
  });

  it("starts with olive-wood beads, can change material, and ignores a material that does not exist", () => {
    expect(emptyTasbih().theme).toBe("wood");
    const pearl = setTasbihTheme(emptyTasbih(), "pearl");
    expect(pearl.theme).toBe("pearl");
    expect(setTasbihTheme(pearl, "gold-plated")).toBe(pearl);
    expect(normalizeTasbih(JSON.parse(JSON.stringify(pearl))).theme).toBe("pearl");
    expect(normalizeTasbih({ theme: "nonsense" }).theme).toBe("wood");
    expect(tapTasbih(pearl, noon).state.theme).toBe("pearl");
    expect(new Set(TASBIH_THEMES.map((t) => t.id)).size).toBe(TASBIH_THEMES.length);
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
      count: 120,
      lifetime: 500,
      canUndo: true,
      sound: "bell",
      days: { "2026-11-05": { taps: 40 }, "not-a-date": { taps: 9 }, "2026-11-04": "bad" },
    });
    expect(s).toMatchObject({ dhikrId: "alhamdulillah", count: 120, lifetime: 500, canUndo: true, sound: "bell" });
    expect(Object.keys(s.days)).toEqual(["2026-11-05"]);
  });

  it("repairs impossible values: an unknown dhikr or sound, negative numbers", () => {
    const s = normalizeTasbih({ dhikrId: "?", count: -3, lifetime: -1, sound: "thunder", days: { "2026-11-05": { taps: -2 } } });
    expect(s.dhikrId).toBe(TASBIH_DHIKR[0].id);
    expect(s.count).toBe(0);
    expect(s.lifetime).toBe(0);
    expect(s.sound).toBe("off");
    expect(s.days["2026-11-05"]).toEqual({ taps: 0 });
  });

  it("ignores what earlier versions kept — a round size, rounds, vibration — and keeps a count past 33", () => {
    const s = normalizeTasbih({ target: 99, vibrate: true, count: 40, days: { "2026-11-05": { taps: 40, rounds: 1 } } });
    expect(s.count).toBe(40);
    expect("target" in s).toBe(false);
    expect("vibrate" in s).toBe(false);
    expect(s.days["2026-11-05"]).toEqual({ taps: 40 });
  });

  it("turns the old yes/no sound setting into a choice: yes becomes the wood knock it used to be, no stays silent", () => {
    expect(normalizeTasbih({ sound: true }).sound).toBe("wood");
    expect(normalizeTasbih({ sound: false }).sound).toBe("off");
  });
});
