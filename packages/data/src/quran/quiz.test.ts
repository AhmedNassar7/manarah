import { describe, expect, it } from "vitest";
import { generateQuiz, generateQuestion, isAnswerKeyCorrect, seededRandom } from "@manarah/core";
import { SURAHS } from "./index.js";

describe("quiz questions generated from the real surah data", () => {
  it("has a correct answer key for every one of 2,000 random questions over all 114 surahs", () => {
    let wrong = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const q = generateQuestion(SURAHS, seededRandom(seed));
      if (!isAnswerKeyCorrect(q, SURAHS)) wrong++;
    }
    expect(wrong).toBe(0);
  });

  it("makes full rounds of distinct, well-formed questions", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const round = generateQuiz(SURAHS, 10, seededRandom(seed));
      expect(round).toHaveLength(10);
      for (const q of round) {
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.surah).toBeGreaterThanOrEqual(1);
        expect(q.surah).toBeLessThanOrEqual(114);
      }
    }
  });

  it("never asks 'which surah comes after' about An-Nas, the last one", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const q = generateQuestion(SURAHS, seededRandom(seed), "next-surah");
      expect(q.surah).toBeLessThan(114);
    }
  });

  it("knows well-known facts: Al-Fatiha has 7 verses and Al-Baqarah is Medinan, number 2", () => {
    const fatiha = SURAHS.find((s) => s.number === 1)!;
    const baqarah = SURAHS.find((s) => s.number === 2)!;
    expect(fatiha.verseCount).toBe(7);
    expect(baqarah.revelationType).toBe("Medinan");
    expect(baqarah.verseCount).toBe(286);
  });
});
