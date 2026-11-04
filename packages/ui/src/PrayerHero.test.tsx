import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyPrayerTimes } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { PrayerHero } from "./PrayerHero.js";

const times: DailyPrayerTimes = {
  fajr: new Date("2026-11-05T04:48:00"),
  sunrise: new Date("2026-11-05T06:12:00"),
  dhuhr: new Date("2026-11-05T11:39:00"),
  asr: new Date("2026-11-05T14:42:00"),
  maghrib: new Date("2026-11-05T17:05:00"),
  isha: new Date("2026-11-05T18:35:00"),
};
const tomorrowsFajr = new Date("2026-11-06T04:49:00");
const hijri = { year: 1448, month: 5, day: 24 };

const hero = () => document.querySelector(".prayer-hero")!;

describe("PrayerHero", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the next prayer, a live countdown to it, and its clock time", () => {
    vi.setSystemTime(new Date("2026-11-05T13:00:00"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
    expect(screen.getByRole("heading", { name: "Asr" })).toBeInTheDocument();
    expect(hero().querySelector(".prayer-hero-countdown")).toHaveTextContent("01:42:00");
    expect(screen.getByText(/at 2:42/)).toBeInTheDocument();
    expect(screen.getByText("Next prayer")).toBeInTheDocument();
  });

  it("counts down as the clock moves", () => {
    vi.setSystemTime(new Date("2026-11-05T13:00:00"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(hero().querySelector(".prayer-hero-countdown")).toHaveTextContent("01:41:55");
  });

  it("takes its sky from the current period of the day", () => {
    const cases: Array<[string, string]> = [
      ["2026-11-05T05:00:00", "fajr"],
      ["2026-11-05T07:00:00", "sunrise"],
      ["2026-11-05T13:00:00", "dhuhr"],
      ["2026-11-05T16:00:00", "asr"],
      ["2026-11-05T17:30:00", "maghrib"],
      ["2026-11-05T21:00:00", "isha"],
      ["2026-11-05T02:00:00", "isha"], // still last night's Isha before Fajr
    ];
    for (const [at, period] of cases) {
      vi.setSystemTime(new Date(at));
      const { unmount } = render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
      expect(hero(), at).toHaveAttribute("data-period", period);
      unmount();
    }
  });

  it("describes how much of the period has passed, for screen readers", () => {
    // Dhuhr 11:39 -> Asr 14:42 is 183 minutes; 13:10:30 is exactly half way.
    vi.setSystemTime(new Date("2026-11-05T13:10:30"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
    expect(screen.getByRole("img", { name: "50% of the current prayer period has passed" })).toBeInTheDocument();
  });

  it("fills the ring in proportion to the elapsed fraction", () => {
    vi.setSystemTime(new Date("2026-11-05T13:10:30"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
    const fill = hero().querySelector(".prayer-hero-ring-fill")!;
    const circumference = Number(fill.getAttribute("stroke-dasharray"));
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference * 0.5, 0);
  });

  it("shows the Gregorian date, and the Hijri date when given", () => {
    vi.setSystemTime(new Date("2026-11-05T13:00:00"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} hijri={hijri} />);
    const dates = hero().querySelector(".prayer-hero-dates")!;
    expect(dates).toHaveTextContent("Thursday, November 5, 2026");
    expect(dates).toHaveTextContent("24 Jumada al-Ula 1448 AH");
  });

  it("carries on to tomorrow's Fajr after Isha", () => {
    vi.setSystemTime(new Date("2026-11-05T21:00:00"));
    render(<PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} />);
    expect(screen.getByRole("heading", { name: "Fajr" })).toBeInTheDocument();
    expect(hero().querySelector(".prayer-hero-countdown")).toHaveTextContent("07:49:00");
  });

  it("says there are no more prayers when tomorrow's Fajr isn't known", () => {
    vi.setSystemTime(new Date("2026-11-05T21:00:00"));
    render(<PrayerHero todaysTimes={times} />);
    expect(screen.getByText("No more prayers today")).toBeInTheDocument();
  });

  it("works in Arabic: right-to-left, Arabic names and dates", () => {
    vi.setSystemTime(new Date("2026-11-05T13:00:00"));
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <PrayerHero todaysTimes={times} tomorrowsFajr={tomorrowsFajr} hijri={hijri} />
      </LanguageProvider>
    );
    expect(hero()).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "العصر" })).toBeInTheDocument();
    expect(hero().querySelector(".prayer-hero-dates")).toHaveTextContent("جمادى الأولى");
    expect(hero().querySelector(".prayer-hero-countdown")).toHaveAttribute("dir", "ltr");
  });
});
