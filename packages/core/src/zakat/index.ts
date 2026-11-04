/**
 * Zakat al-mal calculator — pure arithmetic, no network, no price feed.
 *
 * What it computes: your net zakatable wealth (assets minus debts due now),
 * compared with the nisab (the minimum threshold), and 2.5% of it if you're
 * above. Where scholars differ, the app picks no side silently: the nisab
 * basis is the user's choice, and the notes the UI shows say where views
 * diverge. It's a guide, not a fatwa — and it cannot know whether a full
 * lunar year (hawl) has passed over your wealth; that's on the user.
 */

/** Storage key for the saved calculator form — kept on-device only, and covered by JSON export/import. */
export const ZAKAT_STORAGE_KEY = "manarah:zakat";

/**
 * Nisab weights, as the figures most contemporary fatwa bodies use: 85 g of
 * pure gold, or 595 g of silver (200 dirhams). Some Hanafi references use
 * 87.48 g / 612.36 g instead — slightly higher thresholds; the UI says so.
 */
export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;

/** 2.5% — the rate for a lunar year. */
export const ZAKAT_RATE = 0.025;

/** Gold purities offered (karats); 24 is pure. */
export const GOLD_KARATS = [24, 22, 21, 18, 14] as const;

export type NisabBasis = "silver" | "gold";

/** What the user typed, as strings, so half-typed numbers survive re-rendering and persisting. */
export interface ZakatForm {
  /** ISO 4217 code, used to format amounts and to price gold and silver. Empty means "not chosen yet" — the app then uses the saved location's currency. */
  currency: string;
  cash: string;
  goldGrams: string;
  goldKarat: string;
  silverGrams: string;
  investments: string;
  business: string;
  receivables: string;
  other: string;
  liabilities: string;
  /** Market price of 1 g of 24k gold, in the chosen currency. */
  goldPrice: string;
  /** Market price of 1 g of silver. */
  silverPrice: string;
  nisabBasis: NisabBasis;
  /** "auto": gold and silver are priced from the fetched international price; "manual": the user's own prices above are used. */
  priceMode: "auto" | "manual";
}

export const DEFAULT_ZAKAT_FORM: ZakatForm = {
  currency: "",
  cash: "",
  goldGrams: "",
  goldKarat: "24",
  silverGrams: "",
  investments: "",
  business: "",
  receivables: "",
  other: "",
  liabilities: "",
  goldPrice: "",
  silverPrice: "",
  // Silver is the lower threshold, so fewer people fall below it unintentionally; the user can switch.
  nisabBasis: "silver",
  priceMode: "auto",
};

/** Backfills fields missing from a saved form (older builds, hand-edited imports) and drops anything that isn't a string. */
export function withDefaultZakatForm(stored: Partial<ZakatForm> | undefined | null): ZakatForm {
  const merged: Record<string, unknown> = { ...DEFAULT_ZAKAT_FORM };
  for (const [key, value] of Object.entries(stored ?? {})) {
    if (key in DEFAULT_ZAKAT_FORM && typeof value === "string") merged[key] = value;
  }
  if (merged.nisabBasis !== "silver" && merged.nisabBasis !== "gold") merged.nisabBasis = DEFAULT_ZAKAT_FORM.nisabBasis;
  if (merged.priceMode !== "auto" && merged.priceMode !== "manual") merged.priceMode = DEFAULT_ZAKAT_FORM.priceMode;
  return merged as unknown as ZakatForm;
}

/* ---------- Parsing what people type ---------- */

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * Reads a typed number: "1,250.50", "1.250,50", "1 250", and Arabic-Indic
 * digits ("١٢٥٠٫٥"). Empty means 0; anything that still isn't a plain
 * non-negative number comes back as `null` so the UI can flag the field
 * instead of silently counting it as zero.
 *
 * A lone comma is a thousands separator when followed by exactly three
 * digits ("1,250") and a decimal point otherwise ("12,5").
 *
 * `kind` settles the one genuinely ambiguous case, a lone dot:
 *  - "money" (default): "1.250" and "1.250.000" are European thousands
 *    separators (1250 and 1,250,000) — reading them as 1.25 would silently
 *    understate someone's wealth. A group that starts with 0 ("0.500") is
 *    still a decimal.
 *  - "decimal" (grams, per-gram prices): a dot is always a decimal point —
 *    "10.500" g and a silver price of "0.855" are exactly what people type.
 */
export function parseAmount(text: string, kind: "money" | "decimal" = "money"): number | null {
  let s = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_ZERO))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - EXTENDED_ARABIC_INDIC_ZERO))
    .replace(/٫/g, ".") // Arabic decimal separator
    .replace(/[٬\s ]/g, ""); // Arabic thousands separator, spaces
  if (s === "") return 0;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (kind === "money" && lastComma === -1 && /^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  } else if (lastDot !== -1 && lastComma !== -1) {
    // Both present: whichever comes last is the decimal separator.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }

  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/* ---------- The calculation ---------- */

export interface ZakatInput {
  cash: number;
  goldGrams: number;
  goldKarat: number;
  silverGrams: number;
  investments: number;
  business: number;
  receivables: number;
  other: number;
  liabilities: number;
  goldPrice: number;
  silverPrice: number;
  nisabBasis: NisabBasis;
}

/** Fields where a dot is always a decimal point (see parseAmount's `kind`). */
const DECIMAL_FIELDS: ReadonlySet<string> = new Set(["goldGrams", "silverGrams", "goldPrice", "silverPrice"]);

const NUMERIC_FIELDS = [
  "cash",
  "goldGrams",
  "silverGrams",
  "investments",
  "business",
  "receivables",
  "other",
  "liabilities",
  "goldPrice",
  "silverPrice",
] as const;

/** Converts the typed form into numbers, listing the fields whose text wasn't a valid amount (those count as 0). */
export function formToInput(form: ZakatForm): { input: ZakatInput; invalidFields: Array<(typeof NUMERIC_FIELDS)[number]> } {
  const invalidFields: Array<(typeof NUMERIC_FIELDS)[number]> = [];
  const numbers = {} as Record<(typeof NUMERIC_FIELDS)[number], number>;
  for (const field of NUMERIC_FIELDS) {
    const value = parseAmount(form[field], DECIMAL_FIELDS.has(field) ? "decimal" : "money");
    if (value === null) invalidFields.push(field);
    numbers[field] = value ?? 0;
  }
  const karat = Number(form.goldKarat);
  return {
    input: {
      ...numbers,
      goldKarat: (GOLD_KARATS as readonly number[]).includes(karat) ? karat : 24,
      nisabBasis: form.nisabBasis,
    },
    invalidFields,
  };
}

export interface ZakatBreakdown {
  cash: number;
  gold: number;
  silver: number;
  investments: number;
  business: number;
  receivables: number;
  other: number;
}

export type ZakatResult =
  /** A price needed to value the nisab (or the user's gold/silver) hasn't been entered. */
  | { status: "missing-prices"; missing: NisabBasis[] }
  | {
      status: "calculated";
      /** True when net wealth has reached the nisab. */
      due: boolean;
      breakdown: ZakatBreakdown;
      assets: number;
      liabilities: number;
      /** Assets minus debts due now, never below 0. */
      net: number;
      nisabBasis: NisabBasis;
      /** The nisab expressed in the user's currency, from the chosen basis. */
      nisabValue: number;
      /** Grams of pure gold held (weight × karat ÷ 24). */
      pureGoldGrams: number;
      /** 2.5% of net wealth if due, else 0 — rounded to the cent. */
      zakat: number;
      /** How much of `zakat` comes from each kind of wealth (in proportion to its value), so people can see what they are paying zakat on. Sums to `zakat` within a cent. */
      shares: ZakatBreakdown;
    };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Splits the zakat across the kinds of wealth in proportion to their value (debts reduce the whole, not one kind). */
function allocateZakat(zakat: number, breakdown: ZakatBreakdown, assets: number): ZakatBreakdown {
  const share = (value: number) => (assets > 0 ? round2((zakat * value) / assets) : 0);
  return {
    cash: share(breakdown.cash),
    gold: share(breakdown.gold),
    silver: share(breakdown.silver),
    investments: share(breakdown.investments),
    business: share(breakdown.business),
    receivables: share(breakdown.receivables),
    other: share(breakdown.other),
  };
}

/** The nisab in currency for each metal whose price is known. */
export function nisabValues(goldPrice: number, silverPrice: number): { gold?: number; silver?: number } {
  return {
    gold: goldPrice > 0 ? round2(NISAB_GOLD_GRAMS * goldPrice) : undefined,
    silver: silverPrice > 0 ? round2(NISAB_SILVER_GRAMS * silverPrice) : undefined,
  };
}

/**
 * Net wealth = cash + gold + silver + investments + business assets +
 * receivables + other − debts due now, floored at 0. Zakat is 2.5% of it when
 * it reaches the chosen nisab. Gold is valued as pure gold (weight × karat ÷
 * 24 × the 24k price). Negative or non-finite inputs count as 0.
 */
export function calculateZakat(input: ZakatInput): ZakatResult {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const goldGrams = clean(input.goldGrams);
  const silverGrams = clean(input.silverGrams);
  const goldPrice = clean(input.goldPrice);
  const silverPrice = clean(input.silverPrice);

  const missing: NisabBasis[] = [];
  if ((input.nisabBasis === "gold" || goldGrams > 0) && goldPrice === 0) missing.push("gold");
  if ((input.nisabBasis === "silver" || silverGrams > 0) && silverPrice === 0) missing.push("silver");
  if (missing.length > 0) return { status: "missing-prices", missing };

  const pureGoldGrams = goldGrams * (clean(input.goldKarat) || 24) / 24;
  const breakdown: ZakatBreakdown = {
    cash: clean(input.cash),
    gold: round2(pureGoldGrams * goldPrice),
    silver: round2(silverGrams * silverPrice),
    investments: clean(input.investments),
    business: clean(input.business),
    receivables: clean(input.receivables),
    other: clean(input.other),
  };
  const assets = round2(Object.values(breakdown).reduce((sum, v) => sum + v, 0));
  const liabilities = clean(input.liabilities);
  const net = round2(Math.max(0, assets - liabilities));

  const nisabValue = round2(
    input.nisabBasis === "gold" ? NISAB_GOLD_GRAMS * goldPrice : NISAB_SILVER_GRAMS * silverPrice
  );
  const due = net >= nisabValue && net > 0;

  return {
    status: "calculated",
    due,
    breakdown,
    assets,
    liabilities,
    net,
    nisabBasis: input.nisabBasis,
    nisabValue,
    pureGoldGrams: Math.round(pureGoldGrams * 1000) / 1000,
    zakat: due ? round2(net * ZAKAT_RATE) : 0,
    shares: allocateZakat(due ? round2(net * ZAKAT_RATE) : 0, breakdown, assets),
  };
}
