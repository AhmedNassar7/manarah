import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TASBIH_THEMES, emptyTasbih, setSound, setTasbihTheme, tapTasbih, type TasbihState } from "@manarah/core";
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

  describe("real beads", () => {
    it("draws shaded beads on a cord, with a guide bead, spacer beads and a tassel", () => {
      const { container } = setup();
      expect(container.querySelectorAll(".tasbih-bead-body")).toHaveLength(33);
      expect(container.querySelectorAll(".tasbih-bead-spec").length).toBeGreaterThanOrEqual(33); // a highlight on each bead (and the guide)
      expect(container.querySelector(".tasbih-imam")).not.toBeNull();
      expect(container.querySelectorAll(".tasbih-spacer")).toHaveLength(2);
      expect(container.querySelector(".tasbih-knot")).not.toBeNull();
      expect(container.querySelectorAll(".tasbih-fringe path").length).toBeGreaterThanOrEqual(6);
      expect(container.querySelector("circle.tasbih-cord")).not.toBeNull();
    });

    it("lights every bead from the same side: each face turns back by as much as the ring turns", () => {
      const { container } = setup({}, stateAfter(1));
      const angle = (el: Element | null) => Number(/(-?[\d.]+)deg/.exec((el as HTMLElement).style.transform)?.[1]);
      const ring = () => angle(container.querySelector(".tasbih-beads"));
      const face = () => angle(container.querySelector(".tasbih-bead-face"));
      expect(ring() + face()).toBeCloseTo(0, 5);
      fireEvent.click(screen.getByRole("button", { name: /Tap to count/ }));
      expect(ring() + face()).toBeCloseTo(0, 5);
      expect(ring()).not.toBe(0);
    });

    it("gives the beads their own gradients (one per instance, so two tasbihs never share a light)", () => {
      const { container } = setup();
      const gradients = container.querySelectorAll("radialGradient");
      expect(gradients).toHaveLength(2);
      const ids = [...gradients].map((g) => g.id);
      expect(new Set(ids).size).toBe(2);
      expect(container.querySelector(".tasbih-bead-body")?.getAttribute("fill")).toBe(`url(#${ids[0]})`);
      expect(ids[0]).not.toMatch(/:/);
    });
  });

  describe("material", () => {
    it("takes its look from the chosen material", () => {
      const { container } = setup({}, setTasbihTheme(emptyTasbih(), "pearl"));
      expect(container.querySelector(".tasbih")).toHaveAttribute("data-tasbih-theme", "pearl");
    });

    it("offers every material, names them, marks the one in use, and reports a choice", () => {
      const onThemeChange = vi.fn();
      setup({ onThemeChange });
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(TASBIH_THEMES.length);
      expect(screen.getByRole("radio", { name: "Olive wood" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("radio", { name: "Pearl" })).toHaveAttribute("aria-checked", "false");
      fireEvent.click(screen.getByRole("radio", { name: "Onyx" }));
      expect(onThemeChange).toHaveBeenCalledWith("onyx");
    });

    it("shows each material as a bead of its own colours", () => {
      setup({ onThemeChange: vi.fn() });
      for (const radio of screen.getAllByRole("radio")) {
        expect(radio.getAttribute("data-tasbih-theme")).toMatch(/^(wood|amber|pearl|emerald|turquoise|onyx)$/);
        expect(radio.querySelector(".tasbih-swatch")).not.toBeNull();
      }
    });

    it("has no picker unless it can act on a choice", () => {
      setup();
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });

    it("names the materials in Arabic", () => {
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
            onThemeChange={vi.fn()}
            onSoundChange={vi.fn()}
          />
        </LanguageProvider>,
      );
      expect(screen.getByRole("radio", { name: "خشب الزيتون" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "لؤلؤ" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "عقيق أسود" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "الصوت" })).toBeInTheDocument();
    });
  });

  describe("sound", () => {
    it("has a sound button that shows whether it is on, and reports a change", () => {
      const onSoundChange = vi.fn();
      const { rerender, props } = setup({ onSoundChange });
      const off = screen.getByRole("button", { name: "Sound" });
      expect(off).toHaveAttribute("aria-pressed", "false"); // silent until chosen
      fireEvent.click(off);
      expect(onSoundChange).toHaveBeenLastCalledWith(true);
      rerender(<TasbihCounter {...props} state={setSound(emptyTasbih(), true)} />);
      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Sound" }));
      expect(onSoundChange).toHaveBeenLastCalledWith(false);
    });

    it("has no sound button unless it can act on it", () => {
      setup();
      expect(screen.queryByRole("button", { name: "Sound" })).not.toBeInTheDocument();
    });
  });
});
