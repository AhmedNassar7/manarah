import type { ReactNode } from "react";
import {
  DEFAULT_ZAKAT_FORM,
  GOLD_KARATS,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_CURRENCIES,
  ZAKAT_RATE,
  calculateZakat,
  formToInput,
  type NisabBasis,
  type ZakatBreakdown,
  type ZakatForm,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon, type IconName } from "./icons/Icon.js";

/** Today's gold and silver price per gram in the chosen currency, as fetched. */
export interface ZakatLivePrices {
  /** "stale": couldn't refresh, so these are the last saved prices. */
  status: "loading" | "ready" | "failed" | "stale";
  /** 24k gold, per gram. */
  gold?: number;
  silver?: number;
  /** When these prices were fetched. */
  updatedAt?: Date;
}

export interface ZakatCalculatorProps {
  form: ZakatForm;
  onChange: (form: ZakatForm) => void;
  /** The currency to use until the user picks one (usually the saved location's). */
  defaultCurrency?: string;
  prices?: ZakatLivePrices;
  onRefreshPrices?: () => void;
}

/** How old a price is, for people: "5 minutes ago", "2 hours ago", or the date. */
function ageLabel(updatedAt: Date, now: Date, locale: string): string {
  const minutes = Math.max(0, Math.round((now.getTime() - updatedAt.getTime()) / 60_000));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return relative.format(-minutes, "minute");
  if (minutes < 48 * 60) return relative.format(-Math.round(minutes / 60), "hour");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(updatedAt);
}

/**
 * A zakat al-mal calculator meant to be effortless: five kinds of wealth (cash,
 * gold, silver, trade goods, shares), each a single box; gold and silver are
 * priced automatically from today's market price in the user's currency, so
 * nobody has to know or type a price; and the answer updates as you type, with
 * what each kind contributes. Everything is computed on the device and saved
 * only there. Where scholars differ (the nisab basis, worn jewellery, long-term
 * shares) the choice stays the user's and the notes say so — a guide, not a fatwa.
 */
export function ZakatCalculator({ form, onChange, defaultCurrency = "USD", prices, onRefreshPrices }: ZakatCalculatorProps) {
  const { t, language } = useTranslation();
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const currency = form.currency || defaultCurrency;
  const { input, invalidFields } = formToInput(form);

  const manual = form.priceMode === "manual";
  // Automatic prices when they're available; otherwise whatever the user typed (so a failed fetch doesn't block anyone who entered prices before).
  const goldPrice = !manual && prices?.gold ? prices.gold : input.goldPrice;
  const silverPrice = !manual && prices?.silver ? prices.silver : input.silverPrice;
  const result = calculateZakat({ ...input, goldPrice, silverPrice });

  function money(value: number): string {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
    } catch {
      return value.toFixed(2);
    }
  }

  function currencyLabel(code: string): string {
    try {
      const name = new Intl.DisplayNames([language], { type: "currency" }).of(code);
      return name && name !== code ? `${code} — ${name}` : code;
    } catch {
      return code;
    }
  }

  const set = (patch: Partial<ZakatForm>) => onChange({ ...form, ...patch });
  const invalid = (field: string) => (invalidFields as string[]).includes(field);

  function field(name: keyof ZakatForm & string, label: string, hint?: string) {
    return (
      <label className="zakat-field" key={name}>
        <span>{label}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={form[name] as string}
          aria-invalid={invalid(name) || undefined}
          onChange={(event) => set({ [name]: event.target.value } as Partial<ZakatForm>)}
        />
        {invalid(name) ? <small className="zakat-error">{t("zakat.invalidNumber")}</small> : hint && <small>{hint}</small>}
      </label>
    );
  }

  function typeCard(icon: IconName, title: string, hint: string, children: ReactNode, worth?: string) {
    return (
      <div className="zakat-type">
        <div className="zakat-type-head">
          <span className="zakat-type-icon">
            <Icon name={icon} size={20} />
          </span>
          <div>
            <h4>{title}</h4>
            <p>{hint}</p>
          </div>
        </div>
        <div className="zakat-type-body">{children}</div>
        {worth && <p className="zakat-worth">{worth}</p>}
      </div>
    );
  }

  const status = prices?.status;
  const autoMissing = !manual && (!prices?.gold || !prices?.silver);
  const now = new Date();
  const basisGrams = form.nisabBasis === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;

  const goldValue = input.goldGrams * (input.goldKarat / 24) * goldPrice;
  const silverValue = input.silverGrams * silverPrice;

  const rows: Array<{ key: keyof ZakatBreakdown; label: string }> = [
    { key: "cash", label: t("zakat.type.cash.title") },
    { key: "gold", label: t("zakat.type.gold.title") },
    { key: "silver", label: t("zakat.type.silver.title") },
    { key: "business", label: t("zakat.type.trade.title") },
    { key: "investments", label: t("zakat.type.shares.title") },
    { key: "receivables", label: t("zakat.field.receivables") },
    { key: "other", label: t("zakat.field.other") },
  ];

  return (
    <section className="zakat" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <p className="zakat-intro">{t("zakat.intro")}</p>

      <div className="page-split zakat-split">
        <div>
          <div className="zakat-card">
            <div className="zakat-prices-head">
              <h3>{t("zakat.step.prices")}</h3>
              <select className="zakat-currency" aria-label={t("zakat.currency")} value={currency} onChange={(event) => set({ currency: event.target.value })}>
                {(ZAKAT_CURRENCIES.includes(currency) ? ZAKAT_CURRENCIES : [currency, ...ZAKAT_CURRENCIES]).map((code) => (
                  <option key={code} value={code}>
                    {currencyLabel(code)}
                  </option>
                ))}
              </select>
            </div>

            {!manual ? (
              <>
                <dl className="zakat-price-list">
                  <div>
                    <dt>{t("zakat.prices.gold")}</dt>
                    <dd>{prices?.gold ? money(prices.gold) : status === "loading" ? "…" : "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("zakat.prices.silver")}</dt>
                    <dd>{prices?.silver ? money(prices.silver) : status === "loading" ? "…" : "—"}</dd>
                  </div>
                </dl>
                {status === "loading" && <p className="zakat-status">{t("zakat.prices.loading")}</p>}
                {status === "ready" && prices?.updatedAt && <p className="zakat-status">{t("zakat.prices.updated", { time: ageLabel(prices.updatedAt, now, locale) })}</p>}
                {status === "stale" && prices?.updatedAt && (
                  <p className="zakat-status zakat-warning">{t("zakat.prices.stale", { time: ageLabel(prices.updatedAt, now, locale) })}</p>
                )}
                {status === "failed" && <p className="zakat-status zakat-warning">{t("zakat.prices.failed")}</p>}
                <small>{t("zakat.prices.localNote")}</small>
                <div className="zakat-price-actions">
                  {onRefreshPrices && (
                    <button type="button" onClick={onRefreshPrices} disabled={status === "loading"}>
                      <Icon name="refresh" size={16} /> {t("zakat.prices.refresh")}
                    </button>
                  )}
                  <button type="button" onClick={() => set({ priceMode: "manual" })}>
                    {t("zakat.prices.edit")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="zakat-grid">
                  {field("goldPrice", t("zakat.goldPrice", { currency }))}
                  {field("silverPrice", t("zakat.silverPrice", { currency }))}
                </div>
                <small>{t("zakat.pricesHelp")}</small>
                <div className="zakat-price-actions">
                  <button type="button" onClick={() => set({ priceMode: "auto" })}>
                    <Icon name="refresh" size={16} /> {t("zakat.prices.useAuto")}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="zakat-card">
            <h3>{t("zakat.wealth")}</h3>
            <div className="zakat-types">
              {typeCard("wallet", t("zakat.type.cash.title"), t("zakat.type.cash.hint"), field("cash", t("zakat.amount", { currency })))}

              {typeCard(
                "coins",
                t("zakat.type.gold.title"),
                t("zakat.type.gold.hint"),
                <div className="zakat-grid">
                  {field("goldGrams", t("zakat.field.goldGrams"))}
                  <label className="zakat-field">
                    <span>{t("zakat.field.goldKarat")}</span>
                    <select value={form.goldKarat} onChange={(event) => set({ goldKarat: event.target.value })}>
                      {GOLD_KARATS.map((k) => (
                        <option key={k} value={String(k)}>
                          {t("zakat.karat", { karat: k })}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>,
                input.goldGrams > 0 && goldPrice > 0 ? t("zakat.worth", { amount: money(goldValue) }) : undefined
              )}

              {typeCard(
                "gem",
                t("zakat.type.silver.title"),
                t("zakat.type.silver.hint"),
                field("silverGrams", t("zakat.field.silverGrams")),
                input.silverGrams > 0 && silverPrice > 0 ? t("zakat.worth", { amount: money(silverValue) }) : undefined
              )}

              {typeCard("store", t("zakat.type.trade.title"), t("zakat.type.trade.hint"), field("business", t("zakat.amount", { currency })))}
              {typeCard("trending-up", t("zakat.type.shares.title"), t("zakat.type.shares.hint"), field("investments", t("zakat.amount", { currency })))}
            </div>
            <small>{t("zakat.jewelryNote")}</small>

            <details className="zakat-more">
              <summary>{t("zakat.more")}</summary>
              <div className="zakat-grid">
                {field("receivables", t("zakat.field.receivables"))}
                {field("other", t("zakat.field.other"))}
              </div>
            </details>
          </div>

          <div className="zakat-card">
            <h3>{t("zakat.debts")}</h3>
            {field("liabilities", t("zakat.field.liabilities"), t("zakat.debtsHelp"))}
          </div>

          <details className="zakat-card zakat-advanced">
            <summary>{t("zakat.advanced")}</summary>
            <fieldset className="zakat-basis">
              <legend>{t("zakat.nisabBasis")}</legend>
              {(["silver", "gold"] as NisabBasis[]).map((basis) => (
                <label key={basis}>
                  <input type="radio" name="zakat-nisab-basis" value={basis} checked={form.nisabBasis === basis} onChange={() => set({ nisabBasis: basis })} />
                  <span>{t(`zakat.basis.${basis}`, { grams: basis === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS })}</span>
                </label>
              ))}
              <small>{t("zakat.basisHelp")}</small>
            </fieldset>
          </details>
        </div>

        <div className="zakat-aside">
          <div className="zakat-result" aria-live="polite">
            {result.status === "missing-prices" ? (
              <>
                <p className="zakat-verdict">
                  {autoMissing && status === "loading"
                    ? t("zakat.waitingPrices")
                    : autoMissing
                      ? t("zakat.needManual")
                      : t("zakat.needPrices", { metals: result.missing.map((m) => t(`zakat.metal.${m}`)).join(language === "ar" ? " و" : " & ") })}
                </p>
                {autoMissing && status !== "loading" && (
                  <button type="button" className="zakat-clear" onClick={() => set({ priceMode: "manual" })}>
                    {t("zakat.prices.edit")}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className={result.due ? "zakat-due" : "zakat-not-due"}>{result.due ? t("zakat.due", { amount: money(result.zakat) }) : t("zakat.notDue")}</p>
                <p className="zakat-verdict">
                  {t(result.due ? "zakat.aboveNisab" : "zakat.belowNisab", {
                    net: money(result.net),
                    nisab: money(result.nisabValue),
                    grams: basisGrams,
                    metal: t(`zakat.metal.${result.nisabBasis}`),
                  })}
                </p>

                <h4 className="zakat-breakdown-title">{t("zakat.breakdown")}</h4>
                <dl className="zakat-breakdown">
                  {rows
                    .filter((r) => result.breakdown[r.key] > 0)
                    .map((r) => (
                      <div key={r.key}>
                        <dt>{r.label}</dt>
                        <dd>
                          {money(result.breakdown[r.key])}
                          {result.due && (
                            <span className="zakat-share">
                              {" "}
                              <Icon name="arrow-right" size={16} /> {money(result.shares[r.key])}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  <div className="zakat-total">
                    <dt>{t("zakat.totalAssets")}</dt>
                    <dd>{money(result.assets)}</dd>
                  </div>
                  {result.liabilities > 0 && (
                    <div>
                      <dt>{t("zakat.field.liabilities")}</dt>
                      <dd>− {money(result.liabilities)}</dd>
                    </div>
                  )}
                  <div className="zakat-total">
                    <dt>{t("zakat.netWealth")}</dt>
                    <dd>{money(result.net)}</dd>
                  </div>
                  <div>
                    <dt>{t("zakat.rate")}</dt>
                    <dd>{(ZAKAT_RATE * 100).toFixed(1)}%</dd>
                  </div>
                </dl>
              </>
            )}
            {invalidFields.length > 0 && <p className="zakat-error">{t("zakat.invalidSummary")}</p>}
          </div>

          <ul className="zakat-notes">
            <li>{t("zakat.note.hawl")}</li>
            <li>{t("zakat.note.investments")}</li>
            <li>{t("zakat.note.nisab")}</li>
            <li>{t("zakat.note.guide")}</li>
            <li>{t("zakat.note.privacy")}</li>
          </ul>

          <button
            type="button"
            className="zakat-clear"
            onClick={() =>
              onChange({
                ...DEFAULT_ZAKAT_FORM,
                currency: form.currency,
                nisabBasis: form.nisabBasis,
                priceMode: form.priceMode,
                goldPrice: form.goldPrice,
                silverPrice: form.silverPrice,
              })
            }
          >
            {t("zakat.clear")}
          </button>
        </div>
      </div>
    </section>
  );
}
