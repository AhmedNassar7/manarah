import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Surah } from "@manarah/core";
import { QuranNavigator } from "./QuranNavigator.js";

const surahs: Surah[] = [
  { number: 1, nameArabic: "سُورَةُ ٱلْفَاتِحَةِ", nameTransliterated: "Al-Faatiha", revelationType: "Meccan", verseCount: 7 },
  { number: 2, nameArabic: "سُورَةُ ٱلْبَقَرَةِ", nameTransliterated: "Al-Baqara", revelationType: "Medinan", verseCount: 286 },
];

function setup(overrides: Partial<Parameters<typeof QuranNavigator>[0]> = {}) {
  const onNavigate = vi.fn();
  const resolveJuzStart = vi.fn().mockResolvedValue({ surah: 2, ayah: 142 });
  const resolvePageStart = vi.fn().mockResolvedValue({ surah: 2, ayah: 1 });

  render(
    <QuranNavigator
      surahs={surahs}
      currentSurahNumber={1}
      currentSurahVerseCount={7}
      onNavigate={onNavigate}
      resolveJuzStart={resolveJuzStart}
      resolvePageStart={resolvePageStart}
      juzCount={30}
      pageCount={604}
      {...overrides}
    />
  );

  return { onNavigate, resolveJuzStart, resolvePageStart };
}

describe("QuranNavigator", () => {
  it("shows the current surah's number and Arabic name on the closed trigger", () => {
    setup();
    expect(screen.getByText("1. سُورَةُ ٱلْفَاتِحَةِ")).toBeInTheDocument();
  });

  it("opens a tabbed panel with the surah list on click, and selecting a surah navigates to its first ayah", () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Al-Baqara/ }));

    expect(onNavigate).toHaveBeenCalledWith({ surah: 2, ayah: 1 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters the surah list by search query", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Baqara" } });

    expect(screen.queryByRole("button", { name: /Al-Faatiha/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Al-Baqara/ })).toBeInTheDocument();
  });

  it("switches to the Ayah tab and navigates within the current surah", () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));
    fireEvent.click(screen.getByRole("tab", { name: "Ayah" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(onNavigate).toHaveBeenCalledWith({ surah: 1, ayah: 3 });
  });

  it("switches to the Juz' tab and navigates to the resolved start verse once it loads", async () => {
    const { onNavigate, resolveJuzStart } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));
    fireEvent.click(screen.getByRole("tab", { name: "Juz'" }));
    fireEvent.click(screen.getByRole("button", { name: "Juz' 2" }));

    expect(resolveJuzStart).toHaveBeenCalledWith(2);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ surah: 2, ayah: 142 }));
  });

  it("switches to the Page tab and navigates to the resolved start verse once it loads", async () => {
    const { onNavigate, resolvePageStart } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));
    fireEvent.click(screen.getByRole("tab", { name: "Page" }));
    fireEvent.click(screen.getByRole("button", { name: "Page 5" }));

    expect(resolvePageStart).toHaveBeenCalledWith(5);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ surah: 2, ayah: 1 }));
  });

  it("closes the panel without navigating", () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Browse Quran" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
