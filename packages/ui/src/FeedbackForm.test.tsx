import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackForm } from "./FeedbackForm.js";

describe("FeedbackForm — rating", () => {
  it("shows five stars and reports the one chosen", () => {
    const onRatingChange = vi.fn();
    render(<FeedbackForm rating={undefined} onRatingChange={onRatingChange} />);
    expect(screen.getAllByRole("radio", { name: /stars$/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onRatingChange).toHaveBeenCalledWith(4);
  });

  it("marks the current rating and answers it kindly", () => {
    render(<FeedbackForm rating={5} onRatingChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "5 stars" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/May Allah reward you/)).toBeInTheDocument();
  });

  it("asks what went wrong after a low rating", () => {
    render(<FeedbackForm rating={1} onRatingChange={() => {}} />);
    expect(screen.getByText(/tell us what went wrong/)).toBeInTheDocument();
  });

  it("treats an invalid stored rating as not rated", () => {
    render(<FeedbackForm rating={9} onRatingChange={() => {}} />);
    for (const star of screen.getAllByRole("radio", { name: /stars$/ })) expect(star).toHaveAttribute("aria-checked", "false");
  });
});

describe("FeedbackForm — message", () => {
  it("disables copy until something is written", () => {
    render(<FeedbackForm rating={undefined} onRatingChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Add more reciters" } });
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
  });

  it("copies the message with its context", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<FeedbackForm rating={4} onRatingChange={() => {}} appVersion="0.0.1" />);
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Add more reciters" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("Add more reciters");
    expect(copied).toContain("Rating: 4/5");
    expect(copied).toContain("App version: 0.0.1");
  });

  it("opens a prefilled GitHub issue only when there is a message and a repository", () => {
    const { rerender } = render(<FeedbackForm rating={undefined} onRatingChange={() => {}} />);
    expect(screen.queryByRole("link", { name: /GitHub issue/ })).not.toBeInTheDocument();

    rerender(<FeedbackForm rating={undefined} onRatingChange={() => {}} repositoryUrl="https://github.com/o/r" />);
    const link = screen.getByText("Open as a GitHub issue").closest("a")!;
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");

    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Bug here" } });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/github\.com\/o\/r\/issues\/new\?/);
    expect(decodeURIComponent(link.getAttribute("href")!.replace(/\+/g, " "))).toContain("Problem: Bug here".replace("Problem", "Suggestion"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("is honest that nothing is sent automatically", () => {
    render(<FeedbackForm rating={undefined} onRatingChange={() => {}} />);
    expect(screen.getByText(/isn't sent automatically/)).toBeInTheDocument();
  });

  it("changes the type of feedback", () => {
    render(<FeedbackForm rating={undefined} onRatingChange={() => {}} repositoryUrl="https://github.com/o/r" />);
    fireEvent.click(screen.getByRole("radio", { name: "Problem" }));
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "It froze" } });
    const href = screen.getByText("Open as a GitHub issue").closest("a")!.getAttribute("href")!;
    expect(new URL(href).searchParams.get("title")).toBe("Problem: It froze");
  });
});
