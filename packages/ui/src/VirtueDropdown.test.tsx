import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AzkarVirtue } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { VirtueDropdown } from "./VirtueDropdown.js";

const virtue: AzkarVirtue = {
  id: "subhanallah-bihamdihi-100",
  collection: "bukhari",
  number: "6405",
  book: 80,
  bookTitle: "Invocations",
  bookTitleAr: "كتاب الدعوات",
  arabic: "مَنْ قَالَ سُبْحَانَ اللَّهِ وَبِحَمْدِهِ فِي يَوْمٍ مِائَةَ مَرَّةٍ حُطَّتْ خَطَايَاهُ",
  meaning: "Whoever says it a hundred times in a day, his sins are wiped away.",
};
const second: AzkarVirtue = { ...virtue, id: "two-light-words", collection: "muslim", number: "2137", book: 38, bookTitle: "Manners", bookTitleAr: "كتاب الآداب", arabic: "كَلِمَتَانِ خَفِيفَتَانِ", meaning: "Two light words." };

describe("VirtueDropdown", () => {
  it("draws nothing for a dhikr with no firmly established virtue", () => {
    const { container } = render(<VirtueDropdown virtues={[]} showMeaning />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is closed to begin with — the dhikr stays what you read", () => {
    render(<VirtueDropdown virtues={[virtue]} showMeaning />);
    const toggle = screen.getByRole("button", { name: /Its virtue/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/سُبْحَانَ اللَّهِ/)).not.toBeInTheDocument();
  });

  it("opens to the Prophet's words and where they are, and closes again", () => {
    render(<VirtueDropdown virtues={[virtue]} showMeaning />);
    const toggle = screen.getByRole("button", { name: /Its virtue/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle.getAttribute("aria-controls")).toBe(screen.getByRole("region").id);
    expect(screen.getByText(/«مَنْ قَالَ سُبْحَانَ اللَّهِ وَبِحَمْدِهِ/)).toBeInTheDocument();
    expect(screen.getByText("Sahih al-Bukhari · Invocations · no. 6405")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows the Arabic always, and the English meaning only when asked for", () => {
    const { rerender } = render(<VirtueDropdown virtues={[virtue]} showMeaning={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Its virtue/ }));
    expect(screen.getByText(/«مَنْ قَالَ/)).toBeInTheDocument();
    expect(screen.queryByText(/Whoever says it a hundred times/)).not.toBeInTheDocument();
    rerender(<VirtueDropdown virtues={[virtue]} showMeaning />);
    expect(screen.getByText(/Whoever says it a hundred times/)).toBeInTheDocument();
  });

  it("lists every virtue it has, each with its own source", () => {
    render(<VirtueDropdown virtues={[virtue, second]} showMeaning={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Its virtue/ }));
    expect(screen.getAllByRole("figure")).toHaveLength(2);
    expect(screen.getByText("Sahih Muslim · Manners · no. 2137")).toBeInTheDocument();
  });

  it("says that only Bukhari and Muslim are shown, so no dropdown is not mistaken for no reward", () => {
    render(<VirtueDropdown virtues={[virtue]} showMeaning />);
    fireEvent.click(screen.getByRole("button", { name: /Its virtue/ }));
    expect(screen.getByText("Only hadith from Sahih al-Bukhari and Sahih Muslim are shown here.")).toBeInTheDocument();
  });

  it("speaks Arabic: the label, the source and the book in Arabic, and never the English meaning", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <VirtueDropdown virtues={[virtue]} showMeaning={false} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /فضل هذا الذكر/ }));
    expect(screen.getByText("صحيح البخاري · كتاب الدعوات · رقم 6405")).toBeInTheDocument();
    expect(screen.getByText("لا يُعرض هنا إلا ما ثبت في صحيح البخاري وصحيح مسلم.")).toBeInTheDocument();
    expect(screen.queryByText(/Whoever/)).not.toBeInTheDocument();
  });

  it("sets the Arabic right-to-left whatever the interface language", () => {
    render(<VirtueDropdown virtues={[virtue]} showMeaning />);
    fireEvent.click(screen.getByRole("button", { name: /Its virtue/ }));
    const quote = screen.getByText(/«مَنْ قَالَ/);
    expect(quote).toHaveAttribute("dir", "rtl");
    expect(quote).toHaveAttribute("lang", "ar");
  });
});
