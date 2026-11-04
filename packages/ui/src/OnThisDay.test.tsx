import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hijriToGregorian, type HistoricalEvent } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { OnThisDay } from "./OnThisDay.js";

const DAY = 86_400_000;
const events: HistoricalEvent[] = [
  {
    id: "badr",
    hijri: { month: 9, day: 17, year: 2 },
    confidence: "established",
    title: { en: "Battle of Badr (2 AH)", ar: "غزوة بدر الكبرى (2هـ)" },
    note: { en: "The first major battle of Islam.", ar: "أول معركة فاصلة في الإسلام." },
  },
  {
    id: "birth",
    hijri: { month: 3, day: 12 },
    confidence: "traditional",
    title: { en: "Birth of the Prophet (traditional date)", ar: "مولد النبي (التاريخ المشهور)" },
    note: { en: "Scholars differ on the exact day.", ar: "يختلف العلماء في اليوم." },
  },
];
const civil = (month: number, day: number) => hijriToGregorian({ year: 1448, month, day });

describe("OnThisDay", () => {
  it("shows what happened on today's Hijri date, with its note", () => {
    render(<OnThisDay events={events} todayCivil={civil(9, 17)} />);
    expect(screen.getByText("Battle of Badr (2 AH)")).toBeInTheDocument();
    expect(screen.getByText("The first major battle of Islam.")).toBeInTheDocument();
    expect(screen.queryByText("Coming up")).not.toBeInTheDocument();
  });

  it("labels how sure the date is", () => {
    const { unmount } = render(<OnThisDay events={events} todayCivil={civil(9, 17)} />);
    expect(screen.getByText("Established")).toBeInTheDocument();
    unmount();
    render(<OnThisDay events={events} todayCivil={civil(3, 12)} />);
    expect(screen.getByText("Traditional date")).toBeInTheDocument();
  });

  it("on a day with no event, says so and shows the next ones with how far away they are", () => {
    render(<OnThisDay events={events} todayCivil={new Date(civil(9, 17).getTime() - 10 * DAY)} />);
    expect(screen.getByText("No recorded event for today.")).toBeInTheDocument();
    expect(screen.getByText("Coming up")).toBeInTheDocument();
    expect(screen.getByText(/17 Ramadan/)).toHaveTextContent("In 10 days");
    expect(screen.getByText("Battle of Badr (2 AH)")).toBeInTheDocument();
  });

  it("says tomorrow for the next day", () => {
    render(<OnThisDay events={events} todayCivil={new Date(civil(9, 17).getTime() - DAY)} />);
    expect(screen.getByText(/17 Ramadan/)).toHaveTextContent("Tomorrow");
  });

  it("limits how many upcoming events it lists", () => {
    render(<OnThisDay events={events} todayCivil={civil(6, 4)} upcomingCount={1} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("follows the Hijri adjustment", () => {
    render(<OnThisDay events={events} todayCivil={new Date(civil(9, 17).getTime() - DAY)} adjustment={1} />);
    expect(screen.getByText("Battle of Badr (2 AH)")).toBeInTheDocument();
    expect(screen.queryByText("Coming up")).not.toBeInTheDocument();
  });

  it("is in Arabic when the app is", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <OnThisDay events={events} todayCivil={civil(9, 17)} />
      </LanguageProvider>
    );
    expect(screen.getByText("غزوة بدر الكبرى (2هـ)")).toBeInTheDocument();
    expect(screen.getByText("متفق عليه")).toBeInTheDocument();
    expect(document.querySelector(".on-this-day")).toHaveAttribute("dir", "rtl");
  });
});
