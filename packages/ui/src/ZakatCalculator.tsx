import {
  DEFAULT_ZAKAT_FORM,
  GOLD_KARATS,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  calculateZakat,
  formToInput,
  type NisabBasis,
  type ZakatForm,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

/** Currencies offered for formatting — the amounts are plain numbers either way; this only picks the symbol. */
const CURRENCIES = [
  "USD", "EUR", "GBP", "SAR", "AED", "EGP", "TRY", "PKR", "INR", "BDT", "IDR", "MYR",
  "CAD", "AUD", "KWD", "QAR", "BHD", "OMR", "JOD", "MAD", "DZD", "NGN", "ZAR", "SGD",
];

type WealthField = "cash" | "investments" | "business" | "receivables" | "other";
const WEALTH_FIELDS: WealthField[] = ["cash", "investments", "business", "receivables", "other"];

export interface ZakatCalculatorProps {
  form: ZakatForm;
  onChange: (form: ZakatForm) => void;
}

/**
 * A zakat al-mal calculator: enter what you hold, today's gold and silver
 * prices, and your debts; it shows the nisab, your net wealth, and 2.5% if
 * you're above it. Everything is computed on the device and saved only to
 * on-device storage. Where scholars differ (nisab basis, jewelry, shares) the
 * choice is the user's and the notes say so — this is a guide, not a fatwa.
 */
export function ZakatCalculator({ form, onChange }: ZakatCalculatorProps) {
  const { t, language } = useTranslation();
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const { input, invalidFields } = formToInput(form);
  const result = calculateZakat(input);

  function money(value: number): string {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: form.currency, maximumFractionDigits: 2 }).format(value);
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

  const basisGrams = form.nisabBasis === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;

  return (
    <section className="zakat" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <p className="zakat-intro">{t("zakat.intro")}</p>

      <div className="page-split zakat-split">
      <div>
      <div className="zakat-card">
        <h3>{t("zakat.settings")}</h3>
        <label className="zakat-field">
          <span>{t("zakat.currency")}</span>
          <select value={form.currency} onChange={(event) => set({ currency: event.target.value })}>
            {(CURRENCIES.includes(form.currency) ? CURRENCIES : [form.currency, ...CURRENCIES]).map((code) => (
              <option key={code} value={code}>
                {currencyLabel(code)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="zakat-basis">
          <legend>{t("zakat.nisabBasis")}</legend>
          {(["silver", "gold"] as NisabBasis[]).map((basis) => (
            <label key={basis}>
              <input
                type="radio"
                name="zakat-nisab-basis"
                value={basis}
                checked={form.nisabBasis === basis}
                onChange={() => set({ nisabBasis: basis })}
              />
              <span>
                {t(`zakat.basis.${basis}`, { grams: basis === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS })}
              </span>
            </label>
          ))}
          <small>{t("zakat.basisHelp")}</small>
        </fieldset>

        <div className="zakat-grid">
          {field("goldPrice", t("zakat.goldPrice", { currency: form.currency }))}
          {field("silverPrice", t("zakat.silverPrice", { currency: form.currency }))}
        </div>
        <small>{t("zakat.pricesHelp")}</small>
      </div>

      <div className="zakat-card">
        <h3>{t("zakat.wealth")}</h3>
        <div className="zakat-grid">
          {field("cash", t("zakat.field.cash"))}
          {field("investments", t("zakat.field.investments"))}
          {field("business", t("zakat.field.business"))}
          {field("receivables", t("zakat.field.receivables"))}
          {field("other", t("zakat.field.other"))}
        </div>

        <div className="zakat-grid zakat-metals">
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
          {field("silverGrams", t("zakat.field.silverGrams"))}
        </div>
        <small>{t("zakat.jewelryNote")}</small>
      </div>

      <div className="zakat-card">
        <h3>{t("zakat.debts")}</h3>
        {field("liabilities", t("zakat.field.liabilities"), t("zakat.debtsHelp"))}
      </div>

      </div>

      <div className="zakat-aside">
      <div className="zakat-result" aria-live="polite">
        {result.status === "missing-prices" ? (
          <p>
            {t("zakat.needPrices", {
              metals: result.missing.map((m) => t(`zakat.metal.${m}`)).join(language === "ar" ? " و" : " & "),
            })}
          </p>
        ) : (
          <>
            <p className={result.due ? "zakat-due" : "zakat-not-due"}>
              {result.due ? t("zakat.due", { amount: money(result.zakat) }) : t("zakat.notDue")}
            </p>
            <p className="zakat-verdict">
              {t(result.due ? "zakat.aboveNisab" : "zakat.belowNisab", {
                net: money(result.net),
                nisab: money(result.nisabValue),
                grams: basisGrams,
                metal: t(`zakat.metal.${result.nisabBasis}`),
              })}
            </p>

            <dl className="zakat-breakdown">
              {WEALTH_FIELDS.filter((f) => result.breakdown[f] > 0).map((f) => (
                <div key={f}>
                  <dt>{t(`zakat.field.${f}`)}</dt>
                  <dd>{money(result.breakdown[f])}</dd>
                </div>
              ))}
              {result.breakdown.gold > 0 && (
                <div>
                  <dt>{t("zakat.goldValue", { grams: result.pureGoldGrams })}</dt>
                  <dd>{money(result.breakdown.gold)}</dd>
                </div>
              )}
              {result.breakdown.silver > 0 && (
                <div>
                  <dt>{t("zakat.field.silverGrams")}</dt>
                  <dd>{money(result.breakdown.silver)}</dd>
                </div>
              )}
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
        onClick={() => onChange({ ...DEFAULT_ZAKAT_FORM, currency: form.currency, nisabBasis: form.nisabBasis })}
      >
        {t("zakat.clear")}
      </button>
      </div>
      </div>
    </section>
  );
}
