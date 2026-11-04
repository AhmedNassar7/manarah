import { useState } from "react";
import {
  FEEDBACK_KINDS,
  MAX_RATING,
  buildFeedbackMessage,
  githubIssueUrl,
  normalizeRating,
  type FeedbackKind,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface FeedbackFormProps {
  /** The user's rating (1-5), if given. */
  rating: number | undefined;
  onRatingChange: (rating: number) => void;
  appVersion?: string;
  /** The project's repository address; when given, feedback can be opened as a prefilled issue. */
  repositoryUrl?: string;
}

/**
 * Rate the app and send feedback. There's no server, so nothing is "sent":
 * the rating is kept on the device, and feedback is composed as text to copy,
 * share, or open as a prefilled GitHub issue — each action honest about what
 * it does.
 */
export function FeedbackForm({ rating, onRatingChange, appVersion, repositoryUrl }: FeedbackFormProps) {
  const { t, language } = useTranslation();
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState<number | undefined>(undefined);

  const current = normalizeRating(rating);
  const shown = hover ?? current ?? 0;
  const draft = { kind, text, rating: current, appVersion, language };
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const hasText = text.trim().length > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildFeedbackMessage(draft, userAgent));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable or denied — nothing useful to show.
    }
  }

  async function share() {
    try {
      await navigator.share({ text: buildFeedbackMessage(draft, userAgent) });
    } catch {
      // Dismissing the share sheet rejects with AbortError — not worth surfacing.
    }
  }

  return (
    <div className="feedback-form" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div>
        <p className="feedback-label" id="feedback-rating-label">
          {t("feedback.rate")}
        </p>
        <div className="rating-stars" role="radiogroup" aria-labelledby="feedback-rating-label" onMouseLeave={() => setHover(undefined)}>
          {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={current === n}
              aria-label={t("feedback.stars", { n })}
              className={n <= shown ? "star on" : "star"}
              onMouseEnter={() => setHover(n)}
              onClick={() => onRatingChange(n)}
            >
              <Icon name="star" size={24} filled={n <= shown} />
            </button>
          ))}
        </div>
        {current !== undefined && <p className="feedback-thanks">{t(`feedback.thanks.${current}`)}</p>}
      </div>

      <div className="feedback-kinds" role="radiogroup" aria-label={t("feedback.kind")}>
        {FEEDBACK_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "active" : undefined} onClick={() => setKind(k)}>
            {t(`feedback.kind.${k}`)}
          </button>
        ))}
      </div>

      <textarea
        aria-label={t("feedback.message")}
        placeholder={t("feedback.placeholder")}
        value={text}
        rows={4}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="feedback-actions">
        <button type="button" disabled={!hasText} onClick={() => void copy()}>
          <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? t("verseActions.copied") : t("verseActions.copy")}
        </button>
        {canShare && (
          <button type="button" disabled={!hasText} onClick={() => void share()}>
            <Icon name="share" size={16} /> {t("verseActions.share")}
          </button>
        )}
        {repositoryUrl && (
          <a
            className={hasText ? undefined : "disabled"}
            aria-disabled={!hasText}
            href={hasText ? githubIssueUrl(repositoryUrl, draft, userAgent) : undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="arrow-right" size={16} /> {t("feedback.openIssue")}
          </a>
        )}
      </div>
      <p className="feedback-note">{t("feedback.note")}</p>
    </div>
  );
}
