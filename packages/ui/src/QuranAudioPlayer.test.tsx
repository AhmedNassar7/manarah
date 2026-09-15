import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Reciter, Surah, Verse } from "@manarah/core";
import { QuranAudioPlayer, type QuranAudioPlayerHandle } from "./QuranAudioPlayer.js";

const alFatiha: Surah = {
  number: 1,
  nameArabic: "سُورَةُ ٱلْفَاتِحَةِ",
  nameTransliterated: "Al-Faatiha",
  revelationType: "Meccan",
  verseCount: 3,
};

const verses: Verse[] = [
  { surah: 1, ayah: 1, uthmaniText: "one" },
  { surah: 1, ayah: 2, uthmaniText: "two" },
  { surah: 1, ayah: 3, uthmaniText: "three" },
];

const reciters: Reciter[] = [
  { id: "alafasy", everyAyahSubfolder: "Alafasy_128kbps" },
  { id: "husary", everyAyahSubfolder: "Husary_128kbps" },
];

function setup() {
  const onReciterChange = vi.fn();
  const onPlayingAyahChange = vi.fn();
  const ref = createRef<QuranAudioPlayerHandle>();

  const { container } = render(
    <QuranAudioPlayer
      ref={ref}
      reciters={reciters}
      reciterId="alafasy"
      onReciterChange={onReciterChange}
      surah={alFatiha}
      verses={verses}
      onPlayingAyahChange={onPlayingAyahChange}
    />
  );

  const audio = container.querySelector("audio") as HTMLAudioElement;
  return { onReciterChange, onPlayingAyahChange, ref, audio };
}

describe("QuranAudioPlayer", () => {
  it("starts idle, with next/previous disabled", () => {
    setup();
    expect(screen.getByText("Select a verse to play")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous verse" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next verse" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled();
  });

  it("starts at the first verse on play, loading the correct EveryAyah URL", () => {
    const { audio, onPlayingAyahChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    expect(screen.getByText("Verse 1")).toBeInTheDocument();
    expect(audio.src).toBe("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
    expect(onPlayingAyahChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("pauses without reloading or restarting the audio", () => {
    const { audio, onPlayingAyahChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    const srcAfterPlay = audio.src;

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    expect(audio.src).toBe(srcAfterPlay);
    expect(onPlayingAyahChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("moves to the next and previous verse", () => {
    const { audio } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next verse" }));

    expect(screen.getByText("Verse 2")).toBeInTheDocument();
    expect(audio.src).toBe("https://everyayah.com/data/Alafasy_128kbps/001002.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Previous verse" }));
    expect(screen.getByText("Verse 1")).toBeInTheDocument();
  });

  it("advances to the next verse automatically once the current one ends", () => {
    const { audio } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    fireEvent.ended(audio);

    expect(screen.getByText("Verse 2")).toBeInTheDocument();
  });

  it("stops instead of advancing past the last verse", () => {
    const { audio } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next verse" }));
    fireEvent.click(screen.getByRole("button", { name: "Next verse" }));
    expect(screen.getByText("Verse 3")).toBeInTheDocument();

    fireEvent.ended(audio);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByText("Verse 3")).toBeInTheDocument();
  });

  it("repeats the current verse the selected number of times before advancing", () => {
    const { audio } = setup();
    fireEvent.change(screen.getByLabelText("Repeat"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    const firstSrc = audio.src;

    fireEvent.ended(audio);
    expect(screen.getByText("Verse 1")).toBeInTheDocument();
    expect(audio.src).toBe(firstSrc);

    fireEvent.ended(audio);
    expect(screen.getByText("Verse 2")).toBeInTheDocument();
  });

  it("calls onReciterChange when a different reciter is selected", () => {
    const { onReciterChange } = setup();
    fireEvent.change(screen.getByLabelText("Reciter"), { target: { value: "husary" } });
    expect(onReciterChange).toHaveBeenCalledWith("husary");
  });

  it("exposes playAyah via ref, jumping straight to the requested verse", () => {
    const { ref, audio, onPlayingAyahChange } = setup();
    act(() => {
      ref.current?.playAyah(3);
    });

    expect(screen.getByText("Verse 3")).toBeInTheDocument();
    expect(audio.src).toBe("https://everyayah.com/data/Alafasy_128kbps/001003.mp3");
    expect(onPlayingAyahChange).toHaveBeenLastCalledWith(3);
  });

  it("resets to idle when the surah changes", () => {
    const { rerender } = render(
      <QuranAudioPlayer
        reciters={reciters}
        reciterId="alafasy"
        onReciterChange={vi.fn()}
        surah={alFatiha}
        verses={verses}
        onPlayingAyahChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByText("Verse 1")).toBeInTheDocument();

    const nextSurah: Surah = { ...alFatiha, number: 2 };
    rerender(
      <QuranAudioPlayer
        reciters={reciters}
        reciterId="alafasy"
        onReciterChange={vi.fn()}
        surah={nextSurah}
        verses={[{ surah: 2, ayah: 1, uthmaniText: "x" }]}
        onPlayingAyahChange={vi.fn()}
      />
    );

    expect(screen.getByText("Select a verse to play")).toBeInTheDocument();
  });
});
