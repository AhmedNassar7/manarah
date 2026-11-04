import { describe, expect, it } from "vitest";
import {
  EXCHANGE_RATE_URLS,
  SNAPSHOT_REFRESH_AFTER_MINUTES,
  TROY_OUNCE_GRAMS,
  ZAKAT_CURRENCIES,
  currencyForCountry,
  gramPricesFromSnapshot,
  normalizeSnapshot,
  parseExchangeRates,
  parseSpotPrice,
  pricePerGram,
  shouldRefreshSnapshot,
  snapshotAgeMinutes,
  type MetalPricesSnapshot,
} from "./index.js";

const snapshot: MetalPricesSnapshot = {
  fetchedAt: "2026-11-05T10:00:00Z",
  usdPerOunce: { gold: 3110.34768, silver: 31.1034768 },
  ratesPerUsd: { usd: 1, egp: 50, sar: 3.75, kwd: 0.307 },
};

describe("parseSpotPrice", () => {
  it("reads gold-api.com's price (US dollars per troy ounce)", () => {
    expect(parseSpotPrice({ currency: "USD", name: "Gold", price: 4063.0, symbol: "XAU" })).toBe(4063);
  });

  it("throws on a missing, zero, negative or non-numeric price", () => {
    for (const bad of [{}, { price: 0 }, { price: -5 }, { price: "4000" }, null, [], "x"]) expect(() => parseSpotPrice(bad), JSON.stringify(bad)).toThrow();
  });
});

describe("parseExchangeRates", () => {
  it("reads currency-api's shape, lower-casing codes", () => {
    expect(parseExchangeRates({ date: "2026-11-05", usd: { egp: 48.5, SAR: 3.75, aed: 3.6725 } })).toEqual({ egp: 48.5, sar: 3.75, aed: 3.6725, usd: 1 });
  });

  it("reads open.er-api.com's shape", () => {
    expect(parseExchangeRates({ result: "success", rates: { USD: 1, EGP: 48.5, SAR: 3.75 } })).toEqual({ usd: 1, egp: 48.5, sar: 3.75 });
  });

  it("drops entries that aren't positive numbers", () => {
    expect(parseExchangeRates({ usd: { egp: 48.5, bad: "x", zero: 0, neg: -2, nan: NaN } })).toEqual({ egp: 48.5, usd: 1 });
  });

  it("throws on an unrecognised response", () => {
    for (const bad of [{}, null, [], { usd: [] }, "x"]) expect(() => parseExchangeRates(bad), JSON.stringify(bad)).toThrow();
  });

  it("lists the project's CDN first and open.er-api.com last, so the attribution-bound source is only a fallback", () => {
    expect(EXCHANGE_RATE_URLS[0]).toContain("currency-api");
    expect(EXCHANGE_RATE_URLS[EXCHANGE_RATE_URLS.length - 1]).toContain("open.er-api.com");
  });
});

describe("pricePerGram", () => {
  it("divides the ounce price into grams and converts at the rate", () => {
    // $3110.34768/oz ÷ 31.1034768 g = $100/g; × 50 EGP/USD = 5000 EGP/g.
    expect(pricePerGram(3110.34768, "EGP", { egp: 50 })).toBeCloseTo(5000, 6);
    expect(pricePerGram(3110.34768, "usd", { usd: 1 })).toBeCloseTo(100, 6);
  });

  it("accepts the currency in any case", () => {
    expect(pricePerGram(TROY_OUNCE_GRAMS, "sar", { sar: 3.75 })).toBeCloseTo(3.75, 9);
  });

  it("is undefined for an unknown currency, or a non-positive price or rate", () => {
    expect(pricePerGram(3000, "xyz", { egp: 50 })).toBeUndefined();
    expect(pricePerGram(0, "egp", { egp: 50 })).toBeUndefined();
    expect(pricePerGram(3000, "egp", { egp: 0 })).toBeUndefined();
  });
});

describe("gramPricesFromSnapshot", () => {
  it("prices both metals per gram in the chosen currency", () => {
    const prices = gramPricesFromSnapshot(snapshot, "EGP");
    expect(prices.gold).toBeCloseTo(5000, 6);
    expect(prices.silver).toBeCloseTo(50, 6);
  });

  it("leaves a metal out when the currency has no rate", () => {
    expect(gramPricesFromSnapshot(snapshot, "XYZ")).toEqual({ gold: undefined, silver: undefined });
  });
});

describe("normalizeSnapshot", () => {
  it("accepts a well-formed snapshot", () => {
    expect(normalizeSnapshot(snapshot)).toEqual(snapshot);
  });

  it("lower-cases currency codes and drops bad rates", () => {
    const cleaned = normalizeSnapshot({ ...snapshot, ratesPerUsd: { EGP: 50, bad: "x" } });
    expect(cleaned?.ratesPerUsd).toEqual({ egp: 50 });
  });

  it("rejects anything malformed rather than trusting it", () => {
    for (const bad of [
      null,
      "x",
      {},
      { ...snapshot, fetchedAt: "not a date" },
      { ...snapshot, usdPerOunce: { gold: 0, silver: 30 } },
      { ...snapshot, usdPerOunce: { gold: 3000 } },
      { ...snapshot, ratesPerUsd: {} },
      { ...snapshot, ratesPerUsd: undefined },
    ]) {
      expect(normalizeSnapshot(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });
});

describe("snapshot age", () => {
  const at = (minutes: number) => new Date(Date.parse(snapshot.fetchedAt) + minutes * 60_000);

  it("counts whole minutes since it was fetched, never negative", () => {
    expect(snapshotAgeMinutes(snapshot, at(90))).toBe(90);
    expect(snapshotAgeMinutes(snapshot, at(-5))).toBe(0);
  });

  it("is due a refresh after an hour, or when there is nothing saved", () => {
    expect(shouldRefreshSnapshot(undefined, at(0))).toBe(true);
    expect(shouldRefreshSnapshot(snapshot, at(SNAPSHOT_REFRESH_AFTER_MINUTES - 1))).toBe(false);
    expect(shouldRefreshSnapshot(snapshot, at(SNAPSHOT_REFRESH_AFTER_MINUTES))).toBe(true);
  });
});

describe("currencyForCountry", () => {
  it("maps a country to its currency, case-insensitively", () => {
    expect(currencyForCountry("EG")).toBe("EGP");
    expect(currencyForCountry("sa")).toBe("SAR");
    expect(currencyForCountry("FR")).toBe("EUR");
    expect(currencyForCountry("TR")).toBe("TRY");
  });

  it("falls back to USD for an unknown or missing country", () => {
    expect(currencyForCountry("ZZ")).toBe("USD");
    expect(currencyForCountry(undefined)).toBe("USD");
  });

  it("offers every mapped currency in the picker, sorted, once each", () => {
    expect(ZAKAT_CURRENCIES).toContain("EGP");
    expect(ZAKAT_CURRENCIES).toContain("USD");
    expect(new Set(ZAKAT_CURRENCIES).size).toBe(ZAKAT_CURRENCIES.length);
    expect([...ZAKAT_CURRENCIES].sort()).toEqual([...ZAKAT_CURRENCIES]);
  });
});
