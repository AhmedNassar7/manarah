import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AzkarCategory, AzkarSection } from "@manarah/core";
import { AzkarBrowser } from "./AzkarBrowser.js";
import { LanguageProvider } from "./i18n/index.js";

function category(id: string, name: string, nameArabic: string, arabic: string): AzkarCategory {
  return { id, name, nameArabic, trigger: "situational", items: [{ id: `${id}-1`, arabic, repeatCount: 1 }] };
}

const categories: AzkarCategory[] = [
  category("27", "Words of remembrance for morning and evening", "أذكار الصباح والمساء", "أصبحنا وأصبح الملك لله"),
  category("95", "Invocation for riding in a vehicle", "دعاء الركوب", "سبحان الذي سخر لنا هذا"),
  category("96", "Invocation for traveling", "دعاء السفر", "الله أكبر الله أكبر الله أكبر"),
  { id: "132", name: "Empty upstream category", trigger: "situational", items: [] },
];

const sections: AzkarSection[] = [
  { id: "morning-evening", icon: "🌅", categoryIds: ["27"] },
  { id: "travel", icon: "🧳", categoryIds: ["95", "96", "132"] },
];

describe("AzkarBrowser", () => {
  it("shows one tab per section and opens the first", () => {
    render(<AzkarBrowser sections={sections} categories={categories} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["🌅Morning & evening", "🧳Travel"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("opens a single-category section straight into its azkar", () => {
    render(<AzkarBrowser sections={sections} categories={categories} />);
    expect(screen.getByRole("heading", { name: categories[0].name })).toBeInTheDocument();
    expect(screen.getByText("أصبحنا وأصبح الملك لله")).toBeInTheDocument();
  });

  it("lists a multi-category section's categories, skipping empty ones, and opens one with a way back", () => {
    render(<AzkarBrowser sections={sections} categories={categories} />);
    fireEvent.click(screen.getByRole("tab", { name: /Travel/ }));

    const panel = screen.getByRole("tabpanel");
    const buttons = within(panel).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Invocation for riding in a vehicleAzkar: 1",
      "Invocation for travelingAzkar: 1",
    ]);

    fireEvent.click(buttons[1]);
    expect(screen.getByText("الله أكبر الله أكبر الله أكبر")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /All of Travel/ }));
    expect(screen.getAllByRole("button", { name: /Invocation for/ })).toHaveLength(2);
  });

  it("searches category titles across every section, in English or Arabic (with or without harakat)", () => {
    render(<AzkarBrowser sections={sections} categories={categories} />);
    const search = screen.getByRole("searchbox", { name: "Search azkar…" });

    fireEvent.change(search, { target: { value: "travel" } });
    expect(screen.getByRole("button", { name: /Invocation for traveling/ })).toHaveTextContent("🧳 Travel");
    expect(screen.queryByRole("button", { name: /riding/ })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "السَّفَر" } });
    fireEvent.click(screen.getByRole("button", { name: /Invocation for traveling/ }));
    expect(screen.getByText("الله أكبر الله أكبر الله أكبر")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Travel/ })).toHaveAttribute("aria-selected", "true");
  });

  it("says so when nothing matches", () => {
    render(<AzkarBrowser sections={sections} categories={categories} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No azkar match your search")).toBeInTheDocument();
  });

  it("uses Hisn al-Muslim's Arabic category titles in the Arabic UI", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <AzkarBrowser sections={sections} categories={categories} initialSectionId="travel" />
      </LanguageProvider>
    );
    expect(screen.getByRole("tab", { name: /السفر/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /دعاء السفر/ })).toBeInTheDocument();
  });
});
