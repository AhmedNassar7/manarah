import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n/index.js";
import { AzkarVoicePlayer } from "./AzkarVoicePlayer.js";

const a = { id: "asmari", name: "Abdullah Al-Asmari", credit: "From the Holy Quran Radio", src: "azkar-audio/asmari-morning.mp3" };
const j = { id: "judhyan", name: "Faisal bin Judhyan", src: "azkar-audio/judhyan-morning.mp3" };
const audio = () => document.querySelector("audio") as HTMLAudioElement;

describe("AzkarVoicePlayer", () => {
  it("shows nothing when nobody has recorded this list", () => {
    const { container } = render(<AzkarVoicePlayer choices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("with one reciter: names him and plays his recording, loading nothing until play", () => {
    render(<AzkarVoicePlayer choices={[a]} />);
    expect(screen.getByText("Abdullah Al-Asmari")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(audio()).toHaveAttribute("src", a.src);
    expect(audio()).toHaveAttribute("preload", "none");
    expect(audio()).toHaveAttribute("controls");
  });

  it("with several: starts with the remembered one and switches to another's recording", () => {
    const onChoose = vi.fn();
    render(<AzkarVoicePlayer choices={[a, j]} initialId="judhyan" onChoose={onChoose} />);
    const group = screen.getByRole("radiogroup", { name: "Reciter" });
    expect(within(group).getByRole("radio", { name: "Faisal bin Judhyan" })).toBeChecked();
    expect(audio()).toHaveAttribute("src", j.src);
    fireEvent.click(within(group).getByRole("radio", { name: "Abdullah Al-Asmari" }));
    expect(audio()).toHaveAttribute("src", a.src);
    expect(onChoose).toHaveBeenCalledWith("asmari");
  });

  it("says who the recording is from", () => {
    render(<AzkarVoicePlayer choices={[a, j]} />);
    expect(screen.getByText("From the Holy Quran Radio")).toBeInTheDocument();
  });

  it("falls back to the first reciter if the remembered one has no recording of this list", () => {
    render(<AzkarVoicePlayer choices={[a]} initialId="gone" />);
    expect(audio()).toHaveAttribute("src", a.src);
  });

  it("is in Arabic, right to left", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <AzkarVoicePlayer choices={[{ ...a, name: "عبدالله الأسمري" }, { ...j, name: "فيصل بن جذيان" }]} />
      </LanguageProvider>,
    );
    const region = screen.getByRole("region", { name: "استمع إلى الأذكار كاملة" });
    expect(region).toHaveAttribute("dir", "rtl");
    expect(within(region).getByRole("radiogroup", { name: "القارئ" })).toBeInTheDocument();
    expect(within(region).getByRole("radio", { name: "عبدالله الأسمري" })).toBeChecked();
  });
});
