import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyPrayerTimes } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { PrayerTimesList } from "./PrayerTimesList.js";

const times: DailyPrayerTimes = {
  fajr: new Date("2026-11-05T04:48:00"),
  sunrise: new Date("2026-11-05T06:12:00"),
  dhuhr: new Date("2026-11-05T11:39:00"),
  asr: new Date("2026-11-05T14:42:00"),
  maghrib: new Date("2026-11-05T17:05:00"),
  isha: new Date("2026-11-05T18:35:00"),
};

describe("PrayerTimesList", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lists the day's six times in order, sunrise between Fajr and Dhuhr", () => {
    vi.setSystemTime(new Date("2026-11-05T03:00:00"));
    render(<PrayerTimesList todaysTimes={times} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector("span")?.textContent)).toEqual(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]);
    expect(within(rows[0]).getByText(/4:48/)).toBeInTheDocument();
    expect(within(rows[4]).getByText(/5:05/)).toBeInTheDocument();
  });

  it("highlights the next prayer, and only that one", () => {
    vi.setSystemTime(new Date("2026-11-05T13:00:00"));
    render(<PrayerTimesList todaysTimes={times} />);
    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Asr");
  });

  it("highlights nothing once every time has passed", () => {
    vi.setSystemTime(new Date("2026-11-05T23:00:00"));
    render(<PrayerTimesList todaysTimes={times} />);
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(0);
  });

  it("moves the highlight on as the clock passes a prayer", () => {
    vi.setSystemTime(new Date("2026-11-05T11:38:00"));
    render(<PrayerTimesList todaysTimes={times} />);
    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent("Dhuhr");
    // Advancing the fake clock past Dhuhr triggers the component's 30-second refresh.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent("Asr");
  });

  it("marks sunrise as not a prayer, and keeps the times left-to-right in Arabic", () => {
    vi.setSystemTime(new Date("2026-11-05T03:00:00"));
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <PrayerTimesList todaysTimes={times} />
      </LanguageProvider>
    );
    expect(screen.getByText("الشروق").closest("li")).toHaveClass("sunrise");
    expect(screen.getByText("الفجر")).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("dir", "ltr");
    expect(document.querySelector(".prayer-times-list")).toHaveAttribute("dir", "rtl");
  });
});
