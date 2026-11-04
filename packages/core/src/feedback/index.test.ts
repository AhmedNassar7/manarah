import { describe, expect, it } from "vitest";
import { buildFeedbackMessage, feedbackTitle, githubIssueUrl, normalizeRating } from "./index.js";

describe("normalizeRating", () => {
  it("accepts whole ratings 1 to 5, rounding fractions", () => {
    expect(normalizeRating(5)).toBe(5);
    expect(normalizeRating(1)).toBe(1);
    expect(normalizeRating(3.6)).toBe(4);
  });

  it("treats anything else as not rated", () => {
    for (const bad of [0, 6, -1, NaN, Infinity, "5", null, undefined, {}]) expect(normalizeRating(bad), String(bad)).toBeUndefined();
  });
});

describe("buildFeedbackMessage", () => {
  it("puts the text first and the context after a divider", () => {
    const message = buildFeedbackMessage({ kind: "suggestion", text: "  Add more reciters  ", rating: 4, appVersion: "0.0.1", language: "ar" }, "Chrome");
    expect(message).toBe("Add more reciters\n\n---\nRating: 4/5\nApp version: 0.0.1\nLanguage: ar\nDevice: Chrome");
  });

  it("is just the text when there is no context", () => {
    expect(buildFeedbackMessage({ kind: "problem", text: "It froze" })).toBe("It froze");
  });

  it("leaves out an invalid rating", () => {
    expect(buildFeedbackMessage({ kind: "praise", text: "Great", rating: 9 })).toBe("Great");
  });
});

describe("feedbackTitle", () => {
  it("labels the kind and quotes the start of the text", () => {
    expect(feedbackTitle({ kind: "problem", text: "The compass is wrong\nmore detail" })).toBe("Problem: The compass is wrong");
  });

  it("caps a long first line so it fits an issue title", () => {
    const title = feedbackTitle({ kind: "suggestion", text: "x".repeat(200) });
    expect(title.length).toBeLessThanOrEqual("Suggestion: ".length + 60);
    expect(title.endsWith("…")).toBe(true);
  });

  it("is just the kind when there is no text", () => {
    expect(feedbackTitle({ kind: "praise", text: "" })).toBe("Praise");
  });
});

describe("githubIssueUrl", () => {
  const draft = { kind: "suggestion" as const, text: "Add Urdu & Persian", rating: 5 };

  it("builds a prefilled new-issue link, tolerating a trailing slash or .git", () => {
    for (const repo of ["https://github.com/o/r", "https://github.com/o/r/", "https://github.com/o/r.git"]) {
      expect(githubIssueUrl(repo, draft).startsWith("https://github.com/o/r/issues/new?")).toBe(true);
    }
  });

  it("encodes the title and body safely", () => {
    const url = new URL(githubIssueUrl("https://github.com/o/r", draft));
    expect(url.searchParams.get("title")).toBe("Suggestion: Add Urdu & Persian");
    expect(url.searchParams.get("body")).toContain("Add Urdu & Persian");
    expect(url.searchParams.get("body")).toContain("Rating: 5/5");
  });
});
