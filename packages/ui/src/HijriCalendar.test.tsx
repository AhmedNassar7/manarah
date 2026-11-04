import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { daysInHijriMonth, hijriMonthDays, hijriToGregorian, type HijriDate } from "@manarah/core";
import { HijriCalendar, HijriToday, type HijriCalendarProps } from "./HijriCalendar.js";
import { LanguageProvider } from "./i18n/index.js";

const TODAY: HijriDate = { year: 1448, month: 2, day: 10 };

function setup(overrides: Partial<HijriCalendarProps> = {}, language: "en" | "ar" = "en") {
  const props: HijriCalendarProps = {
    today: TODAY,
    todayCivil: hijriToGregorian(TODAY),
    adjustment: 0,
    onAdjustmentChange: vi.fn(),
    remindersEnabled: true,
    onRemindersChange: vi.fn(),
    ...overrides,
  };
  const ui = <HijriCalendar {...props} />;
  const result = render(
    language === "ar" ? (
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        {ui}
      </LanguageProvider>
    ) : (
      ui
    )
  );
  return { props, ...result };
}

const heading = () => screen.getByRole("table").getAttribute("aria-label");
const dayCells = () => screen.getAllByRole("cell").filter((c) => c.getAttribute("aria-label"));

describe("HijriToday", () => {
  it("writes the date in words, in the UI language", () => {
    const { container } = render(<HijriToday hijri={{ year: 1448, month: 4, day: 21 }} />);
    expect(container).toHaveTextContent("21 Rabi' al-Thani 1448 AH");
  });
});

describe("HijriCalendar", () => {
  it("shows today's Hijri date and the Gregorian date beneath it", () => {
    setup();
    const hero = document.querySelector(".hijri-hero")!;
    expect(hero).toHaveTextContent("10 Safar 1448 AH");
    const civil = hijriToGregorian(TODAY);
    expect(hero.textContent).toContain(String(civil.getUTCFullYear()));
  });

  it("draws every day of the month, each labelled with its Hijri and Gregorian date", () => {
    setup();
    expect(heading()).toBe("Safar 1448 AH");
    const cells = dayCells();
    expect(cells).toHaveLength(daysInHijriMonth(1448, 2));
    expect(cells[0].getAttribute("aria-label")).toMatch(/^1 Safar 1448 · \w+day, /);
    const monthDays = hijriMonthDays(1448, 2);
    expect(within(cells[0]).getByText(String(monthDays[0].date.getUTCDate()))).toBeInTheDocument();
  });

  it("marks today, and only today", () => {
    setup();
    const current = document.querySelectorAll('[aria-current="date"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(/^10/);
  });

  it("starts the week on Sunday in English and Saturday in Arabic", () => {
    const en = setup();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers[0]).toMatch(/Sun/);
    en.unmount();

    setup({}, "ar");
    const arHeaders = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(arHeaders[0]).toMatch(/السبت|س/);
    expect(arHeaders).toHaveLength(7);
  });

  it("places day 1 under the right weekday column", () => {
    setup();
    const firstWeek = screen.getAllByRole("row")[1];
    const cells = within(firstWeek).getAllByRole("cell");
    const firstReal = cells.findIndex((c) => c.getAttribute("aria-label"));
    expect(firstReal).toBe(hijriMonthDays(1448, 2)[0].weekday); // Sunday-first: weekday index == column
  });
});

describe("HijriCalendar — navigation", () => {
  it("moves between months and rolls the year over", () => {
    setup({ today: { year: 1448, month: 12, day: 5 }, todayCivil: hijriToGregorian({ year: 1448, month: 12, day: 5 }) });
    expect(heading()).toBe("Dhu al-Hijjah 1448 AH");

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(heading()).toBe("Muharram 1449 AH");
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(heading()).toBe("Dhu al-Qi'dah 1448 AH");
  });

  it("offers a way back to today only when you've moved away, and it works", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Back to today" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));
    expect(heading()).toBe("Safar 1448 AH");
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Back to today" })).not.toBeInTheDocument();
  });
});

describe("HijriCalendar — observances", () => {
  it("lists the White Days as one entry covering 13-15", () => {
    setup();
    const list = screen.getAllByRole("list")[0];
    expect(within(list).getByText("White Days — recommended fast")).toBeInTheDocument();
    expect(list).toHaveTextContent("13–15 Safar");
  });

  it("marks Ashura in Muharram and tints Eid days", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" })); // Muharram 1448
    const ashura = dayCells()[9];
    expect(ashura.getAttribute("aria-label")).toContain("Ashura — recommended fast");
    expect(ashura).toHaveClass("hijri-cell-event");
    expect(screen.getAllByRole("list")[0]).toHaveTextContent("Ashura — recommended fast");
    expect(screen.getAllByRole("list")[0]).toHaveTextContent("Tasu'a — recommended fast");

    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole("button", { name: "Next month" })); // Muharram -> Shawwal 1448
    expect(heading()).toBe("Shawwal 1448 AH");
    expect(dayCells()[0]).toHaveClass("hijri-cell-eid");
    expect(dayCells()[0].getAttribute("aria-label")).toContain("Eid al-Fitr");
  });

  it("does not offer a White Days fast on 13 Dhu al-Hijjah (Tashreeq)", () => {
    setup({ today: { year: 1448, month: 12, day: 1 }, todayCivil: hijriToGregorian({ year: 1448, month: 12, day: 1 }) });
    const cells = dayCells();
    expect(cells[12]).not.toHaveClass("hijri-cell-white");
    expect(cells[13]).toHaveClass("hijri-cell-white");
    expect(cells[14]).toHaveClass("hijri-cell-white");
    expect(screen.getAllByRole("list")[0]).toHaveTextContent("14–15 Dhu al-Hijjah");
  });

  it("lists the coming events with how far away each is", () => {
    setup();
    const upcoming = screen.getAllByRole("list")[1];
    expect(within(upcoming).getAllByRole("listitem")).toHaveLength(4);
    expect(upcoming.textContent).toMatch(/In \d+ days|Tomorrow|Today/);
  });
});

describe("HijriCalendar — adjustment", () => {
  it("steps the adjustment by one day each way", () => {
    const { props } = setup({ adjustment: 0 });
    fireEvent.click(screen.getByRole("button", { name: "One day later" }));
    expect(props.onAdjustmentChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "One day earlier" }));
    expect(props.onAdjustmentChange).toHaveBeenCalledWith(-1);
  });

  it("shows the signed value and stops at ±2", () => {
    const { unmount } = setup({ adjustment: 2 });
    expect(screen.getByRole("status")).toHaveTextContent("+2 days");
    expect(screen.getByRole("button", { name: "One day later" })).toBeDisabled();
    unmount();

    setup({ adjustment: -2 });
    expect(screen.getByRole("status")).toHaveTextContent("−2 days");
    expect(screen.getByRole("button", { name: "One day earlier" })).toBeDisabled();
  });

  it("moves each Hijri day onto an earlier civil date when the adjustment is later", () => {
    const base = setup({ adjustment: 0 });
    const day1Civil = within(dayCells()[0]).getByText(/^\d+$/, { selector: ".hijri-greg" }).textContent;
    base.unmount();

    setup({ adjustment: 1 });
    const shiftedCivil = within(dayCells()[0]).getByText(/^\d+$/, { selector: ".hijri-greg" }).textContent;
    const expected = hijriMonthDays(1448, 2, 1)[0].date.getUTCDate();
    expect(Number(shiftedCivil)).toBe(expected);
    expect(shiftedCivil).not.toBe(day1Civil);
  });

  it("always carries the calculated-not-sighted warning", () => {
    setup();
    expect(screen.getByText(/not sighted/)).toBeInTheDocument();
  });
});

describe("HijriCalendar — reminders", () => {
  it("shows whether reminders are on and reports a change", () => {
    const { props } = setup({ remindersEnabled: true });
    const checkbox = screen.getByRole("checkbox", { name: /Remind me about these days/ });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(props.onRemindersChange).toHaveBeenCalledWith(false);
  });

  it("reflects the off state", () => {
    setup({ remindersEnabled: false });
    expect(screen.getByRole("checkbox", { name: /Remind me about these days/ })).not.toBeChecked();
  });
});

describe("HijriCalendar — Arabic", () => {
  it("uses Arabic month names, the Arabic era label and a right-to-left layout", () => {
    setup({}, "ar");
    expect(heading()).toBe("صفر 1448 هـ");
    expect(document.querySelector(".hijri-calendar")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("الأيام البيض — صيام مستحب")).toBeInTheDocument();
  });
});
