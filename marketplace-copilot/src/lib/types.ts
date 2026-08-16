/**
 * Shared types across the content script, service worker, and options page.
 *
 * Division of labor, deliberately: the model estimates *what the thing is worth*
 * (a comp range, condition, risk). Every dollar figure the user acts on is
 * computed from that range by `valuation.ts` in plain arithmetic. The model
 * never does the profit math.
 */

/** Where the item would be resold. Drives the fee schedule. */
export type Channel = "ebay" | "mercari" | "poshmark" | "local";

/** What the extension scraped (or the user typed) from the listing page. */
export interface Listing {
  /** Marketplace item id, when we can find it in the URL. */
  id: string | null;
  url: string;
  title: string;
  /** Asking price in dollars. Null when we couldn't parse one. */
  askingPrice: number | null;
  description: string;
  location: string | null;
  /** Free text as shown, e.g. "Listed 3 weeks ago". */
  listedAgo: string | null;
  /** Days since listing, parsed from `listedAgo` when possible. */
  daysListed: number | null;
  imageUrls: string[];
  /** Which fields came from the DOM vs. a user edit, for the "check this" hint. */
  extraction: ExtractionReport;
}

export interface ExtractionReport {
  /** Fields we failed to find. The panel asks the user to fill these in. */
  missing: Array<keyof Listing>;
  /** Fields the user typed over. */
  edited: Array<keyof Listing>;
  strategy: Record<string, string>;
}

/** The model's judgment. No arithmetic lives here. */
export interface Appraisal {
  identifiedAs: string;
  category: string;
  /** Model's read of condition from photos + text. */
  condition: "new" | "like_new" | "good" | "fair" | "parts_or_repair" | "unclear";
  conditionNotes: string;
  /** Realistic *sold* prices, not asking prices, in the stated channel. */
  comps: {
    low: number;
    median: number;
    high: number;
    channel: Channel;
    basis: string;
  };
  /** 0-1. Drives the haircut applied to comps in `valuation.ts`. */
  confidence: number;
  /** Typical days-to-sell at the median comp. Feeds the holding-cost estimate. */
  estimatedDaysToSell: number;
  risks: Array<{
    kind: "scam" | "counterfeit" | "stolen" | "damage" | "missing_parts" | "market" | "other";
    severity: "low" | "medium" | "high";
    detail: string;
  }>;
  /** Things worth asking the seller before driving out. */
  questionsForSeller: string[];
  negotiationNotes: string;
}

/** User-tunable costs. Everything here is a real dollar figure, not a guess. */
export interface CostSettings {
  channel: Channel;
  /** Target return on cash for the buy to be worth doing, e.g. 0.5 = 50%. */
  targetRoi: number;
  /** Round-trip pickup cost: gas, tolls, and your time. */
  transportCost: number;
  /** Box, tape, label, filler. Per shipped item. */
  packagingCost: number;
  /** What you'll actually pay to ship, when the channel is a shipped one. */
  shippingCost: number;
  /**
   * Fraction of gross knocked off for returns, INAD claims, and the deals that
   * just go sideways. Applied to the comp range before any profit is computed.
   */
  lossAllowance: number;
  /** Opportunity cost of cash tied up, per day, as a fraction of the buy price. */
  holdingCostPerDay: number;
  /** Opening offer as a fraction of your walk-away price. */
  openingOfferFactor: number;
  /** Search the web for current sold prices rather than pricing from memory. */
  liveComps: boolean;
  /** Fee overrides. Falls back to DEFAULT_FEES when absent. */
  feeOverrides?: Partial<Record<Channel, FeeProfile>>;
}

export interface FeeProfile {
  /** Fraction of the sale price taken by the platform. */
  percentFee: number;
  /** Flat per-order fee in dollars. */
  fixedFee: number;
  /** Whether the seller eats shipping on this channel. */
  sellerPaysShipping: boolean;
}

export type Verdict = "strong" | "workable" | "thin" | "pass";

/** The computed answer. Every number here comes from `valuation.ts`. */
export interface DealMath {
  channel: Channel;
  /** Comps after the confidence and loss-allowance haircuts. */
  adjustedComps: { low: number; median: number; high: number };
  /** What lands in your pocket if it sells at the median, before the buy price. */
  netProceedsAtMedian: number;
  feeBreakdown: {
    platformPercent: number;
    platformFixed: number;
    shipping: number;
    packaging: number;
    lossAllowance: number;
    holding: number;
    transport: number;
    total: number;
  };
  /** Most you can pay and still clear `targetRoi`. The walk-away number. */
  maxOffer: number;
  /** Where to start the negotiation. */
  openingOffer: number;
  /** Profit and ROI at the current asking price. Null if no price was found. */
  atAsking: { buyPrice: number; profit: number; roi: number } | null;
  /** Profit at the walk-away price, by definition ~= targetRoi. */
  atMaxOffer: { buyPrice: number; profit: number; roi: number };
  /** Downside case: sells at the adjusted low comp, bought at asking. */
  downside: { profit: number; roi: number } | null;
  verdict: Verdict;
  verdictReason: string;
}

/** What the panel renders. */
export interface Analysis {
  listing: Listing;
  appraisal: Appraisal;
  math: DealMath;
  meta: {
    model: string;
    servedBy: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    imagesAnalyzed: number;
    searches: number;
    analyzedAt: string;
  };
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Messages between content script and service worker. */
export type WorkerRequest =
  | { kind: "analyze"; listing: Listing }
  | { kind: "getSettings" }
  | {
      kind: "saveSettings";
      settings: Partial<CostSettings & { apiKey: string; model: string; effort: Effort }>;
    }
  | { kind: "watch"; listing: Listing; analysis: Analysis }
  | { kind: "unwatch"; id: string }
  | { kind: "listWatched" }
  | { kind: "openOptions" };

export type WorkerResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; kind?: "no_api_key" | "refusal" | "rate_limit" | "network" | "parse" };
