import { describe, expect, it } from "vitest";
import { countsFor, emptyAzkarProgress, listProgress, normalizeAzkarProgress, setCounts } from "./index.js";

const noon = new Date(2026, 10, 5, 12);
const tomorrow = new Date(2026, 10, 6, 9);
const items = [
  { id: "a", repeatCount: 1 },
  { id: "b", repeatCount: 3 },
  { id: "c", repeatCount: 100 },
  { id: "d", repeatCount: 1 },
];

describe("listProgress", () => {
  it("starts at the first dhikr with an empty bar", () => {
    expect(listProgress(items, {})).toEqual({ total: 4, completed: 0, currentIndex: 0, fraction: 0, allDone: false });
  });

  it("points at the first dhikr not yet finished, even if a later one has been started", () => {
    const p = listProgress(items, { a: 1, b: 2, c: 40 });
    expect(p.completed).toBe(1);
    expect(p.currentIndex).toBe(1);
  });

  it("moves on once a dhikr reaches its repeat count", () => {
    expect(listProgress(items, { a: 1, b: 3 }).currentIndex).toBe(2);
  });

  it("weighs every dhikr the same, so a list with one 100-times dhikr does not crawl", () => {
    // Two of four dhikr finished: half way, however many repetitions the long one needs.
    expect(listProgress(items, { a: 1, b: 3 }).fraction).toBeCloseTo(0.5, 5);
    expect(listProgress(items, { a: 1, b: 3, d: 1 }).fraction).toBeCloseTo(0.75, 5);
  });

  it("counts a dhikr you are part-way through for the part done, so the bar still moves as you go", () => {
    // 50 of the 100 is half of that dhikr: a quarter of the list.
    expect(listProgress(items, { c: 50 }).fraction).toBeCloseTo(0.5 / 4, 5);
    expect(listProgress(items, { b: 1 }).fraction).toBeCloseTo(1 / 3 / 4, 5);
  });

  it("never counts more than the repeat count", () => {
    expect(listProgress(items, { a: 9 }).fraction).toBeCloseTo(0.25, 5);
  });

  it("is all done only when every dhikr is complete", () => {
    expect(listProgress(items, { a: 1, b: 3, c: 100, d: 1 })).toEqual({ total: 4, completed: 4, currentIndex: -1, fraction: 1, allDone: true });
    expect(listProgress(items, { a: 1, b: 3, c: 100 }).allDone).toBe(false);
  });

  it("handles an empty list", () => {
    expect(listProgress([], {})).toEqual({ total: 0, completed: 0, currentIndex: -1, fraction: 0, allDone: false });
  });
});

describe("today's saved tallies", () => {
  it("stores a list's tallies and reads them back", () => {
    const s = setCounts(emptyAzkarProgress(noon), "27", { a: 1, b: 2 }, noon);
    expect(countsFor(s, "27", noon)).toEqual({ a: 1, b: 2 });
    expect(countsFor(s, "27e", noon)).toEqual({});
  });

  it("keeps each list's tallies apart", () => {
    let s = setCounts(emptyAzkarProgress(noon), "27", { a: 1 }, noon);
    s = setCounts(s, "27e", { a: 3 }, noon);
    expect(countsFor(s, "27", noon)).toEqual({ a: 1 });
    expect(countsFor(s, "27e", noon)).toEqual({ a: 3 });
  });

  it("starts a new day from zero: yesterday's finished list is not finished today", () => {
    const s = setCounts(emptyAzkarProgress(noon), "27", { a: 1, b: 3 }, noon);
    expect(countsFor(s, "27", tomorrow)).toEqual({});
    const rolled = setCounts(s, "27e", { a: 1 }, tomorrow);
    expect(rolled.date).toBe("2026-11-06");
    expect(countsFor(rolled, "27", tomorrow)).toEqual({});
  });

  it("clearing a list removes it", () => {
    const s = setCounts(setCounts(emptyAzkarProgress(noon), "27", { a: 1 }, noon), "27", {}, noon);
    expect(s.categories).toEqual({});
  });

  it("drops saved tallies from an earlier day, and malformed ones", () => {
    expect(normalizeAzkarProgress({ date: "2026-11-04", categories: { "27": { a: 1 } } }, noon)).toEqual(emptyAzkarProgress(noon));
    for (const bad of [undefined, null, 3, "x"]) expect(normalizeAzkarProgress(bad, noon)).toEqual(emptyAzkarProgress(noon));
    const kept = normalizeAzkarProgress({ date: "2026-11-05", categories: { "27": { a: 2, b: -1, c: 1.5, d: "x" }, "28": "bad" } }, noon);
    expect(kept.categories).toEqual({ "27": { a: 2 } });
  });
});
