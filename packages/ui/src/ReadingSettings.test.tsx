import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { READER_FONT_SCALES, type Reciter } from "@manarah/core";
import { ReadingSettings, type ReadingSettingsProps } from "./ReadingSettings.js";

const reciters: Reciter[] = [
  { id: "alafasy", everyAyahSubfolder: "Alafasy_128kbps" },
  { id: "husary", everyAyahSubfolder: "Husary_128kbps" },
];

function setup(overrides: Partial<ReadingSettingsProps> = {}) {
  const props: ReadingSettingsProps = {
    fontStep: 1,
    onFontStepChange: vi.fn(),
    showTranslation: true,
    onShowTranslationChange: vi.fn(),
    reciters,
    reciterId: "alafasy",
    onReciterChange: vi.fn(),
    ...overrides,
  };
  render(<ReadingSettings {...props} />);
  return props;
}

describe("ReadingSettings", () => {
  it("shows the current text size and steps it up and down", () => {
    const props = setup();
    expect(screen.getByRole("status")).toHaveTextContent("100%");

    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(props.onFontStepChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Smaller text" }));
    expect(props.onFontStepChange).toHaveBeenCalledWith(0);
  });

  it("disables 'smaller' at the bottom step", () => {
    setup({ fontStep: 0 });
    expect(screen.getByRole("button", { name: "Smaller text" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Larger text" })).toBeEnabled();
  });

  it("disables 'larger' at the top step, and tolerates an out-of-range stored step", () => {
    setup({ fontStep: 99 });
    expect(screen.getByRole("button", { name: "Larger text" })).toBeDisabled();
    const top = Math.round(READER_FONT_SCALES[READER_FONT_SCALES.length - 1] * 100);
    expect(screen.getByRole("status")).toHaveTextContent(`${top}%`);
  });

  it("toggles the translation", () => {
    const props = setup();
    const checkbox = screen.getByRole("checkbox", { name: "Show translation" });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(props.onShowTranslationChange).toHaveBeenCalledWith(false);
  });

  it("changes the default reciter", () => {
    const props = setup();
    const select = screen.getByRole("combobox", { name: "Default reciter" });
    expect(select).toHaveValue("alafasy");
    fireEvent.change(select, { target: { value: "husary" } });
    expect(props.onReciterChange).toHaveBeenCalledWith("husary");
  });
});
