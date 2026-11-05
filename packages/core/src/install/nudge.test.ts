import { describe, expect, it } from "vitest";
import { dismissInstallNudge, normalizeInstallNudge, shouldShowInstallNudge, type InstallNudgeInput } from "./nudge.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 5, 12);
const base: InstallNudgeInput = { state: { dismissals: 0 }, now: NOW, platform: "android", canPrompt: true, installed: false };

describe("shouldShowInstallNudge", () => {
  it("offers on the very first visit, on a phone and on a computer that can install", () => {
    expect(shouldShowInstallNudge(base)).toBe(true);
    expect(shouldShowInstallNudge({ ...base, platform: "ios", canPrompt: false })).toBe(true);
    expect(shouldShowInstallNudge({ ...base, platform: "desktop", canPrompt: true })).toBe(true);
  });

  it("never when the app is already installed", () => {
    expect(shouldShowInstallNudge({ ...base, installed: true })).toBe(false);
  });

  it("not on a computer browser that cannot install — there is nothing to offer", () => {
    expect(shouldShowInstallNudge({ ...base, platform: "desktop", canPrompt: false })).toBe(false);
  });

  it("goes quiet for 3 days after the first 'Not now', then 14 after the second, then stops", () => {
    let state = dismissInstallNudge({ dismissals: 0 }, NOW);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW + 3 * DAY - 1 })).toBe(false);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW + 3 * DAY })).toBe(true);

    state = dismissInstallNudge(state, NOW + 3 * DAY);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW + 3 * DAY + 14 * DAY - 1 })).toBe(false);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW + 3 * DAY + 14 * DAY })).toBe(true);

    state = dismissInstallNudge(state, NOW + 17 * DAY);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW + 400 * DAY })).toBe(false);
  });

  it("a clock set back does not silence it for ever", () => {
    const state = dismissInstallNudge({ dismissals: 0 }, NOW);
    expect(shouldShowInstallNudge({ ...base, state, now: NOW - 10 * DAY })).toBe(true);
  });
});

describe("normalizeInstallNudge", () => {
  it("reads good state and repairs anything else", () => {
    expect(normalizeInstallNudge({ dismissals: 2, lastDismissedAt: 123 })).toEqual({ dismissals: 2, lastDismissedAt: 123 });
    expect(normalizeInstallNudge(null)).toEqual({ dismissals: 0 });
    expect(normalizeInstallNudge("x")).toEqual({ dismissals: 0 });
    expect(normalizeInstallNudge({ dismissals: -4, lastDismissedAt: "no" })).toEqual({ dismissals: 0 });
    expect(normalizeInstallNudge({ dismissals: 1.9, lastDismissedAt: 5 })).toEqual({ dismissals: 1, lastDismissedAt: 5 });
  });
});
