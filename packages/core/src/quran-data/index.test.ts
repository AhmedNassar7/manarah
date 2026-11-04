import { describe, expect, it } from "vitest";
import {
  ayahAudioUrl,
  pickRandomVerse,
  reciterStyles,
  resolveReciterStyle,
  translationAudioUrl,
  type Reciter,
  type TranslationAudio,
  type Verse,
} from "./index.js";

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

describe("reciter styles", () => {
  const husary: Reciter = {
    id: "husary",
    everyAyahSubfolder: "Husary_128kbps",
    styles: { mujawwad: "Husary_128kbps_Mujawwad", muallim: "Husary_Muallim_128kbps" },
  };
  const alafasy: Reciter = { id: "alafasy", everyAyahSubfolder: "Alafasy_128kbps" };

  it("lists murattal first, then whatever else the sheikh has", () => {
    expect(reciterStyles(alafasy)).toEqual(["murattal"]);
    expect(reciterStyles(husary)).toEqual(["murattal", "mujawwad", "muallim"]);
  });

  it("builds each style's URL from its own folder", () => {
    expect(ayahAudioUrl(husary, 1, 1)).toBe("https://everyayah.com/data/Husary_128kbps/001001.mp3");
    expect(ayahAudioUrl(husary, 1, 1, "mujawwad")).toBe("https://everyayah.com/data/Husary_128kbps_Mujawwad/001001.mp3");
    expect(ayahAudioUrl(husary, 2, 255, "muallim")).toBe("https://everyayah.com/data/Husary_Muallim_128kbps/002255.mp3");
  });

  it("falls back to the murattal folder rather than a broken URL for a style the sheikh doesn't have", () => {
    expect(ayahAudioUrl(alafasy, 1, 1, "mujawwad")).toBe("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
  });

  it("resolves a requested style to murattal when this sheikh doesn't have it, and keeps it when they do", () => {
    expect(resolveReciterStyle(husary, "muallim")).toBe("muallim");
    expect(resolveReciterStyle(alafasy, "muallim")).toBe("murattal");
    expect(resolveReciterStyle(husary, undefined)).toBe("murattal");
  });
});

describe("translationAudioUrl", () => {
  const english: TranslationAudio = { id: "en", language: "en", everyAyahSubfolder: "English/Sahih_Intnl_Ibrahim_Walk_192kbps" };

  it("uses the same verse-file naming, under the translation's folder path", () => {
    expect(translationAudioUrl(english, 2, 255)).toBe("https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/002255.mp3");
  });
});
