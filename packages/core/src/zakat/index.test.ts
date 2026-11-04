import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZAKAT_FORM,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  calculateZakat,
  formToInput,
  nisabValues,
  parseAmount,
  withDefaultZakatForm,
  type ZakatInput,
} from "./index.js";

const base: ZakatInput = {
  cash: 0,
  goldGrams: 0,
  goldKarat: 24,
  silverGrams: 0,
  investments: 0,
  business: 0,
  receivables: 0,
  other: 0,
  liabilities: 0,
  goldPrice: 70, // per gram, any currency
  silverPrice: 1,
  nisabBasis: "silver",
};

describe("constants", () => {
  it("uses the standard nisab weights and the 2.5% rate", () => {
    expect(NISAB_GOLD_GRAMS).toBe(85);
    expect(NISAB_SILVER_GRAMS).toBe(595);
    expect(ZAKAT_RATE).toBe(0.025);
  });
});

describe("parseAmount", () => {
  it("reads plain, decimal and thousands-separated numbers", () => {
    expect(parseAmount("1250")).toBe(1250);
    expect(parseAmount("1250.5")).toBe(1250.5);
    expect(parseAmount("1,250")).toBe(1250);
    expect(parseAmount("1,250,000.75")).toBe(1250000.75);
    expect(parseAmount("1 250")).toBe(1250);
    expect(parseAmount(".5")).toBe(0.5);
    expect(parseAmount("5.")).toBe(5);
  });

  it("reads the European style, where a comma is the decimal separator", () => {
    expect(parseAmount("1.250,50")).toBe(1250.5);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("0,75")).toBe(0.75);
  });

  it("reads a dot-grouped money amount as thousands, not as a tiny decimal — understating wealth is the worse mistake", () => {
    expect(parseAmount("1.250")).toBe(1250);
    expect(parseAmount("1.250.000")).toBe(1250000);
    expect(parseAmount("12.345")).toBe(12345);
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("1250.50")).toBe(1250.5);
    expect(parseAmount("1.2500")).toBe(1.25);
    expect(parseAmount("0.500")).toBe(0.5); // a leading-zero group is a decimal
  });

  it("keeps a dot as the decimal point for weights and per-gram prices", () => {
    expect(parseAmount("10.500", "decimal")).toBe(10.5);
    expect(parseAmount("0.855", "decimal")).toBe(0.855);
    expect(parseAmount("1.250", "decimal")).toBe(1.25);
    expect(parseAmount("85.125", "decimal")).toBe(85.125);
  });

  it("reads Arabic-Indic and Persian digits and separators", () => {
    expect(parseAmount("١٢٥٠")).toBe(1250);
    expect(parseAmount("١٢٥٠٫٥")).toBe(1250.5);
    expect(parseAmount("١٬٢٥٠")).toBe(1250);
    expect(parseAmount("۱۲۳")).toBe(123);
  });

  it("treats empty as 0 and rejects anything that isn't a plain non-negative number", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("   ")).toBe(0);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("12abc")).toBeNull();
    expect(parseAmount("-50")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
    expect(parseAmount("1e5")).toBeNull();
    expect(parseAmount(".")).toBeNull();
  });
});

describe("calculateZakat — the threshold", () => {
  it("owes nothing below the silver nisab", () => {
    // Silver nisab = 595 g × 1 = 595.
    const r = calculateZakat({ ...base, cash: 594.99 });
    expect(r).toMatchObject({ status: "calculated", due: false, zakat: 0, nisabValue: 595 });
  });

  it("owes 2.5% once net wealth reaches the nisab — exactly at it counts", () => {
    const r = calculateZakat({ ...base, cash: 595 });
    expect(r).toMatchObject({ due: true, zakat: 14.88 }); // 595 × 0.025 = 14.875 → 14.88
  });

  it("owes 2.5% of all of it, not just the part above the nisab", () => {
    const r = calculateZakat({ ...base, cash: 10_000 });
    expect(r).toMatchObject({ due: true, net: 10_000, zakat: 250 });
  });

  it("uses the gold nisab when that basis is chosen — a higher bar", () => {
    // Gold nisab = 85 g × 70 = 5950.
    expect(calculateZakat({ ...base, nisabBasis: "gold", cash: 5000 })).toMatchObject({ due: false, nisabValue: 5950 });
    expect(calculateZakat({ ...base, nisabBasis: "gold", cash: 6000 })).toMatchObject({ due: true, zakat: 150 });
  });

  it("owes nothing on zero wealth even if the nisab price is zero-ish", () => {
    expect(calculateZakat({ ...base })).toMatchObject({ due: false, zakat: 0 });
  });
});

describe("calculateZakat — what counts", () => {
  it("adds every category of wealth", () => {
    const r = calculateZakat({
      ...base,
      cash: 1000,
      investments: 2000,
      business: 3000,
      receivables: 400,
      other: 100,
    });
    expect(r).toMatchObject({ assets: 6500, net: 6500, zakat: 162.5 });
  });

  it("values gold as pure gold: weight × karat ÷ 24 × the 24k price", () => {
    const r = calculateZakat({ ...base, goldGrams: 100, goldKarat: 18 });
    // 100 g of 18k = 75 g pure; × 70 = 5250.
    expect(r).toMatchObject({ pureGoldGrams: 75 });
    expect(r.status === "calculated" && r.breakdown.gold).toBe(5250);
  });

  it("values silver by weight", () => {
    const r = calculateZakat({ ...base, silverGrams: 1000, silverPrice: 0.9 });
    expect(r.status === "calculated" && r.breakdown.silver).toBe(900);
  });

  it("subtracts debts due now, and never goes below zero", () => {
    expect(calculateZakat({ ...base, cash: 10_000, liabilities: 9_500 })).toMatchObject({ net: 500, due: false });
    expect(calculateZakat({ ...base, cash: 1_000, liabilities: 5_000 })).toMatchObject({ net: 0, due: false, zakat: 0 });
  });

  it("brings someone over the nisab through combined assets, as the rule intends", () => {
    // Gold alone (5 g = 350) and cash alone (300) are each under 595; together 650 is over.
    const r = calculateZakat({ ...base, cash: 300, goldGrams: 5 });
    expect(r).toMatchObject({ due: true, assets: 650, zakat: 16.25 });
  });
});

describe("calculateZakat — missing prices", () => {
  it("asks for the price of the chosen nisab basis", () => {
    expect(calculateZakat({ ...base, silverPrice: 0, cash: 5000 })).toEqual({ status: "missing-prices", missing: ["silver"] });
    expect(calculateZakat({ ...base, nisabBasis: "gold", goldPrice: 0, cash: 5000 })).toEqual({
      status: "missing-prices",
      missing: ["gold"],
    });
  });

  it("also asks for the price of any metal the user holds", () => {
    expect(calculateZakat({ ...base, goldGrams: 10, goldPrice: 0 })).toEqual({ status: "missing-prices", missing: ["gold"] });
    expect(calculateZakat({ ...base, nisabBasis: "gold", silverGrams: 100, silverPrice: 0 })).toEqual({
      status: "missing-prices",
      missing: ["silver"],
    });
    expect(calculateZakat({ ...base, goldPrice: 0, silverPrice: 0, goldGrams: 1 }).status).toBe("missing-prices");
  });

  it("doesn't need the other metal's price when it isn't held and isn't the basis", () => {
    expect(calculateZakat({ ...base, goldPrice: 0, cash: 5000 }).status).toBe("calculated");
  });
});

describe("calculateZakat — bad input", () => {
  it("treats negative and non-finite amounts as zero", () => {
    const r = calculateZakat({ ...base, cash: -500, investments: Number.NaN, business: Number.POSITIVE_INFINITY, other: 1000 });
    expect(r).toMatchObject({ assets: 1000 });
  });

  it("falls back to 24k for an unusable karat", () => {
    const r = calculateZakat({ ...base, goldGrams: 10, goldKarat: Number.NaN });
    expect(r).toMatchObject({ pureGoldGrams: 10 });
  });
});

describe("nisabValues", () => {
  it("values each nisab from the prices that are known", () => {
    expect(nisabValues(70, 1)).toEqual({ gold: 5950, silver: 595 });
    expect(nisabValues(0, 1)).toEqual({ gold: undefined, silver: 595 });
  });
});

describe("formToInput", () => {
  it("converts the typed form and lists fields that aren't numbers", () => {
    const { input, invalidFields } = formToInput({
      ...DEFAULT_ZAKAT_FORM,
      cash: "1,500",
      goldGrams: "10",
      goldKarat: "21",
      silverPrice: "abc",
      liabilities: "٥٠٠",
    });
    expect(input).toMatchObject({ cash: 1500, goldGrams: 10, goldKarat: 21, silverPrice: 0, liabilities: 500, nisabBasis: "silver" });
    expect(invalidFields).toEqual(["silverPrice"]);
  });

  it("treats grams and prices as decimals but money as grouped, from the same text", () => {
    const { input } = formToInput({ ...DEFAULT_ZAKAT_FORM, cash: "1.250", goldGrams: "1.250", silverPrice: "0.855" });
    expect(input).toMatchObject({ cash: 1250, goldGrams: 1.25, silverPrice: 0.855 });
  });

  it("defaults an unknown karat to 24", () => {
    expect(formToInput({ ...DEFAULT_ZAKAT_FORM, goldKarat: "13" }).input.goldKarat).toBe(24);
  });
});

describe("withDefaultZakatForm", () => {
  it("fills in what's missing and keeps what's valid", () => {
    const form = withDefaultZakatForm({ cash: "500", currency: "EGP" });
    expect(form).toEqual({ ...DEFAULT_ZAKAT_FORM, cash: "500", currency: "EGP" });
  });

  it("ignores wrong-typed or unknown fields, and bad nisab bases, from a hand-edited import", () => {
    const form = withDefaultZakatForm({
      cash: 500 as unknown as string,
      nisabBasis: "platinum" as unknown as "gold",
      extra: "x",
    } as never);
    expect(form).toEqual(DEFAULT_ZAKAT_FORM);
    expect(withDefaultZakatForm(null)).toEqual(DEFAULT_ZAKAT_FORM);
    expect(withDefaultZakatForm({ nisabBasis: "gold" }).nisabBasis).toBe("gold");
  });
});
