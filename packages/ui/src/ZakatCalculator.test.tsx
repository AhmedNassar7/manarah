import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ZAKAT_FORM, type ZakatForm } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { ZakatCalculator, type ZakatLivePrices } from "./ZakatCalculator.js";

const READY: ZakatLivePrices = { status: "ready", gold: 100, silver: 1, updatedAt: new Date(Date.now() - 5 * 60_000) };

function Harness({
  initial,
  prices = READY,
  onRefreshPrices,
  defaultCurrency = "USD",
}: {
  initial?: Partial<ZakatForm>;
  prices?: ZakatLivePrices;
  onRefreshPrices?: () => void;
  defaultCurrency?: string;
}) {
  const [form, setForm] = useState<ZakatForm>({ ...DEFAULT_ZAKAT_FORM, ...initial });
  return <ZakatCalculator form={form} onChange={setForm} defaultCurrency={defaultCurrency} prices={prices} onRefreshPrices={onRefreshPrices} />;
}

function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const result = () => document.querySelector(".zakat-result") as HTMLElement;

/** The cash box — the first of the three plain "Amount" boxes (cash, trade goods, shares). */
function typeCash(value: string, currency = "USD") {
  const boxes = screen.getAllByLabelText(new RegExp(`^Amount \\(${currency}\\)$`));
  fireEvent.change(boxes[0], { target: { value } });
}

describe("ZakatCalculator — automatic prices", () => {
  it("shows today's gold and silver price per gram, already filled in, and when they were updated", () => {
    render(<Harness />);
    expect(screen.getByText("Gold (24k), per gram").nextElementSibling).toHaveTextContent("$100.00");
    expect(screen.getByText("Silver, per gram").nextElementSibling).toHaveTextContent("$1.00");
    expect(screen.getByText(/Updated automatically — 5 minutes ago/)).toBeInTheDocument();
    expect(screen.getByText(/international market price/)).toBeInTheDocument();
  });

  it("needs no price from the user: cash alone is enough", () => {
    render(<Harness />);
    typeCash("10000", "USD"); // the first Amount box is cash
    expect(result()).toHaveTextContent("Zakat due: $250.00");
    expect(result()).toHaveTextContent("has reached the silver nisab ($595.00 — 595 g)");
  });
});

describe("ZakatCalculator — the five kinds of wealth", () => {
  it("offers cash, gold, silver, trade goods and shares, each as one simple box", () => {
    render(<Harness />);
    for (const title of ["Cash and savings", "Gold", "Silver", "Trade goods", "Shares and funds"]) {
      expect(screen.getByRole("heading", { name: title, level: 4 })).toBeInTheDocument();
    }
  });

  it("prices gold from the weight and the karat, and says what it's worth", () => {
    render(<Harness />);
    type(/Gold \(grams\)/, "100");
    fireEvent.change(screen.getByLabelText("Gold purity"), { target: { value: "18" } });
    // 100 g × 18/24 = 75 g pure × $100 = $7,500 -> zakat $187.50
    expect(screen.getByText("Worth about $7,500.00")).toBeInTheDocument();
    expect(result()).toHaveTextContent("Zakat due: $187.50");
  });

  it("prices silver by weight", () => {
    render(<Harness />);
    type(/Silver \(grams\)/, "1000");
    expect(screen.getByText("Worth about $1,000.00")).toBeInTheDocument();
    expect(result()).toHaveTextContent("Zakat due: $25.00");
  });

  it("counts trade goods and shares", () => {
    render(<Harness />);
    const [, trade, shares] = screen.getAllByLabelText(/^Amount \(USD\)$/);
    fireEvent.change(trade, { target: { value: "3000" } });
    fireEvent.change(shares, { target: { value: "7000" } });
    expect(result()).toHaveTextContent("Zakat due: $250.00");
  });

  it("shows how much of the zakat each kind of wealth accounts for", () => {
    render(<Harness />);
    const [cash, , shares] = screen.getAllByLabelText(/^Amount \(USD\)$/);
    fireEvent.change(cash, { target: { value: "6000" } });
    fireEvent.change(shares, { target: { value: "4000" } });
    expect(screen.getByText("How it adds up")).toBeInTheDocument();
    expect(screen.getByText("Cash and savings", { selector: "dt" }).nextElementSibling).toHaveTextContent(/\$6,000\.00\s*\$150\.00/);
    expect(screen.getByText("Shares and funds", { selector: "dt" }).nextElementSibling).toHaveTextContent(/\$4,000\.00\s*\$100\.00/);
  });

  it("combines kinds to reach the nisab, and says when it isn't reached", () => {
    render(<Harness />);
    typeCash("500", "USD");
    expect(result()).toHaveTextContent("No zakat is due");
    expect(result()).toHaveTextContent("below the silver nisab");
  });

  it("subtracts debts that are due now", () => {
    render(<Harness />);
    typeCash("10000", "USD");
    type(/Debts due now/, "9700");
    expect(result()).toHaveTextContent("No zakat is due");
  });

  it("keeps receivables and other assets one tap away rather than cluttering the page", () => {
    render(<Harness />);
    expect(document.querySelector(".zakat-more")).not.toHaveAttribute("open");
    expect(screen.getByText("More (optional)")).toBeInTheDocument();
  });

  it("uses the gold nisab if chosen under Advanced", () => {
    render(<Harness />);
    typeCash("5000", "USD");
    expect(result()).toHaveTextContent("Zakat due: $125.00");
    fireEvent.click(screen.getByRole("radio", { name: /Gold — 85 g/ }));
    expect(result()).toHaveTextContent("No zakat is due"); // 5,000 < 85 g × $100 = 8,500
  });
});

describe("ZakatCalculator — when prices aren't ready", () => {
  it("says it is getting them, instead of an error, while loading", () => {
    render(<Harness prices={{ status: "loading" }} onRefreshPrices={() => {}} />);
    expect(screen.getByText("Getting today's prices…")).toBeInTheDocument();
    expect(result()).toHaveTextContent("Getting today's prices to work this out…");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  });

  it("offers manual entry when they couldn't be had and nothing was saved", () => {
    render(<Harness prices={{ status: "failed" }} />);
    expect(screen.getByText(/Couldn't get today's prices/)).toBeInTheDocument();
    expect(result()).toHaveTextContent("Today's prices aren't available");
    fireEvent.click(within(result()).getByRole("button", { name: "I'll enter the prices myself" }));
    expect(screen.getByLabelText(/Gold price per gram/)).toBeInTheDocument();
  });

  it("warns when it is showing the last saved prices", () => {
    render(<Harness prices={{ ...READY, status: "stale", updatedAt: new Date(Date.now() - 3 * 3_600_000) }} />);
    expect(screen.getByText(/Couldn't refresh. Showing the last saved prices \(3 hours ago\)/)).toBeInTheDocument();
    typeCash("10000", "USD");
    expect(result()).toHaveTextContent("Zakat due: $250.00"); // still calculates with them
  });

  it("falls back to prices the user typed earlier if the fetch fails", () => {
    render(<Harness prices={{ status: "failed" }} initial={{ goldPrice: "100", silverPrice: "1" }} />);
    typeCash("10000", "USD");
    expect(result()).toHaveTextContent("Zakat due: $250.00");
  });

  it("asks the app to refresh the prices", () => {
    const onRefreshPrices = vi.fn();
    render(<Harness onRefreshPrices={onRefreshPrices} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefreshPrices).toHaveBeenCalledTimes(1);
  });
});

describe("ZakatCalculator — entering prices yourself", () => {
  it("switches to the user's own prices, and back", () => {
    render(<Harness initial={{ priceMode: "manual", goldPrice: "200", silverPrice: "2" }} />);
    type(/Gold \(grams\)/, "10");
    // 10 g × $200 = $2,000 > nisab 595 × $2 = $1,190
    expect(result()).toHaveTextContent("Zakat due: $50.00");

    fireEvent.click(screen.getByRole("button", { name: "Use automatic prices" }));
    expect(screen.getByText("Gold (24k), per gram").nextElementSibling).toHaveTextContent("$100.00");
    expect(screen.queryByLabelText(/Gold price per gram/)).not.toBeInTheDocument();
  });

  it("ignores the automatic price while in manual mode", () => {
    render(<Harness initial={{ priceMode: "manual", goldPrice: "1", silverPrice: "1" }} />);
    type(/Gold \(grams\)/, "100");
    expect(screen.getByText("Worth about $100.00")).toBeInTheDocument(); // not 100 × $100
  });
});

describe("ZakatCalculator — currency and input", () => {
  it("starts in the default currency and lets the user pick another", () => {
    render(<Harness defaultCurrency="EGP" />);
    expect(screen.getByLabelText("Currency")).toHaveValue("EGP");
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    typeCash("10000", "EUR");
    expect(result().textContent).toContain("€250.00");
  });

  it("flags a field that isn't a number and counts it as 0", () => {
    render(<Harness />);
    typeCash("12abc", "USD");
    expect(screen.getAllByRole("textbox")[0]).toHaveAttribute("aria-invalid", "true");
    expect(result()).toHaveTextContent("counted as 0");
  });

  it("understands Arabic-Indic digits", () => {
    render(<Harness />);
    typeCash("١٠٠٠٠", "USD");
    expect(result()).toHaveTextContent("Zakat due: $250.00");
  });

  it("clears the amounts but keeps the currency, price mode and nisab choice", () => {
    render(<Harness initial={{ currency: "EGP", nisabBasis: "gold", priceMode: "manual", goldPrice: "50", silverPrice: "1" }} />);
    typeCash("999", "EGP");
    fireEvent.click(screen.getByRole("button", { name: "Clear amounts" }));
    expect(screen.getAllByLabelText(/^Amount \(EGP\)$/)[0]).toHaveValue("");
    expect(screen.getByLabelText("Currency")).toHaveValue("EGP");
    expect(screen.getByLabelText(/Gold price per gram/)).toHaveValue("50");
    expect(screen.getByRole("radio", { name: /Gold — 85 g/ })).toBeChecked();
  });
});

describe("ZakatCalculator — honesty and language", () => {
  it("states the scholarly caveats and that nothing leaves the device", () => {
    render(<Harness />);
    const notes = document.querySelector(".zakat-notes")!;
    expect(notes).toHaveTextContent("full lunar year");
    expect(notes).toHaveTextContent("not a fatwa");
    expect(notes).toHaveTextContent("Nothing you enter leaves this device");
    expect(screen.getByText(/Hanafi view counts gold and silver jewelry/)).toBeInTheDocument();
  });

  it("works in Arabic, right-to-left", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <Harness />
      </LanguageProvider>
    );
    fireEvent.change(screen.getAllByLabelText(/^المبلغ \(USD\)$/)[0], { target: { value: "10000" } });
    expect(result()).toHaveTextContent("الزكاة الواجبة");
    expect(result()).toHaveTextContent("كيف حُسبت");
    expect(document.querySelector(".zakat")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("غرام الذهب (عيار 24)")).toBeInTheDocument();
  });
});
