import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AzkarCategory } from "@manarah/core";
import { AzkarList } from "./AzkarList.js";
import { LanguageProvider } from "./i18n/index.js";

const category: AzkarCategory = {
  id: "27",
  name: "Words of remembrance for morning and evening",
  trigger: "morning",
  items: [
    { id: "75", arabic: "أَعُوذُ بِاللَّهِ", translation: "I seek refuge in Allah", repeatCount: 3 },
    { id: "76", arabic: "سُبْحَانَ ٱللَّهِ", repeatCount: 1 },
  ],
};

describe("AzkarList", () => {
  it("renders the category name and every item's Arabic text", () => {
    render(<AzkarList category={category} />);
    expect(screen.getByRole("heading", { name: category.name })).toBeInTheDocument();
    expect(screen.getByText("أَعُوذُ بِاللَّهِ")).toBeInTheDocument();
    expect(screen.getByText("سُبْحَانَ ٱللَّهِ")).toBeInTheDocument();
  });

  it("is Arabic-only by default — the English translation is not shown unless asked for", () => {
    render(<AzkarList category={category} />);
    expect(screen.getByText("أَعُوذُ بِاللَّهِ")).toBeInTheDocument();
    expect(screen.queryByText("I seek refuge in Allah")).not.toBeInTheDocument();
  });

  it("shows the translation on request, only under the items that have one, and can hide it again", () => {
    render(<AzkarList category={category} />);
    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(screen.getByText("I seek refuge in Allah")).toBeInTheDocument();
    expect(document.querySelectorAll('p[lang="en"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Hide translation" }));
    expect(screen.queryByText("I seek refuge in Allah")).not.toBeInTheDocument();
  });

  it("offers no translation toggle when the category has no translations", () => {
    render(<AzkarList category={{ ...category, items: [category.items[1]] }} />);
    expect(screen.queryByRole("button", { name: /translation/i })).not.toBeInTheDocument();
  });

  it("follows a controlled showTranslation and reports toggles instead of owning the state", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AzkarList category={category} showTranslation={false} onShowTranslationChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText("I seek refuge in Allah")).not.toBeInTheDocument(); // nothing changes until the parent says so

    rerender(<AzkarList category={category} showTranslation onShowTranslationChange={onChange} />);
    expect(screen.getByText("I seek refuge in Allah")).toBeInTheDocument();
  });

  it("keeps the tally left-to-right so Arabic layouts don't reorder '0 / 3' into '3 / 0'", () => {
    render(<AzkarList category={category} />);
    for (const button of screen.getAllByRole("button", { name: /^\d+ \/ \d+$/ })) {
      expect(button).toHaveAttribute("dir", "ltr");
    }
  });

  describe("a dua made of several parts", () => {
    const riding: AzkarCategory = {
      id: "95",
      name: "Invocation for riding",
      nameArabic: "دعاء الركوب",
      trigger: "situational",
      items: [
        {
          id: "206",
          arabic: "((بِسْمِ اللَّهِ، وَالْحَمْدُ للَّهِ ﴿سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا﴾، ((الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ)).",
          translation: "(In the name of Allah.  How perfect He is.  All praise is for Allah.)",
          repeatCount: 1,
        },
      ],
    };

    it("shows each part on its own instead of one run-together block, with no source markers", () => {
      const { container } = render(<AzkarList category={riding} />);
      const parts = [...container.querySelectorAll(".azkar-part")];
      expect(parts.map((p) => p.className.replace("azkar-part ", ""))).toEqual(["azkar-part-dua", "azkar-part-quran", "azkar-part-dua"]);
      expect(container.textContent).not.toMatch(/\(\(|\)\)/);
      expect(parts[0]).toHaveTextContent("بِسْمِ اللَّهِ، وَالْحَمْدُ للَّهِ");
      expect(parts[2]).toHaveTextContent("الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ");
    });

    it("sets a verse between ornamental brackets that are decoration, not text for a screen reader", () => {
      const { container } = render(<AzkarList category={riding} />);
      const verse = container.querySelector(".azkar-part-quran")!;
      const brackets = verse.querySelectorAll(".azkar-bracket");
      expect(brackets).toHaveLength(2);
      for (const bracket of brackets) expect(bracket).toHaveAttribute("aria-hidden", "true");
      expect(verse).toHaveTextContent("سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا");
    });

    it("keeps one tally for the whole dua, not one per part", () => {
      render(<AzkarList category={riding} />);
      expect(screen.getAllByRole("button", { name: /^\d+ \/ \d+$/ })).toHaveLength(1);
    });

    it("shows the translation without its wrapping parentheses, and only when asked", () => {
      render(<AzkarList category={riding} />);
      expect(screen.queryByText(/How perfect He is/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
      expect(screen.getByText("In the name of Allah. How perfect He is. All praise is for Allah.")).toBeInTheDocument();
    });
  });

  describe("variants and instructions", () => {
    const morning: AzkarCategory = {
      id: "27",
      name: "Morning",
      trigger: "morning",
      items: [
        {
          id: "1",
          arabic: "((اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ)) (أربعَ مَرَّاتٍ). [وإذا أمسى قال: اللَّهم إني أمسيت]",
          repeatCount: 4,
        },
      ],
    };

    it("shows an instruction quietly, and an alternative wording as its own part", () => {
      const { container } = render(<AzkarList category={morning} />);
      const classes = [...container.querySelectorAll(".azkar-part")].map((p) => p.className.replace("azkar-part ", ""));
      expect(classes).toEqual(["azkar-part-dua", "azkar-part-note", "azkar-part-variant"]);
      expect(container.querySelector(".azkar-part-note")).toHaveTextContent("(أربعَ مَرَّاتٍ)");
    });
  });

  it("starts every item's tally at 0 of its repeat count", () => {
    render(<AzkarList category={category} />);
    expect(screen.getByRole("button", { name: "0 / 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 / 1" })).toBeInTheDocument();
  });

  it("increments the tally on each click, and caps at the repeat count", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);

    const button = screen.getByRole("button", { name: "0 / 3" });
    await user.click(button);
    expect(screen.getByRole("button", { name: "1 / 3" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "1 / 3" }));
    await user.click(screen.getByRole("button", { name: "2 / 3" }));
    expect(screen.getByRole("button", { name: "3 / 3" })).toBeInTheDocument();

    // A further click must not push it past the repeat count.
    await user.click(screen.getByRole("button", { name: "3 / 3" }));
    expect(screen.getByRole("button", { name: "3 / 3" })).toBeInTheDocument();
  });

  it("reports a completion exactly once, when the tally reaches the repeat count", async () => {
    const user = userEvent.setup();
    const onItemComplete = vi.fn();
    render(<AzkarList category={category} onItemComplete={onItemComplete} />);

    await user.click(screen.getByRole("button", { name: "0 / 3" }));
    await user.click(screen.getByRole("button", { name: "1 / 3" }));
    expect(onItemComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "2 / 3" }));
    expect(onItemComplete).toHaveBeenCalledTimes(1);
    expect(onItemComplete).toHaveBeenCalledWith("75");

    // Tapping a finished item again earns nothing more.
    await user.click(screen.getByRole("button", { name: "3 / 3" }));
    expect(onItemComplete).toHaveBeenCalledTimes(1);

    // A single-repeat item completes on its first tap.
    await user.click(screen.getByRole("button", { name: "0 / 1" }));
    expect(onItemComplete).toHaveBeenCalledTimes(2);
  });

  it("tracks each item's tally independently", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);

    await user.click(screen.getByRole("button", { name: "0 / 3" }));
    expect(screen.getByRole("button", { name: "1 / 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 / 1" })).toBeInTheDocument();
  });

  describe("tap and completion motion", () => {
    it("marks the just-tapped button with the bounce class, and only that button", async () => {
      const user = userEvent.setup();
      render(<AzkarList category={category} />);

      await user.click(screen.getByRole("button", { name: "0 / 3" }));

      expect(screen.getByRole("button", { name: "1 / 3" })).toHaveClass("tapped");
      expect(screen.getByRole("button", { name: "0 / 1" })).not.toHaveClass("tapped");
    });

    it("clears the bounce class once its animation ends", async () => {
      const user = userEvent.setup();
      render(<AzkarList category={category} />);

      const button = screen.getByRole("button", { name: "0 / 3" });
      await user.click(button);
      expect(screen.getByRole("button", { name: "1 / 3" })).toHaveClass("tapped");

      fireEvent.animationEnd(screen.getByRole("button", { name: "1 / 3" }));
      expect(screen.getByRole("button", { name: "1 / 3" })).not.toHaveClass("tapped");
    });

    it("marks the item as completed only once its tally reaches the repeat count", async () => {
      const user = userEvent.setup();
      render(<AzkarList category={category} />);

      const singleRepeatButton = screen.getByRole("button", { name: "0 / 1" });
      expect(singleRepeatButton.closest("li")).not.toHaveClass("completed");

      await user.click(singleRepeatButton);
      expect(screen.getByRole("button", { name: "1 / 1" }).closest("li")).toHaveClass("completed");
    });

    it("does not mark a partially-tallied item as completed", async () => {
      const user = userEvent.setup();
      render(<AzkarList category={category} />);

      await user.click(screen.getByRole("button", { name: "0 / 3" }));
      expect(screen.getByRole("button", { name: "1 / 3" }).closest("li")).not.toHaveClass("completed");
    });
  });
});

describe("AzkarList — progress", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
  });

  const currentIndex = () => [...document.querySelectorAll(".azkar-list li")].findIndex((li) => li.classList.contains("current"));

  it("starts with the first dhikr as the one to say, and an empty bar", () => {
    render(<AzkarList category={category} />);
    expect(screen.getByRole("button", { name: "Go to the current dhikr" })).toHaveTextContent("Dhikr 1 of 2");
    expect(screen.getByText("0 done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "2");
    expect(currentIndex()).toBe(0);
    expect(document.querySelectorAll(".azkar-list li")[0]).toHaveAttribute("aria-current", "step");
  });

  it("moves on to the next dhikr once one reaches its repeat count — and not before", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);
    await user.click(screen.getByRole("button", { name: "0 / 3" }));
    await user.click(screen.getByRole("button", { name: "1 / 3" }));
    expect(screen.getByRole("button", { name: "Go to the current dhikr" })).toHaveTextContent("Dhikr 1 of 2");
    await user.click(screen.getByRole("button", { name: "2 / 3" }));
    expect(screen.getByRole("button", { name: "Go to the current dhikr" })).toHaveTextContent("Dhikr 2 of 2");
    expect(screen.getByText("1 done")).toBeInTheDocument();
    expect(currentIndex()).toBe(1);
  });

  it("fills the bar as dhikr are finished, partly for one in progress", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);
    const fill = () => document.querySelector<HTMLElement>(".azkar-progress-bar span")!.style.transform;
    expect(fill()).toBe("scaleX(0)");
    await user.click(screen.getByRole("button", { name: "0 / 3" }));
    expect(fill()).toMatch(/scaleX\(0\.1666/); // a third of the first of two dhikr
    await user.click(screen.getByRole("button", { name: "1 / 3" }));
    await user.click(screen.getByRole("button", { name: "2 / 3" }));
    expect(fill()).toBe("scaleX(0.5)");
  });

  it("says so when everything is done", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);
    for (const name of ["0 / 3", "1 / 3", "2 / 3", "0 / 1"]) await user.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("status")).toHaveTextContent("All done — may Allah accept it");
    expect(screen.queryByRole("button", { name: "Go to the current dhikr" })).not.toBeInTheDocument();
    expect(currentIndex()).toBe(-1);
    expect(document.querySelector(".azkar-progress")).toHaveClass("done");
  });

  it("starts from the tallies it is given, and reports every change in full", async () => {
    const user = userEvent.setup();
    const onCountsChange = vi.fn();
    render(<AzkarList category={category} initialCounts={{ "75": 3 }} onCountsChange={onCountsChange} />);
    expect(screen.getByRole("button", { name: "Go to the current dhikr" })).toHaveTextContent("Dhikr 2 of 2");
    expect(screen.getByRole("button", { name: "3 / 3" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "0 / 1" }));
    expect(onCountsChange).toHaveBeenLastCalledWith({ "75": 3, "76": 1 });
  });

  it("clears the count only on a second tap — one tap asks, so progress is not lost by accident", async () => {
    const user = userEvent.setup();
    const onCountsChange = vi.fn();
    render(<AzkarList category={category} initialCounts={{ "75": 2 }} onCountsChange={onCountsChange} />);
    await user.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByRole("button", { name: "Tap again to clear today's count" })).toBeInTheDocument();
    expect(onCountsChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Tap again to clear today's count" }));
    expect(onCountsChange).toHaveBeenCalledWith({});
    expect(screen.getByRole("button", { name: "0 / 3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start again" })).not.toBeInTheDocument(); // nothing left to clear
  });

  it("goes back to asking if the second tap does not come", async () => {
    vi.useFakeTimers();
    render(<AzkarList category={category} initialCounts={{ "75": 2 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByRole("button", { name: "Tap again to clear today's count" })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3600);
    expect(screen.getByRole("button", { name: "Start again" })).toBeInTheDocument();
  });

  it("brings the next dhikr into view after one is finished, and on request", async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    (Element.prototype as unknown as Record<string, unknown>).scrollIntoView = scrollIntoView;
    render(<AzkarList category={category} />);
    for (const name of ["0 / 3", "1 / 3", "2 / 3"]) fireEvent.click(screen.getByRole("button", { name }));
    expect(scrollIntoView).not.toHaveBeenCalled(); // after the completion bloom, not during it
    await vi.advanceTimersByTimeAsync(500);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelectorAll(".azkar-list li")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Go to the current dhikr" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("shows no progress bar for a list of one", () => {
    render(<AzkarList category={{ ...category, items: [category.items[0]] }} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(document.querySelector(".azkar-list li.current")).toBeNull();
  });

  it("speaks Arabic", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <AzkarList category={category} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: "اذهب إلى الذكر الحالي" })).toHaveTextContent("الذكر 1 من 2");
    expect(screen.getByText("أُنجز 0")).toBeInTheDocument();
  });
});
