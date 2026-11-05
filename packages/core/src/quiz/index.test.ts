import { describe, expect, it } from "vitest";
import type { Surah } from "../quran-data/index.js";
import { generateQuestion, generateQuiz, isAnswerKeyCorrect, seededRandom, type QuizKind } from "./index.js";

/** A realistic spread of surah facts (number, verse count, revelation), enough to exercise every question type. */
const FACTS: Array<[number, number, "Meccan" | "Medinan"]> = [
  [1, 7, "Meccan"],
  [2, 286, "Medinan"],
  [3, 200, "Medinan"],
  [4, 176, "Medinan"],
  [5, 120, "Medinan"],
  [6, 165, "Meccan"],
  [7, 206, "Meccan"],
  [8, 75, "Medinan"],
  [9, 129, "Medinan"],
  [10, 109, "Meccan"],
  [103, 3, "Meccan"],
  [108, 3, "Meccan"],
  [110, 3, "Medinan"],
  [112, 4, "Meccan"],
  [113, 5, "Meccan"],
  [114, 6, "Meccan"],
];
const surahs: Surah[] = FACTS.map(([number, verseCount, revelationType]) => ({
  number,
  nameArabic: `سورة ${number}`,
  nameTransliterated: `Surah ${number}`,
  revelationType,
  verseCount,
}));
// "next-surah" needs consecutive numbers: make the list contiguous for those tests.
const contiguous: Surah[] = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  nameArabic: `س${i + 1}`,
  nameTransliterated: `S${i + 1}`,
  revelationType: i % 3 === 0 ? "Medinan" : "Meccan",
  verseCount: 3 + ((i * 7) % 90),
}));

const KINDS: QuizKind[] = ["surah-by-number", "number-of-surah", "verse-count", "revelation", "next-surah"];

describe("seededRandom", () => {
  it("is reproducible for a seed and stays in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const values = Array.from({ length: 50 }, () => a());
    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe("generateQuestion", () => {
  it.each(KINDS)("%s: its answer key is always right, over many random questions", (kind) => {
    const data = kind === "next-surah" ? contiguous : surahs;
    for (let seed = 1; seed <= 300; seed++) {
      const q = generateQuestion(data, seededRandom(seed), kind);
      expect(q.kind).toBe(kind);
      expect(isAnswerKeyCorrect(q, data), `seed ${seed}: ${JSON.stringify(q)}`).toBe(true);
    }
  });

  it.each(KINDS)("%s: has distinct options, with the answer among them", (kind) => {
    const data = kind === "next-surah" ? contiguous : surahs;
    for (let seed = 1; seed <= 300; seed++) {
      const q = generateQuestion(data, seededRandom(seed), kind);
      expect(new Set(q.options).size, `seed ${seed}`).toBe(q.options.length);
      expect(q.options.length).toBe(kind === "revelation" ? 2 : 4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
    }
  });

  it("never offers a number below 1 as a distractor, even for a tiny answer like 3", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = generateQuestion(surahs, seededRandom(seed), "verse-count");
      for (const option of q.options) expect(option as number).toBeGreaterThanOrEqual(1);
    }
  });

  it("asks about the next surah only for a surah that has one", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = generateQuestion(contiguous, seededRandom(seed), "next-surah");
      expect(q.surah).toBeLessThan(contiguous.length);
    }
  });

  it("puts the answer in different positions, not always first", () => {
    const positions = new Set(Array.from({ length: 80 }, (_, seed) => generateQuestion(surahs, seededRandom(seed + 1), "surah-by-number").answerIndex));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it("is deterministic for a seed", () => {
    expect(generateQuestion(surahs, seededRandom(7))).toEqual(generateQuestion(surahs, seededRandom(7)));
  });

  it("refuses a surah list too small to make four choices", () => {
    expect(() => generateQuestion(surahs.slice(0, 3), seededRandom(1))).toThrow();
  });
});

describe("generateQuiz", () => {
  it("makes a round of the requested size, with every answer key correct", () => {
    const round = generateQuiz(contiguous, 10, seededRandom(5));
    expect(round).toHaveLength(10);
    for (const q of round) expect(isAnswerKeyCorrect(q, contiguous)).toBe(true);
  });

  it("never repeats the same question in a round", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const round = generateQuiz(contiguous, 10, seededRandom(seed));
      const keys = round.map((q) => `${q.kind}:${q.surah}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("mixes question types across a round", () => {
    const kinds = new Set(generateQuiz(contiguous, 10, seededRandom(9)).map((q) => q.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });
});

describe("isAnswerKeyCorrect", () => {
  it("rejects a wrong key, an out-of-range index and an unknown surah", () => {
    const good = generateQuestion(surahs, seededRandom(3), "verse-count");
    expect(isAnswerKeyCorrect(good, surahs)).toBe(true);
    expect(isAnswerKeyCorrect({ ...good, answerIndex: (good.answerIndex + 1) % good.options.length }, surahs)).toBe(false);
    expect(isAnswerKeyCorrect({ ...good, answerIndex: 9 }, surahs)).toBe(false);
    expect(isAnswerKeyCorrect({ ...good, surah: 999 }, surahs)).toBe(false);
  });
});
