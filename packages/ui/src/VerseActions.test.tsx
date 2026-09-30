import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerseActions } from "./VerseActions.js";

const shareText = "بِسْمِ ٱللَّهِ\n\n(Al-Faatiha 1:1)";

function installClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  vi.useRealTimers();
  // jsdom has no navigator.share by default — remove any stub a test added.
  delete (navigator as { share?: unknown }).share;
});

describe("VerseActions", () => {
  it("copies the verse's share text and briefly confirms it", async () => {
    vi.useFakeTimers();
    const writeText = installClipboard();
    render(<VerseActions ayah={1} shareText={shareText} bookmarked={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writeText).toHaveBeenCalledWith(shareText);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("hides Share when the Web Share API is unavailable, and uses it when present", async () => {
    const { unmount } = render(<VerseActions ayah={1} shareText={shareText} bookmarked={false} />);
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
    unmount();

    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<VerseActions ayah={1} shareText={shareText} bookmarked={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });
    expect(share).toHaveBeenCalledWith({ text: shareText });
  });

  it("omits bookmark and note buttons when no handlers are given", () => {
    render(<VerseActions ayah={1} shareText={shareText} bookmarked={false} />);
    expect(screen.queryByRole("button", { name: /bookmark/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /note/i })).not.toBeInTheDocument();
  });

  it("toggles the bookmark and reflects its current state", () => {
    const onToggleBookmark = vi.fn();
    const { rerender } = render(
      <VerseActions ayah={1} shareText={shareText} bookmarked={false} onToggleBookmark={onToggleBookmark} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);

    rerender(<VerseActions ayah={1} shareText={shareText} bookmarked onToggleBookmark={onToggleBookmark} />);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("edits and saves a note, prefilled with the existing one", () => {
    const onSaveNote = vi.fn();
    render(<VerseActions ayah={7} shareText={shareText} bookmarked={false} note="Old" onSaveNote={onSaveNote} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    const textarea = screen.getByRole("textbox", { name: "Note for verse 7" });
    expect(textarea).toHaveValue("Old");

    fireEvent.change(textarea, { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(onSaveNote).toHaveBeenCalledWith("New");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancelling the note editor saves nothing", () => {
    const onSaveNote = vi.fn();
    render(<VerseActions ayah={7} shareText={shareText} bookmarked={false} onSaveNote={onSaveNote} />);

    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSaveNote).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
