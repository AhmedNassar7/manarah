import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyTasbih, tapTasbih, type TasbihState } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { TasbihCounter, type TasbihCounterProps } from "./TasbihCounter.js";

const noon = new Date(2026, 10, 5, 12);

function setup(overrides: Partial<TasbihCounterProps> = {}, state: TasbihState = emptyTasbih()) {
  const props: TasbihCounterProps = {
    state,
    today: { taps: 0, rounds: 0 },
    onTap: vi.fn(),
    onUndo: vi.fn(),
    onReset: vi.fn(),
    onSelectDhikr: vi.fn(),
    onTarget: vi.fn(),
    onVibrateChange: vi.fn(),
    ...overrides,
  };
  const view = render(<TasbihCounter {...props} />);
  return { props, ...view };
}

function stateAfter(taps: number, base = emptyTasbih()): TasbihState {
  let s = base;
  for (let i = 0; i < taps; i++) s = tapTasbih(s, noon).state;
  return s;
}

describe("TasbihCounter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the phrase in Arabic, the count and the round size", () => {
    const { container } = setup();
    expect(screen.getByText("سُبْحَانَ اللَّهِ")).toBeInTheDocument();
    expect(container.querySelector(".tasbih-count strong")).toHaveTextContent("0");
    expect(screen.getByText("/ 33")).toBeInTheDocument();
  });

  it("is one big button: tapping the ring counts a bead", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Tap to count — 0 of 33/ }));
    expect(props.onTap).toHaveBeenCalledTimes(1);
  });

  it("has 33 beads on the ring, and the beads counted so far are filled", () => {
    const { container } = setup({}, stateAfter(5));
    expect(container.querySelectorAll(".tasbih-bead")).toHaveLength(33);
    expect(container.querySelectorAll(".tasbih-bead.counted")).toHaveLength(5);
  });

  it("turns the ring one bead at a time, and back again on undo", () => {
    const { container } = setup({}, stateAfter(1));
    const beads = () => container.querySelector<SVGGElement>(".tasbih-beads")!.style.transform;
    const before = beads();
    fireEvent.click(screen.getByRole("button", { name: /Tap to count/ }));
    expect(beads()).not.toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(beads()).toBe(before);
  });

  it("lets you choose another dhikr", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Alhamdulillah" }));
    expect(props.onSelectDhikr).toHaveBeenCalledWith("alhamdulillah");
    expect(screen.getByRole("button", { name: "Subhan'Allah" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers the round sizes and a free count, and marks the one in use", () => {
    const { props } = setup();
    expect(screen.getByRole("button", { name: "33" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "99" }));
    expect(props.onTarget).toHaveBeenCalledWith(99);
    fireEvent.click(screen.getByRole("button", { name: "Free" }));
    expect(props.onTarget).toHaveBeenCalledWith(0);
  });

  it("with no target shows no '/ 33'", () => {
    setup({}, { ...emptyTasbih(), target: 0 });
    expect(screen.queryByText(/^\/ /)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Free" })).toHaveAttribute("aria-pressed", "true");
  });

  it("can only undo after a tap, and only start a new round once there is something to clear", () => {
    const { rerender, props } = setup();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New round" })).toBeDisabled();
    rerender(<TasbihCounter {...props} state={stateAfter(3)} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "New round" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "New round" }));
    expect(props.onReset).toHaveBeenCalled();
  });

  it("shows today's count, today's rounds and the all-time total", () => {
    setup({ today: { taps: 66, rounds: 2 } }, { ...emptyTasbih(), lifetime: 1234 });
    expect(screen.getByText("Today").nextElementSibling).toHaveTextContent("66");
    expect(screen.getByText("Rounds today").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("All time").nextElementSibling).toHaveTextContent("1234");
  });

  it("congratulates a completed round, then goes quiet again", () => {
    const { rerender, props } = setup();
    expect(screen.queryByText(/Round complete/)).not.toBeInTheDocument();
    rerender(<TasbihCounter {...props} celebration={1} />);
    expect(screen.getByRole("status")).toHaveTextContent("Round complete — Masha'Allah");
    expect(document.querySelector(".tasbih-glow")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("shows the vibration switch only on a device that can vibrate", () => {
    const { unmount } = setup({ canVibrate: false });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    unmount();
    const { props } = setup({ canVibrate: true });
    const box = screen.getByRole("checkbox", { name: "Vibrate" });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(props.onVibrateChange).toHaveBeenCalledWith(false);
  });

  it("speaks Arabic: the names of the dhikr and the labels", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <TasbihCounter
          state={emptyTasbih()}
          today={{ taps: 0, rounds: 0 }}
          onTap={vi.fn()}
          onUndo={vi.fn()}
          onReset={vi.fn()}
          onSelectDhikr={vi.fn()}
          onTarget={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: "الحمد لله" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تراجع" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "عدّ حرّ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alhamdulillah" })).not.toBeInTheDocument();
  });
});
