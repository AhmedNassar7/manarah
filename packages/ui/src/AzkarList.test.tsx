import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AzkarCategory } from "@manarah/core";
import { AzkarList } from "./AzkarList.js";

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

  it("shows the translation only when the item has one", () => {
    render(<AzkarList category={category} />);
    expect(screen.getByText("I seek refuge in Allah")).toBeInTheDocument();
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

  it("tracks each item's tally independently", async () => {
    const user = userEvent.setup();
    render(<AzkarList category={category} />);

    await user.click(screen.getByRole("button", { name: "0 / 3" }));
    expect(screen.getByRole("button", { name: "1 / 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 / 1" })).toBeInTheDocument();
  });
});
