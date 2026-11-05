import type { ProgressState } from "@manarah/core";
import { SURAHS } from "@manarah/data";
import { ProgressCard, QuizGame, useTranslation } from "@manarah/ui";

export interface ChallengePageProps {
  progress: ProgressState;
  /** Awards points for one quiz answer and returns what it earned. */
  onQuizAnswer: (correct: boolean) => number;
}

/** Progress and the Quran quiz. Personal only — nothing here is ranked against anyone. */
export function ChallengePage({ progress, onQuizAnswer }: ChallengePageProps) {
  const { t } = useTranslation();
  return (
    <div className="challenge-grid">
      <div>
        <ProgressCard progress={progress} today={new Date()} showBadges />
        <p className="challenge-note">{t("progress.private")}</p>
      </div>
      <QuizGame surahs={SURAHS} onAnswer={onQuizAnswer} />
    </div>
  );
}
