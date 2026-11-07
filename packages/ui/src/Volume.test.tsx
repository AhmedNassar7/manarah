import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n/index.js";
import { VolumeControl, VolumeProvider } from "./Volume.js";

function setup(volume: number, canSet = true, language: "en" | "ar" = "en") {
  const setVolume = vi.fn();
  render(
    <LanguageProvider language={language} onLanguageChange={() => {}}>
      <VolumeProvider value={{ volume, setVolume, canSet }}>
        <VolumeControl />
      </VolumeProvider>
    </LanguageProvider>,
  );
  return setVolume;
}

describe("VolumeControl", () => {
  it("draws nothing where the device sets the volume itself", () => {
    setup(1, false);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the level and sets it from the slider", () => {
    const setVolume = setup(0.6);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveValue("60");
    expect(slider).toHaveAttribute("aria-valuetext", "60%");
    fireEvent.change(slider, { target: { value: "35" } });
    expect(setVolume).toHaveBeenCalledWith(0.35);
  });

  it("mutes, and says so", () => {
    const setVolume = setup(0.6);
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(setVolume).toHaveBeenCalledWith(0);
  });

  it("when muted, un-muting goes back to the level it had", () => {
    const setVolume = vi.fn();
    const ui = (volume: number) => (
      <VolumeProvider value={{ volume, setVolume, canSet: true }}>
        <VolumeControl />
      </VolumeProvider>
    );
    const { rerender } = render(ui(0.4));
    rerender(ui(0));
    const unmute = screen.getByRole("button", { name: "Unmute" });
    expect(unmute).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(unmute);
    expect(setVolume).toHaveBeenLastCalledWith(0.4);
  });

  it("is in Arabic, right to left", () => {
    setup(0.5, true, "ar");
    expect(screen.getByRole("slider", { name: "مستوى الصوت" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "كتم الصوت" })).toBeInTheDocument();
    expect(document.querySelector(".volume-control")).toHaveAttribute("dir", "rtl");
  });
});
