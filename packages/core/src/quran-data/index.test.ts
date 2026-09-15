import { describe, expect, it } from "vitest";
import { pickRandomVerse, type Verse } from "./index.js";

const verses: Verse[] = [
  { surah: 1, ayah: 1, uthmaniText: "first" },
  { surah: 1, ayah: 2, uthmaniText: "second" },
  { surah: 1, ayah: 3, uthmaniText: "third" },
];

describe("pickRandomVerse", () => {
  it("picks the first verse when random() returns 0", () => {
    expect(pickRandomVerse(verses, () => 0)).toEqual(verses[0]);
  });

  it("picks the last verse when random() returns just under 1", () => {
    expect(pickRandomVerse(verses, () => 0.999999)).toEqual(verses[2]);
  });

  it("picks a middle verse for a mid-range random value", () => {
    expect(pickRandomVerse(verses, () => 0.5)).toEqual(verses[1]);
  });

  it("defaults to Math.random when no generator is supplied", () => {
    const verse = pickRandomVerse(verses);
    expect(verses).toContainEqual(verse);
  });

  it("throws on an empty list rather than silently returning undefined", () => {
    expect(() => pickRandomVerse([])).toThrow(/empty/);
  });
});
