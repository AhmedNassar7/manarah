import { useEffect, useRef, useState } from "react";
import {
  currencyForCountry,
  gramPricesFromSnapshot,
  shouldRefreshSnapshot,
  type MetalPricesSnapshot,
  type ZakatForm,
} from "@manarah/core";
import type { Store } from "@manarah/storage";
import { useTranslation, ZakatCalculator, type ZakatLivePrices } from "@manarah/ui";
import { loadSavedPrices, refreshPrices } from "../metal-prices.js";

export interface ZakatPageProps {
  form: ZakatForm;
  onChange: (form: ZakatForm) => void;
  /** The saved location's country, used to start the calculator in the right currency. */
  countryCode?: string;
  store: Store;
}

/**
 * The zakat calculator route. It brings today's gold and silver prices:
 * the last saved ones appear at once (so it works offline), and fresh ones are
 * fetched if they're over an hour old — then priced in the user's currency, so
 * nobody has to look up or type a price.
 */
export function ZakatPage({ form, onChange, countryCode, store }: ZakatPageProps) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<MetalPricesSnapshot | undefined>(undefined);
  const [status, setStatus] = useState<ZakatLivePrices["status"]>("loading");
  const alive = useRef(true);

  async function refresh() {
    setStatus("loading");
    try {
      const fresh = await refreshPrices(store);
      if (alive.current) {
        setSnapshot(fresh);
        setStatus("ready");
      }
    } catch {
      // Keep whatever was saved; the calculator says so and offers manual prices.
      if (alive.current) setStatus("failed");
    }
  }

  useEffect(() => {
    alive.current = true;
    void (async () => {
      const saved = await loadSavedPrices(store);
      if (!alive.current) return;
      if (saved) {
        setSnapshot(saved);
        setStatus("ready");
      }
      if (shouldRefreshSnapshot(saved, new Date())) {
        await refresh();
      }
    })();
    return () => {
      alive.current = false;
    };
    // Runs once per visit — refresh() reads only stable inputs (the store).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultCurrency = currencyForCountry(countryCode);
  const currency = form.currency || defaultCurrency;
  const grams = snapshot ? gramPricesFromSnapshot(snapshot, currency) : {};
  const prices: ZakatLivePrices = {
    status: status === "failed" && snapshot ? "stale" : status,
    gold: grams.gold,
    silver: grams.silver,
    updatedAt: snapshot ? new Date(snapshot.fetchedAt) : undefined,
  };

  return (
    <>
      <h2 className="section-title">{t("app.sectionZakat")}</h2>
      <ZakatCalculator form={form} onChange={onChange} defaultCurrency={defaultCurrency} prices={prices} onRefreshPrices={() => void refresh()} />
    </>
  );
}
