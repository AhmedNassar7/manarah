/**
 * Gold and silver prices for the zakat calculator, without a server of ours:
 * the international spot price (US dollars per troy ounce) from gold-api.com,
 * and exchange rates from the free currency-api (with open.er-api.com as a
 * fallback) — all keyless and CORS-enabled, verified live 2026-11-05. A price
 * per gram in the user's currency is spot ÷ 31.1035 × the exchange rate.
 *
 * It is the *international* price converted at today's rate: local jewellers
 * add their own premium, which is why the UI lets the user override it. This
 * module is pure parsing and arithmetic; fetching lives in the web app.
 */

export const TROY_OUNCE_GRAMS = 31.1034768;

export const GOLD_PRICE_URLS = ["https://api.gold-api.com/price/XAU"];
export const SILVER_PRICE_URLS = ["https://api.gold-api.com/price/XAG"];

/** Tried in order: the project's CDN copy, its mirror, then open.er-api.com. */
export const EXCHANGE_RATE_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
  "https://open.er-api.com/v6/latest/USD",
];

/** Everything needed to price gold and silver in any currency, as fetched — saved on-device so the calculator still works offline. */
export interface MetalPricesSnapshot {
  /** ISO time the prices were fetched. */
  fetchedAt: string;
  usdPerOunce: { gold: number; silver: number };
  /** Units of each currency per 1 US dollar, keyed by lowercase ISO code ("egp"). */
  ratesPerUsd: Record<string, number>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** gold-api.com's `{ price, ... }` — US dollars per troy ounce. Throws on an unexpected shape so the loader falls back or reports failure. */
export function parseSpotPrice(json: unknown): number {
  const price = positive(asRecord(json)?.price);
  if (price === undefined) throw new Error("Unexpected metal price response");
  return price;
}

/**
 * Exchange rates per US dollar, lowercase-keyed, from either supported shape:
 * currency-api's `{ usd: { egp: 48.5, … } }` or open.er-api.com's
 * `{ rates: { EGP: 48.5, … } }`. Non-positive or non-numeric entries are dropped.
 */
export function parseExchangeRates(json: unknown): Record<string, number> {
  const root = asRecord(json);
  const table = asRecord(root?.usd) ?? asRecord(root?.rates);
  if (!table) throw new Error("Unexpected exchange rate response");

  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(table)) {
    const value = positive(rate);
    if (value !== undefined) rates[code.toLowerCase()] = value;
  }
  if (rates.usd === undefined) rates.usd = 1;
  return rates;
}

/** The price of one gram in `currency`, or undefined if that currency's rate isn't known. */
export function pricePerGram(usdPerOunce: number, currency: string, ratesPerUsd: Record<string, number>): number | undefined {
  const rate = ratesPerUsd[currency.toLowerCase()];
  if (!(usdPerOunce > 0) || rate === undefined || !(rate > 0)) return undefined;
  return (usdPerOunce / TROY_OUNCE_GRAMS) * rate;
}

export interface GramPrices {
  gold?: number;
  silver?: number;
}

/** Gold (24k) and silver per gram in `currency`, from a snapshot. */
export function gramPricesFromSnapshot(snapshot: MetalPricesSnapshot, currency: string): GramPrices {
  return {
    gold: pricePerGram(snapshot.usdPerOunce.gold, currency, snapshot.ratesPerUsd),
    silver: pricePerGram(snapshot.usdPerOunce.silver, currency, snapshot.ratesPerUsd),
  };
}

/** Validates a stored snapshot (older builds, hand-edited imports); anything malformed is discarded rather than trusted. */
export function normalizeSnapshot(value: unknown): MetalPricesSnapshot | undefined {
  const root = asRecord(value);
  const prices = asRecord(root?.usdPerOunce);
  const rates = asRecord(root?.ratesPerUsd);
  const gold = positive(prices?.gold);
  const silver = positive(prices?.silver);
  if (!root || !rates || gold === undefined || silver === undefined) return undefined;
  if (typeof root.fetchedAt !== "string" || Number.isNaN(Date.parse(root.fetchedAt))) return undefined;

  const cleanRates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(rates)) {
    const v = positive(rate);
    if (v !== undefined) cleanRates[code.toLowerCase()] = v;
  }
  if (Object.keys(cleanRates).length === 0) return undefined;
  return { fetchedAt: root.fetchedAt, usdPerOunce: { gold, silver }, ratesPerUsd: cleanRates };
}

/** How long ago the snapshot was taken, in whole minutes (never negative). */
export function snapshotAgeMinutes(snapshot: MetalPricesSnapshot, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(snapshot.fetchedAt)) / 60_000));
}

/** Prices move; after this long a saved snapshot is refreshed when the calculator opens. */
export const SNAPSHOT_REFRESH_AFTER_MINUTES = 60;

export function shouldRefreshSnapshot(snapshot: MetalPricesSnapshot | undefined, now: Date): boolean {
  return !snapshot || snapshotAgeMinutes(snapshot, now) >= SNAPSHOT_REFRESH_AFTER_MINUTES;
}

/**
 * The currency a country's people use — to start the zakat calculator in the
 * right one from the saved location. Unlisted countries fall back to USD.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  EG: "EGP", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", JO: "JOD", LB: "LBP", IQ: "IQD",
  SY: "SYP", PS: "ILS", YE: "YER", LY: "LYD", TN: "TND", DZ: "DZD", MA: "MAD", SD: "SDG", MR: "MRU", SO: "SOS",
  TR: "TRY", IR: "IRR", PK: "PKR", IN: "INR", BD: "BDT", ID: "IDR", MY: "MYR", SG: "SGD", BN: "BND", AF: "AFN",
  NG: "NGN", SN: "XOF", ML: "XOF", ZA: "ZAR", KE: "KES", GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", GR: "EUR",
  RU: "RUB", KZ: "KZT", UZ: "UZS", AZ: "AZN", BA: "BAM", AL: "ALL", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
};

export function currencyForCountry(countryCode: string | undefined): string {
  return (countryCode && COUNTRY_CURRENCY[countryCode.toUpperCase()]) || "USD";
}

/** Every currency the calculator offers, for the picker — the mapped ones plus the major reserve currencies. */
export const ZAKAT_CURRENCIES: readonly string[] = [...new Set([...Object.values(COUNTRY_CURRENCY), "USD", "EUR", "GBP", "CHF"])].sort();
