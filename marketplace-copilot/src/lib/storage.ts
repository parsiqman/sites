/**
 * Extension storage: settings, the watchlist, and per-item price history.
 *
 * The API key goes in `chrome.storage.local` rather than `sync` so it never
 * leaves the machine through the browser's own sync channel.
 */

import type { Analysis, CostSettings, Effort, Listing } from "./types.ts";
import { DEFAULT_SETTINGS } from "./valuation.ts";
import { DEFAULT_MODEL } from "./models.ts";

export interface StoredConfig extends CostSettings {
  apiKey: string;
  model: string;
  effort: Effort;
}

export const DEFAULT_CONFIG: StoredConfig = {
  ...DEFAULT_SETTINGS,
  apiKey: "",
  model: DEFAULT_MODEL,
  effort: "medium",
};

const CONFIG_KEY = "config";
const WATCH_KEY = "watchlist";

export interface WatchedItem {
  id: string;
  url: string;
  title: string;
  addedAt: string;
  lastCheckedAt: string;
  /** Every price we've observed, oldest first. */
  priceHistory: Array<{ at: string; price: number }>;
  maxOffer: number;
  verdict: string;
  identifiedAs: string;
}

export async function getConfig(): Promise<StoredConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULT_CONFIG, ...(stored[CONFIG_KEY] ?? {}) };
}

export async function saveConfig(patch: Partial<StoredConfig>): Promise<StoredConfig> {
  const next = { ...(await getConfig()), ...patch };
  await chrome.storage.local.set({ [CONFIG_KEY]: next });
  return next;
}

export async function getWatchlist(): Promise<Record<string, WatchedItem>> {
  const stored = await chrome.storage.local.get(WATCH_KEY);
  return stored[WATCH_KEY] ?? {};
}

/**
 * Add or refresh a watched item. Re-watching an item you already track appends
 * to its price history rather than starting over — that history is the whole
 * point of the watchlist.
 */
export async function watch(listing: Listing, analysis: Analysis): Promise<WatchedItem> {
  const id = listing.id ?? listing.url;
  const list = await getWatchlist();
  const now = new Date().toISOString();
  const existing = list[id];

  const priceHistory = existing?.priceHistory ?? [];
  const lastPrice = priceHistory.at(-1)?.price;
  if (listing.askingPrice !== null && listing.askingPrice !== lastPrice) {
    priceHistory.push({ at: now, price: listing.askingPrice });
  }

  const item: WatchedItem = {
    id,
    url: listing.url,
    title: listing.title,
    addedAt: existing?.addedAt ?? now,
    lastCheckedAt: now,
    priceHistory,
    maxOffer: analysis.math.maxOffer,
    verdict: analysis.math.verdict,
    identifiedAs: analysis.appraisal.identifiedAs,
  };

  list[id] = item;
  await chrome.storage.local.set({ [WATCH_KEY]: list });
  return item;
}

export async function unwatch(id: string): Promise<void> {
  const list = await getWatchlist();
  delete list[id];
  await chrome.storage.local.set({ [WATCH_KEY]: list });
}

/** Price movement on a watched item, for the panel's "you've seen this before" line. */
export function priceDrop(item: WatchedItem | undefined): {
  from: number;
  to: number;
  pct: number;
} | null {
  if (!item || item.priceHistory.length < 2) return null;
  const from = item.priceHistory[0].price;
  const to = item.priceHistory.at(-1)!.price;
  if (to >= from) return null;
  return { from, to, pct: Math.round((1 - to / from) * 100) };
}
