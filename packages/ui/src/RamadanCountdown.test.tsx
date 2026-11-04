import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { daysInHijriMonth, hijriToGregorian } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { RamadanCountdown } from "./RamadanCountdown.js";

const DAY = 86_400_000;
const firstOfRamadan = hijriToGregorian({ year: 1448, month: 9, day: 1 });
const at = (offsetDays: number) => new Date(firstOfRamadan.getTime() + offsetDays * DAY);
const card = () => document.querySelector(".ramadan-card")!;

describe("RamadanCountdown", () => {
  it("counts the days until Ramadan, with the expected date and a caveat that it is calculated", () => {
    render(<RamadanCountdown todayCivil={at(-95)} />);
    expect(card()).toHaveAttribute("data-phase", "before");
    expect(card().querySelector(".ramadan-card-number strong")).toHaveTextContent("95");
    expect(card()).toHaveTextContent("days to go");
    expect(card()).toHaveTextContent("Expected");
    expect(card()).toHaveTextContent("confirm with your local announcement");
  });

  it("is exact for screen readers", () => {
    render(<RamadanCountdown todayCivil={at(-30)} />);
    expect(screen.getByLabelText("30 days until Ramadan")).toBeInTheDocument();
  });

  it("says Ramadan starts tomorrow when it is one day away, in the singular", () => {
    render(<RamadanCountdown todayCivil={at(-1)} />);
    expect(card().querySelector(".ramadan-card-number strong")).toHaveTextContent("1");
    expect(card()).toHaveTextContent("day to go");
    expect(card()).not.toHaveTextContent("days to go");
    expect(card()).toHaveTextContent("Expected to begin tomorrow");
  });

  it("turns into 'Day N of 30' with a progress bar once Ramadan begins", () => {
    render(<RamadanCountdown todayCivil={at(12)} />);
    const length = daysInHijriMonth(1448, 9);
    expect(card()).toHaveAttribute("data-phase", "during");
    expect(card()).toHaveTextContent("Ramadan Mubarak");
    expect(screen.getByRole("progressbar", { name: `Day 13 of ${length}` })).toHaveAttribute("aria-valuenow", "13");
    expect(card()).toHaveTextContent(`${length - 13} days left`);
  });

  it("fills the bar in proportion to the days that have passed", () => {
    render(<RamadanCountdown todayCivil={at(14)} />);
    const length = daysInHijriMonth(1448, 9);
    const bar = card().querySelector(".ramadan-card-bar span") as HTMLElement;
    expect(parseFloat(bar.style.width)).toBeCloseTo((15 / length) * 100, 1);
  });

  it("marks the last day of Ramadan", () => {
    render(<RamadanCountdown todayCivil={at(daysInHijriMonth(1448, 9) - 1)} />);
    expect(card()).toHaveTextContent("The last day of Ramadan");
  });

  it("wishes Eid Mubarak on the first of Shawwal", () => {
    render(<RamadanCountdown todayCivil={at(daysInHijriMonth(1448, 9))} />);
    expect(card()).toHaveAttribute("data-phase", "eid");
    expect(card()).toHaveTextContent("Eid Mubarak!");
    expect(card()).toHaveTextContent("Taqabbal Allahu minna wa minkum");
  });

  it("follows the Hijri adjustment: a later date brings Ramadan a day closer", () => {
    render(<RamadanCountdown todayCivil={at(-95)} adjustment={1} />);
    expect(card().querySelector(".ramadan-card-number strong")).toHaveTextContent("94");
  });

  it("works in Arabic, right-to-left", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <RamadanCountdown todayCivil={at(-95)} />
      </LanguageProvider>
    );
    expect(card()).toHaveAttribute("dir", "rtl");
    expect(card()).toHaveTextContent("رمضان قادم");
    expect(card()).toHaveTextContent("يومًا متبقيًا");
  });
});
