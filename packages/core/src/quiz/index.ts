import type { Surah } from "../quran-data/index.js";

/**
 * A Quran quiz whose questions are generated from the bundled surah data —
 * every answer is derived from the same facts the app already shows (a
 * surah's number, name, verse count, where it was revealed), so a question
 * can never have a wrong answer key. Pure and deterministic given an `rng`.
 */

export type QuizKind = "surah-by-number" | "number-of-surah" | "verse-count" | "revelation" | "next-surah";

export interface QuizQuestion {
  kind: QuizKind;
  /** The surah the question is about (or, for "surah-by-number", whose number is asked about). */
  surah: number;
  /** What the choices are: surah numbers (shown as names), plain numbers, or "Meccan"/"Medinan". */
  optionType: "surah" | "number" | "revelation";
  options: Array<number | string>;
  answerIndex: number;
}

/** A small seedable random number generator (mulberry32), so quizzes can be reproduced in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const pick = <T>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)];

/** Four distinct choices including the answer, in random order. Distractors come from `pool`. */
function withDistractors<T>(answer: T, pool: T[], rng: () => number, count = 4): { options: T[]; answerIndex: number } {
  const others = shuffle(pool.filter((p) => p !== answer), rng).slice(0, count - 1);
  const options = shuffle([answer, ...others], rng);
  return { options, answerIndex: options.indexOf(answer) };
}

/** Distinct numbers near `answer` (never 0 or negative), so the distractors look plausible. */
function nearbyNumbers(answer: number, rng: () => number): number[] {
  const set = new Set<number>();
  const spread = Math.max(3, Math.round(answer * 0.35));
  for (let guard = 0; set.size < 8 && guard < 200; guard++) {
    const candidate = answer + Math.round((rng() * 2 - 1) * spread);
    if (candidate >= 1 && candidate !== answer) set.add(candidate);
  }
  // A tiny answer (e.g. 3) has few positive neighbours: top up so there are always enough distractors.
  for (let n = 1; set.size < 8; n++) if (n !== answer) set.add(n);
  return [...set];
}

/** One question. Throws only if given an empty or too-small surah list. */
export function generateQuestion(surahs: Surah[], rng: () => number, kind?: QuizKind): QuizQuestion {
  if (surahs.length < 4) throw new Error("A quiz needs at least four surahs");
  const kinds: QuizKind[] = ["surah-by-number", "number-of-surah", "verse-count", "revelation", "next-surah"];
  const chosen = kind ?? pick(kinds, rng);
  const numbers = surahs.map((s) => s.number);

  if (chosen === "next-surah") {
    const candidates = surahs.filter((s) => s.number < surahs[surahs.length - 1].number);
    const subject = pick(candidates, rng);
    const answer = subject.number + 1;
    const { options, answerIndex } = withDistractors(answer, numbers.filter((n) => n !== subject.number), rng);
    return { kind: chosen, surah: subject.number, optionType: "surah", options, answerIndex };
  }

  const subject = pick(surahs, rng);

  if (chosen === "surah-by-number") {
    const { options, answerIndex } = withDistractors(subject.number, numbers, rng);
    return { kind: chosen, surah: subject.number, optionType: "surah", options, answerIndex };
  }
  if (chosen === "number-of-surah") {
    const { options, answerIndex } = withDistractors(subject.number, nearbyNumbers(subject.number, rng), rng);
    return { kind: chosen, surah: subject.number, optionType: "number", options, answerIndex };
  }
  if (chosen === "verse-count") {
    const { options, answerIndex } = withDistractors(subject.verseCount, nearbyNumbers(subject.verseCount, rng), rng);
    return { kind: chosen, surah: subject.number, optionType: "number", options, answerIndex };
  }
  // revelation
  const options = shuffle(["Meccan", "Medinan"], rng);
  return { kind: "revelation", surah: subject.number, optionType: "revelation", options, answerIndex: options.indexOf(subject.revelationType) };
}

/** The same question twice in one round would be dull: identify a question by what it asks. */
const questionKey = (q: QuizQuestion) => `${q.kind}:${q.surah}`;

/** A round of `count` different questions. */
export function generateQuiz(surahs: Surah[], count: number, rng: () => number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (let guard = 0; questions.length < count && guard < count * 50; guard++) {
    const q = generateQuestion(surahs, rng);
    if (seen.has(questionKey(q))) continue;
    seen.add(questionKey(q));
    questions.push(q);
  }
  return questions;
}

/** Checks a question's answer key against the surah data — used by tests, and cheap enough to assert in development. */
export function isAnswerKeyCorrect(q: QuizQuestion, surahs: Surah[]): boolean {
  const subject = surahs.find((s) => s.number === q.surah);
  if (!subject || q.answerIndex < 0 || q.answerIndex >= q.options.length) return false;
  const answer = q.options[q.answerIndex];
  switch (q.kind) {
    case "surah-by-number":
    case "number-of-surah":
      return answer === subject.number;
    case "verse-count":
      return answer === subject.verseCount;
    case "revelation":
      return answer === subject.revelationType;
    case "next-surah":
      return answer === subject.number + 1;
  }
}
