/**
 * Rating and feedback — with no server, nothing is "submitted": the user's
 * rating stays on their device, and feedback is composed as plain text they
 * can copy, share or open as a prefilled GitHub issue. Pure helpers only.
 */

export type FeedbackKind = "suggestion" | "problem" | "praise";

export const FEEDBACK_KINDS: readonly FeedbackKind[] = ["suggestion", "problem", "praise"];

export const MAX_RATING = 5;

/** A whole rating from 1 to 5, or undefined for anything else (so a bad stored value shows as "not rated"). */
export function normalizeRating(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded >= 1 && rounded <= MAX_RATING ? rounded : undefined;
}

export interface FeedbackDraft {
  kind: FeedbackKind;
  text: string;
  rating?: number;
  appVersion?: string;
  language?: string;
}

const KIND_LABELS: Record<FeedbackKind, string> = {
  suggestion: "Suggestion",
  problem: "Problem",
  praise: "Praise",
};

/** The feedback as readable plain text, with the context a maintainer needs (version, language, device). */
export function buildFeedbackMessage(draft: FeedbackDraft, userAgent?: string): string {
  const lines = [draft.text.trim()];
  const rating = normalizeRating(draft.rating);
  const meta = [
    rating !== undefined ? `Rating: ${rating}/${MAX_RATING}` : undefined,
    draft.appVersion ? `App version: ${draft.appVersion}` : undefined,
    draft.language ? `Language: ${draft.language}` : undefined,
    userAgent ? `Device: ${userAgent}` : undefined,
  ].filter((line): line is string => line !== undefined);
  if (meta.length > 0) lines.push("", "---", ...meta);
  return lines.join("\n").trim();
}

/** A first line for a title: "Suggestion: …" from the first words of the text, capped so it fits an issue title. */
export function feedbackTitle(draft: FeedbackDraft): string {
  const firstLine = draft.text.trim().split(/\r?\n/)[0] ?? "";
  const snippet = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
  return `${KIND_LABELS[draft.kind]}${snippet ? `: ${snippet}` : ""}`;
}

/** A "new issue" URL with the title and body filled in. `repoUrl` is the repository's web address, with or without a trailing slash or ".git". */
export function githubIssueUrl(repoUrl: string, draft: FeedbackDraft, userAgent?: string): string {
  const base = repoUrl.replace(/\.git$/, "").replace(/\/+$/, "");
  const params = new URLSearchParams({ title: feedbackTitle(draft), body: buildFeedbackMessage(draft, userAgent) });
  return `${base}/issues/new?${params.toString()}`;
}
