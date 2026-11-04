import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ZAKAT_FORM, type ZakatForm } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { ZakatCalculator } from "./ZakatCalculator.js";

function Harness({ initial, onChange }: { initial?: Partial<ZakatForm>; onChange?: (f: ZakatForm) => void }) {
  const [form, setForm] = useState<ZakatForm>({ ...DEFAULT_ZAKAT_FORM, ...initial });
  return (
    <ZakatCalculator
      form={form}
      onChange={(next) => {
        setForm(next);
        onChange?.(next);
      }}
    />
  );
}

function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const result = () => document.querySelector(".zakat-result")!;

describe("ZakatCalculator", () => {
  it("asks for the silver price first — the default nisab basis needs it", () => {
    render(<Harness />);
    expect(result()).toHaveTextContent("Enter the silver price per gram to work this out.");
  });

  it("owes 2.5% when wealth reaches the nisab", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "10000");
    expect(result()).toHaveTextContent("Zakat due: $250.00");
    expect(result()).toHaveTextContent("has reached the silver nisab ($595.00 — 595 g)");
  });

  it("says no zakat is due below the nisab", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "500");
    expect(result()).toHaveTextContent("No zakat is due");
    expect(result()).toHaveTextContent("is below the silver nisab");
  });

  it("switches to the higher gold nisab on request, and then needs the gold price", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "5000");
    expect(result()).toHaveTextContent("Zakat due: $125.00");

    fireEvent.click(screen.getByRole("radio", { name: /Gold — 85 g/ }));
    expect(result()).toHaveTextContent("Enter the gold price per gram");

    type(/Gold price per gram/, "70");
    expect(result()).toHaveTextContent("No zakat is due"); // 5,000 < 85 g × 70 = 5,950
  });

  it("subtracts debts that are due now", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "10000");
    type(/Debts due now/, "9700");
    expect(result()).toHaveTextContent("No zakat is due");
    expect(result()).toHaveTextContent("Net wealth");
  });

  it("values gold by weight and purity", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Gold price per gram/, "70");
    type(/Gold \(grams\)/, "100");
    fireEvent.change(screen.getByLabelText("Gold purity"), { target: { value: "18" } });
    // 100 g × 18/24 = 75 g pure × 70 = 5,250 → 2.5% = 131.25
    expect(result()).toHaveTextContent("Zakat due: $131.25");
    expect(result()).toHaveTextContent("Gold (75 g pure)");
  });

  it("flags a field that isn't a number, counts it as 0, and says so", () => {
    render(<Harness />);
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "12abc");
    expect(screen.getByLabelText(/Cash, bank balances/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Not a valid number")).toBeInTheDocument();
    expect(result()).toHaveTextContent("counted as 0");
    expect(result()).toHaveTextContent("No zakat is due");
  });

  it("understands Arabic-Indic digits and a European thousands dot", () => {
    render(<Harness />);
    type(/Silver price per gram/, "١");
    type(/Cash, bank balances/, "١٠٠٠٠");
    expect(result()).toHaveTextContent("Zakat due: $250.00");

    type(/Cash, bank balances/, "10.000"); // 10 thousand, not ten
    expect(result()).toHaveTextContent("Zakat due: $250.00");
  });

  it("formats amounts in the chosen currency", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    type(/Silver price per gram/, "1");
    type(/Cash, bank balances/, "10000");
    expect(result().textContent).toContain("€250.00");
  });

  it("reports every change so the form can be saved", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    type(/Cash, bank balances/, "250");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ cash: "250" }));
  });

  it("clears amounts but keeps the currency and nisab basis", () => {
    render(<Harness initial={{ currency: "EGP", nisabBasis: "gold" }} />);
    type(/Cash, bank balances/, "999");
    type(/Gold price per gram/, "3000");
    fireEvent.click(screen.getByRole("button", { name: "Clear amounts" }));

    expect(screen.getByLabelText(/Cash, bank balances/)).toHaveValue("");
    expect(screen.getByLabelText(/Gold price per gram/)).toHaveValue("");
    expect(screen.getByLabelText("Currency")).toHaveValue("EGP");
    expect(screen.getByRole("radio", { name: /Gold — 85 g/ })).toBeChecked();
  });

  it("states the scholarly caveats: the lunar year, jewelry, nisab variants, and that it is not a fatwa", () => {
    render(<Harness />);
    const notes = document.querySelector(".zakat-notes")!;
    expect(notes).toHaveTextContent("full lunar year");
    expect(notes).toHaveTextContent("87.48 g");
    expect(notes).toHaveTextContent("not a fatwa");
    expect(screen.getByText(/Hanafi view counts gold and silver jewelry/)).toBeInTheDocument();
    expect(notes).toHaveTextContent("Nothing you enter leaves this device");
  });

  it("works in Arabic, right-to-left", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <Harness />
      </LanguageProvider>
    );
    type(/سعر غرام الفضة/, "1");
    type(/النقد والأرصدة/, "10000");
    expect(result()).toHaveTextContent("الزكاة الواجبة");
    expect(document.querySelector(".zakat")).toHaveAttribute("dir", "rtl");
  });
});
