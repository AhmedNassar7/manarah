import { describe, expect, it } from "vitest";
import { ayahAudioUrl, pickRandomVerse, type Reciter, type Verse } from "./index.js";

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

describe("ayahAudioUrl", () => {
  const alafasy: Reciter = { id: "alafasy", everyAyahSubfolder: "Alafasy_128kbps" };

  it("zero-pads surah and ayah to 3 digits each, with no separator", () => {
    expect(ayahAudioUrl(alafasy, 1, 1)).toBe("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
  });

  it("handles a 3-digit surah and ayah without truncation", () => {
    expect(ayahAudioUrl(alafasy, 114, 6)).toBe("https://everyayah.com/data/Alafasy_128kbps/114006.mp3");
    expect(ayahAudioUrl(alafasy, 2, 286)).toBe("https://everyayah.com/data/Alafasy_128kbps/002286.mp3");
  });
});
