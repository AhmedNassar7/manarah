import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyEvent,
  emptyProgress,
  seededRandom,
  type DailyPrayerTimes,
  type EventResult,
  type ProgressState,
  type Surah,
} from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { encouragementText } from "./encouragement.js";
import { PrayerTracker } from "./PrayerTracker.js";
import { ProgressCard } from "./ProgressCard.js";
import { QuizGame } from "./QuizGame.js";
import { Toast } from "./Toast.js";
import { translate } from "./i18n/translations.js";

afterEach(() => vi.useRealTimers());

const at = (h: number, m = 0) => new Date(2026, 5, 10, h, m);
const times: DailyPrayerTimes = {
  fajr: at(4, 0),
  sunrise: at(5, 30),
  dhuhr: at(12, 0),
  asr: at(15, 30),
  maghrib: at(19, 0),
  isha: at(20, 30),
};

describe("PrayerTracker", () => {
  it("ticks a prayer whose time has come and reports it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(13, 0));
    const onToggle = vi.fn();
    render(<PrayerTracker todaysTimes={times} done={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Dhuhr/ }));
    expect(onToggle).toHaveBeenCalledWith("dhuhr", true);
  });

  it("keeps a prayer disabled until its time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(13, 0));
    render(<PrayerTracker todaysTimes={times} done={[]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Maghrib/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Fajr/ })).toBeEnabled();
  });

  it("shows done prayers as pressed, lets them be undone, and counts them", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(13, 0));
    const onToggle = vi.fn();
    render(<PrayerTracker todaysTimes={times} done={["fajr"]} onToggle={onToggle} />);
    const fajr = screen.getByRole("button", { name: /Fajr/ });
    expect(fajr).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1 of 5 today")).toBeInTheDocument();
    fireEvent.click(fajr);
    expect(onToggle).toHaveBeenCalledWith("fajr", false);
  });

  it("opens a done prayer even if the clock is somehow before its time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(3, 0));
    render(<PrayerTracker todaysTimes={times} done={["isha"]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Isha/ })).toBeEnabled();
  });
});

describe("ProgressCard", () => {
  const today = new Date(2026, 5, 10, 12);

  it("shows level, points and an invitation to start a streak", () => {
    render(<ProgressCard progress={emptyProgress()} today={today} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("0 points")).toBeInTheDocument();
    expect(screen.getByText("Start your streak today")).toBeInTheDocument();
  });

  it("shows the streak once there is one", () => {
    let progress: ProgressState = emptyProgress();
    progress = applyEvent(progress, { type: "prayer", prayer: "fajr", done: true }, new Date(2026, 5, 9, 12)).state;
    progress = applyEvent(progress, { type: "prayer", prayer: "fajr", done: true }, today).state;
    render(<ProgressCard progress={progress} today={today} />);
    expect(screen.getByText("2-day streak")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("lists badges, earned and locked, only when asked", () => {
    const earned = applyEvent(emptyProgress(), { type: "prayer", prayer: "fajr", done: true }, today).state;
    const { unmount } = render(<ProgressCard progress={earned} today={today} />);
    expect(screen.queryByText("First prayer")).not.toBeInTheDocument();
    unmount();
    render(<ProgressCard progress={earned} today={today} showBadges />);
    expect(screen.getByText("First prayer").closest("li")).toHaveClass("earned");
    expect(screen.getByText("A full week").closest("li")).toHaveClass("locked");
  });
});

describe("QuizGame", () => {
  // A synthetic list, enough for every question kind to build its options (the real corpus is checked in the data package).
  const surahs: Surah[] = Array.from({ length: 30 }, (_, i) => ({
    number: i + 1,
    nameArabic: `سورة${i + 1}`,
    nameTransliterated: `Surah${i + 1}`,
    revelationType: i % 2 ? "Medinan" : "Meccan",
    verseCount: 5 + i * 3,
  }));

  it("starts from an intro and shows the first question", () => {
    render(<QuizGame surahs={surahs} onAnswer={() => 0} random={seededRandom(1)} />);
    expect(screen.getByText(/10 questions about the surahs/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByText("Question 1 of 10")).toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
  });

  it("reports each answer once and reveals right or wrong", () => {
    const onAnswer = vi.fn(() => 5);
    render(<QuizGame surahs={surahs} onAnswer={onAnswer} random={seededRandom(2)} />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    const group = screen.getByRole("group");
    const options = group.querySelectorAll("button");
    fireEvent.click(options[0]);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    // Answering twice is ignored: the options are disabled.
    expect(options[0]).toBeDisabled();
    fireEvent.click(options[1]);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(group.querySelector(".correct")).not.toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("plays a whole round, totals the points and can be played again", () => {
    const onAnswer = vi.fn((correct: boolean) => (correct ? 5 : 0));
    render(<QuizGame surahs={surahs} onAnswer={onAnswer} questionCount={3} random={seededRandom(3)} />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    for (let i = 0; i < 3; i++) {
      const group = screen.getByRole("group");
      fireEvent.click(group.querySelectorAll("button")[0]);
      fireEvent.click(screen.getByRole("button", { name: i === 2 ? /See your result/ : /Next/ }));
    }
    expect(onAnswer).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/of 3 correct/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
  });

  it("counts the points returned by onAnswer in the result", () => {
    render(<QuizGame surahs={surahs} onAnswer={() => 5} questionCount={1} random={seededRandom(4)} />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    fireEvent.click(screen.getByRole("group").querySelectorAll("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /See your result/ }));
    expect(screen.getByText("+5 points")).toBeInTheDocument();
  });

  it("asks in Arabic with Arabic surah names", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <QuizGame surahs={surahs} onAnswer={() => 0} random={seededRandom(5)} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ابدأ" }));
    expect(screen.getByText(/السؤال 1 من 10/)).toBeInTheDocument();
  });
});

describe("Toast", () => {
  it("shows its message, then dismisses itself", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Well done" id={1} onDismiss={onDismiss} duration={1000} />);
    expect(screen.getByRole("status")).toHaveTextContent("Well done");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("restarts the timer when a new message arrives", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast message="One" id={1} onDismiss={onDismiss} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    rerender(<Toast message="Two" id={2} onDismiss={onDismiss} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without a message", () => {
    render(<Toast message={undefined} id={0} onDismiss={() => {}} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("encouragementText", () => {
  const en = (key: string, vars?: Record<string, string | number>) => translate("en", key, vars);
  const ar = (key: string, vars?: Record<string, string | number>) => translate("ar", key, vars);
  const base: EventResult = {
    state: emptyProgress(),
    pointsDelta: 0,
    newBadges: [],
    encouragement: "none",
    variant: 0,
  };

  it("says nothing when there is nothing to celebrate", () => {
    expect(encouragementText(base, en)).toBeUndefined();
  });

  it("has a message for every kind and variant, in both languages, with no placeholders left", () => {
    for (const kind of ["prayer", "all-five", "azkar", "quiz-correct", "quiz-wrong"] as const) {
      for (let variant = 0; variant < 3; variant++) {
        for (const t of [en, ar]) {
          const text = encouragementText({ ...base, encouragement: kind, variant }, t);
          expect(text, `${kind}.${variant}`).toBeTruthy();
          expect(text).not.toContain("progress.msg");
          expect(text).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it("puts the streak length and the badge name into their messages", () => {
    expect(encouragementText({ ...base, encouragement: "streak", streak: 7, variant: 0 }, en)).toContain("7");
    const badge = encouragementText({ ...base, encouragement: "badge", newBadges: ["first-prayer"], variant: 0 }, en);
    expect(badge).toContain("First prayer");
    const arabic = encouragementText({ ...base, encouragement: "badge", newBadges: ["first-prayer"], variant: 0 }, ar);
    expect(arabic).toContain("أول صلاة");
  });

  it("has a name and description for every badge in both languages", async () => {
    const { BADGES } = await import("@manarah/core");
    for (const b of BADGES) {
      for (const t of [en, ar]) {
        expect(t(`badge.${b.id}`)).not.toBe(`badge.${b.id}`);
        expect(t(`badge.${b.id}.desc`)).not.toBe(`badge.${b.id}.desc`);
      }
    }
  });
});
