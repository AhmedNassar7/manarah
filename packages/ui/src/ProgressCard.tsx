import { BADGES, currentStreak, levelFor, recentDays, type ProgressState } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface ProgressCardProps {
  progress: ProgressState;
  /** Today's date (local). */
  today: Date;
  /** Show the earned and still-locked badges (the Challenge page does; Home keeps the card small). */
  showBadges?: boolean;
}

/** The personal progress summary: level and how far to the next, the current streak, the last seven days, and (optionally) badges. Never compared with anyone. */
export function ProgressCard({ progress, today, showBadges = false }: ProgressCardProps) {
  const { t, language } = useTranslation();
  const level = levelFor(progress.points);
  const streak = currentStreak(progress, today);
  const week = recentDays(progress, today, 7);
  const earned = new Set(progress.badges);

  return (
    <section className="progress-card" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="progress-card-top">
        <div className="progress-level" aria-hidden="true">
          <Icon name="trophy" size={24} />
        </div>
        <div className="progress-level-text">
          <p className="progress-level-name">{t("progress.level", { level: level.level })}</p>
          <p className="progress-points">{t("progress.points", { points: progress.points })}</p>
        </div>
        <div className={streak > 0 ? "progress-streak on" : "progress-streak"}>
          <Icon name="flame" size={20} />
          <span>{streak > 0 ? t("progress.streak", { count: streak }) : t("progress.streakNone")}</span>
        </div>
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={level.span}
        aria-valuenow={level.into}
        aria-label={t("progress.toNext", { n: level.span - level.into, next: level.level + 1 })}
      >
        <span style={{ width: `${level.fraction * 100}%` }} />
      </div>
      <p className="progress-next">{t("progress.toNext", { n: level.span - level.into, next: level.level + 1 })}</p>

      <ul className="progress-week" aria-label={t("progress.week")}>
        {week.map((d) => (
          <li key={d.key} className={[d.active ? "active" : "", d.isToday ? "today" : ""].filter(Boolean).join(" ") || undefined} title={d.key}>
            {d.active && <Icon name="check" size={16} />}
          </li>
        ))}
      </ul>

      {showBadges && (
        <>
          <h4>{t("progress.badges", { count: progress.badges.length })}</h4>
          <ul className="progress-badges">
            {BADGES.map((b) => (
              <li key={b.id} className={earned.has(b.id) ? "earned" : "locked"}>
                <span className="badge-icon" aria-hidden="true">
                  <Icon name={earned.has(b.id) ? "award" : "target"} size={20} />
                </span>
                <span className="badge-text">
                  <strong>{t(`badge.${b.id}`)}</strong>
                  <small>{t(`badge.${b.id}.desc`)}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
