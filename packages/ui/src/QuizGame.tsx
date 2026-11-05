import { useState } from "react";
import { generateQuiz, type QuizQuestion, type Surah } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface QuizGameProps {
  surahs: Surah[];
  /** Called once per answer. Returns the points that answer earned (for the round's total). */
  onAnswer: (correct: boolean) => number;
  questionCount?: number;
  /** Injectable for tests. */
  random?: () => number;
}

type Phase = "intro" | "playing" | "done";

/**
 * A short Quran quiz: ten questions about the surahs — numbers, names, verse
 * counts, where each was revealed. Answers come from the app's own surah data,
 * so the key is never wrong; each right answer earns points, and a wrong one
 * simply shows the answer. No timer and no ranking: it is for learning.
 */
export function QuizGame({ surahs, onAnswer, questionCount = 10, random = Math.random }: QuizGameProps) {
  const { t, language } = useTranslation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);

  const surahName = (n: number) => {
    const s = surahs.find((x) => x.number === n);
    return s ? (language === "ar" ? s.nameArabic : s.nameTransliterated) : String(n);
  };

  function optionLabel(question: QuizQuestion, option: number | string): string {
    if (question.optionType === "surah") return surahName(option as number);
    if (question.optionType === "revelation") return t(`quiz.opt.${option}`);
    return String(option);
  }

  function start() {
    setRound(generateQuiz(surahs, questionCount, random));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setPoints(0);
    setPhase("playing");
  }

  function choose(question: QuizQuestion, optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    const correct = optionIndex === question.answerIndex;
    if (correct) setScore((s) => s + 1);
    setPoints((p) => p + onAnswer(correct));
  }

  function next() {
    if (index + 1 >= round.length) {
      setPhase("done");
    } else {
      setIndex(index + 1);
      setSelected(null);
    }
  }

  const dir = language === "ar" ? "rtl" : "ltr";

  if (phase === "intro") {
    return (
      <section className="quiz" dir={dir} lang={language}>
        <h3>{t("quiz.title")}</h3>
        <p>{t("quiz.intro", { count: questionCount })}</p>
        <button type="button" className="quiz-primary" onClick={start}>
          <Icon name="play" size={16} filled /> {t("quiz.start")}
        </button>
      </section>
    );
  }

  if (phase === "done") {
    const tier = score >= round.length * 0.9 ? "high" : score >= round.length * 0.6 ? "mid" : "low";
    return (
      <section className="quiz quiz-done" dir={dir} lang={language}>
        <h3>{t("quiz.title")}</h3>
        <p className="quiz-score">{t("quiz.score", { score, total: round.length })}</p>
        <p className="quiz-points">{t("quiz.points", { points })}</p>
        <p>{t(`quiz.result.${tier}`)}</p>
        <button type="button" className="quiz-primary" onClick={start}>
          <Icon name="refresh" size={16} /> {t("quiz.again")}
        </button>
      </section>
    );
  }

  const question = round[index];
  const answered = selected !== null;
  const subject = surahName(question.surah);
  const prompt =
    question.kind === "surah-by-number" ? t("quiz.q.surah-by-number", { n: question.surah }) : t(`quiz.q.${question.kind}`, { name: subject });

  return (
    <section className="quiz" dir={dir} lang={language}>
      <div className="quiz-head">
        <h3>{t("quiz.title")}</h3>
        <span>{t("quiz.question", { n: index + 1, total: round.length })}</span>
      </div>
      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${((index + (answered ? 1 : 0)) / round.length) * 100}%` }} />
      </div>

      <p className="quiz-prompt">{prompt}</p>
      <ul className="quiz-options" role="group" aria-label={prompt}>
        {question.options.map((option, i) => {
          const state = !answered ? undefined : i === question.answerIndex ? "correct" : i === selected ? "wrong" : "dim";
          return (
            <li key={String(option)}>
              <button type="button" className={state} disabled={answered} onClick={() => choose(question, i)}>
                <span dir={question.optionType === "number" ? "ltr" : undefined}>{optionLabel(question, option)}</span>
                {state === "correct" && <Icon name="check" size={20} />}
                {state === "wrong" && <Icon name="close" size={20} />}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="quiz-feedback" role="status">
          <p>
            {selected === question.answerIndex
              ? t("quiz.right")
              : t("quiz.correctAnswer", { answer: optionLabel(question, question.options[question.answerIndex]) })}
          </p>
          <button type="button" className="quiz-primary" onClick={next}>
            {index + 1 >= round.length ? t("quiz.finish") : t("quiz.next")}
          </button>
        </div>
      )}
    </section>
  );
}
