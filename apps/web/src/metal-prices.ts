import {
  EXCHANGE_RATE_URLS,
  GOLD_PRICE_URLS,
  SILVER_PRICE_URLS,
  fetchJsonWithFallback,
  normalizeSnapshot,
  parseExchangeRates,
  parseSpotPrice,
  type MetalPricesSnapshot,
} from "@manarah/core";
import type { Store } from "@manarah/storage";

/** Where the last fetched prices are kept (on-device, covered by backup/export), so the calculator works offline and opens with prices already in place. */
export const METAL_PRICES_STORAGE_KEY = "manarah:metal-prices";

/** The prices saved on this device, if any — validated, since older builds or a hand-edited import might leave junk behind. */
export async function loadSavedPrices(store: Store): Promise<MetalPricesSnapshot | undefined> {
  return normalizeSnapshot(await store.get(METAL_PRICES_STORAGE_KEY));
}

/**
 * Fetches today's gold and silver spot prices and the exchange rates in
 * parallel, each trying its sources in order. Rejects if any of the three
 * can't be had — half a set of prices isn't enough to price anything.
 */
export async function fetchPrices(now: Date = new Date()): Promise<MetalPricesSnapshot> {
  const get = (urls: string[]) => fetchJsonWithFallback(urls, (url) => fetch(url));
  const [gold, silver, ratesPerUsd] = await Promise.all([
    get(GOLD_PRICE_URLS).then(parseSpotPrice),
    get(SILVER_PRICE_URLS).then(parseSpotPrice),
    get(EXCHANGE_RATE_URLS).then(parseExchangeRates),
  ]);
  return { fetchedAt: now.toISOString(), usdPerOunce: { gold, silver }, ratesPerUsd };
}

/** Fetches fresh prices and saves them; on failure the saved ones stay as they were. */
export async function refreshPrices(store: Store): Promise<MetalPricesSnapshot> {
  const snapshot = await fetchPrices();
  await store.set(METAL_PRICES_STORAGE_KEY, snapshot);
  return snapshot;
}
