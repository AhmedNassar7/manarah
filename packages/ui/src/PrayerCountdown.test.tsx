import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyPrayerTimes } from "@manarah/core";
import { PrayerCountdown } from "./PrayerCountdown.js";

function timesOn(dateStr: string): DailyPrayerTimes {
  return {
    fajr: new Date(`${dateStr}T05:00:00`),
    sunrise: new Date(`${dateStr}T06:20:00`),
    dhuhr: new Date(`${dateStr}T12:00:00`),
    asr: new Date(`${dateStr}T15:30:00`),
    maghrib: new Date(`${dateStr}T18:00:00`),
    isha: new Date(`${dateStr}T19:30:00`),
  };
}

describe("PrayerCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the next upcoming prayer and a HH:MM:SS countdown", () => {
    vi.setSystemTime(new Date("2026-09-15T11:00:00"));
    render(<PrayerCountdown todaysTimes={timesOn("2026-09-15")} />);

    expect(screen.getByText("Next: Dhuhr")).toBeInTheDocument();
    expect(screen.getByText("01:00:00")).toBeInTheDocument();
  });

  it("ticks the countdown down as time passes", () => {
    vi.setSystemTime(new Date("2026-09-15T11:00:00"));
    render(<PrayerCountdown todaysTimes={timesOn("2026-09-15")} />);
    expect(screen.getByText("01:00:00")).toBeInTheDocument();

    // Advancing fake timers moves the faked Date forward in lockstep and
    // fires the component's 1s interval — mixing this with a separate
    // vi.setSystemTime() call would desync the two clocks. act() is needed
    // so React flushes the resulting setState before we assert.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("00:59:55")).toBeInTheDocument();
  });

  it("skips to the next day's first prayer name once past Isha (shows 'No more prayers today' for today's window)", () => {
    vi.setSystemTime(new Date("2026-09-15T23:00:00"));
    render(<PrayerCountdown todaysTimes={timesOn("2026-09-15")} />);
    expect(screen.getByText("No more prayers today")).toBeInTheDocument();
  });
});
