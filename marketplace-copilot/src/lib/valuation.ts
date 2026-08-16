/**
 * The deterministic core.
 *
 * The model supplies a comp range and a confidence; everything below is plain
 * arithmetic on that range. Keeping the money math here — rather than asking
 * the model for a "max offer" — means the numbers are reproducible, testable,
 * and wrong only when the *inputs* are wrong.
 */

import type {
  Appraisal,
  Channel,
  CostSettings,
  DealMath,
  FeeProfile,
  Listing,
  Position,
  Velocity,
  Verdict,
} from "./types.ts";

/**
 * Published rates as of early 2026. They move, and they vary by category and
 * by seller standing — treat these as a starting point and override them in
 * Options once you know your own numbers.
 */
export const DEFAULT_FEES: Record<Channel, FeeProfile> = {
  ebay: { percentFee: 0.1335, fixedFee: 0.4, sellerPaysShipping: true },
  mercari: { percentFee: 0.1, fixedFee: 0.5, sellerPaysShipping: true },
  poshmark: { percentFee: 0.2, fixedFee: 0, sellerPaysShipping: false },
  local: { percentFee: 0, fixedFee: 0, sellerPaysShipping: false },
};

export const DEFAULT_SETTINGS: CostSettings = {
  channel: "ebay",
  targetRoi: 0.5,
  transportCost: 12,
  packagingCost: 3,
  shippingCost: 14,
  lossAllowance: 0.06,
  holdingCostPerDay: 0.0005,
  baselineDaysToSell: 30,
  turnaroundDays: 3,
  openingOfferFactor: 0.72,
  liveComps: true,
};

/** Most we'll discount a comp range for low model confidence. */
const MAX_CONFIDENCE_HAIRCUT = 0.25;

/** Below this profit, a flip isn't worth the drive regardless of ROI. */
const MIN_WORTHWHILE_PROFIT = 25;

/**
 * Bounds on the velocity adjustment.
 *
 * Every flip costs the same fixed labour — the drive, the listing, the packing —
 * no matter how fast it sells, so a same-day seller doesn't justify paying
 * nearly the full comp. The floor stops a very fast item from demanding almost
 * no margin; the ceiling stops one wild days-to-sell estimate from declaring
 * every slow item worthless.
 */
const MIN_VELOCITY_MULTIPLIER = 0.4;
const MAX_VELOCITY_MULTIPLIER = 3;

/** A flip that ties up cash at least this much longer than baseline is "slow". */
const SLOW_MOVER_MULTIPLIER = 1.5;
/** ...and this much shorter is "fast". */
const FAST_MOVER_MULTIPLIER = 0.7;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function feesFor(settings: CostSettings, channel: Channel): FeeProfile {
  return settings.feeOverrides?.[channel] ?? DEFAULT_FEES[channel];
}

/**
 * Shrink the comp range toward zero when the model isn't sure what the item is.
 * confidence 1.0 leaves it untouched; 0.0 takes 25% off.
 */
export function confidenceHaircut(confidence: number): number {
  const c = clamp(confidence, 0, 1);
  return 1 - (1 - c) * MAX_CONFIDENCE_HAIRCUT;
}

/**
 * What actually lands in your pocket from a sale at `salePrice`, before you
 * subtract what you paid for the item.
 */
export function netProceeds(
  salePrice: number,
  settings: CostSettings,
  channel: Channel,
): number {
  const fees = feesFor(settings, channel);
  const platform = salePrice * fees.percentFee + fees.fixedFee;
  const logistics = fees.sellerPaysShipping
    ? settings.shippingCost + settings.packagingCost
    : 0;
  const loss = salePrice * settings.lossAllowance;
  return round2(salePrice - platform - logistics - loss);
}

/** Cost of having cash tied up in the item while it sits. */
export function holdingCost(
  buyPrice: number,
  daysToSell: number,
  settings: CostSettings,
): number {
  return round2(buyPrice * settings.holdingCostPerDay * Math.max(0, daysToSell));
}

/** Profit on a completed flip: buy at `buyPrice`, sell at `salePrice`. */
export function profitAt(
  buyPrice: number,
  salePrice: number,
  daysToSell: number,
  settings: CostSettings,
  channel: Channel,
): number {
  return round2(
    netProceeds(salePrice, settings, channel) -
      buyPrice -
      settings.transportCost -
      holdingCost(buyPrice, daysToSell, settings),
  );
}

/** Return on the cash you actually put at risk (the item plus the drive). */
export function roiAt(buyPrice: number, profit: number, settings: CostSettings): number {
  const atRisk = buyPrice + settings.transportCost;
  if (atRisk <= 0) return 0;
  return round2(profit / atRisk);
}

/**
 * How fast this flip returns your cash, and what return it therefore has to clear.
 *
 * Raw profit makes a $150 item that sits for three months look better than a $40
 * item that turns in a week. It isn't: the fast one recycles the same cash into
 * eight more flips over that quarter. Rather than compare items on profit, we
 * hold each to a return scaled by how long it ties money up — so `targetRoi`
 * means the same *annual* return whatever the item is.
 */
export function velocityFor(daysToSell: number, settings: CostSettings): Velocity {
  const days = Math.max(0, daysToSell || 0);
  const cycleDays = Math.max(1, days + settings.turnaroundDays);
  const baselineCycle = Math.max(1, settings.baselineDaysToSell + settings.turnaroundDays);

  const multiplier = clamp(
    cycleDays / baselineCycle,
    MIN_VELOCITY_MULTIPLIER,
    MAX_VELOCITY_MULTIPLIER,
  );

  return {
    daysToSell: days,
    cycleDays,
    multiplier: round2(multiplier),
    requiredRoi: round2(settings.targetRoi * multiplier),
    turnsPerYear: round2(365 / cycleDays),
  };
}

/** A per-flip return restated as the annual return on the same capital. */
export function annualize(roi: number, velocity: Velocity): number {
  return round2(roi * velocity.turnsPerYear);
}

/**
 * The walk-away price: the most you can pay and still clear the required return
 * for an item that moves this fast.
 *
 * Solves profit(b) = R * (b + transport) for b, where R is the velocity-adjusted
 * required return and profit(b) = N - b - transport - b*h*d:
 *
 *   b = (N - transport * (1 + R)) / (1 + h*d + R)
 */
export function maxOfferFor(
  salePrice: number,
  daysToSell: number,
  settings: CostSettings,
  channel: Channel,
): number {
  const velocity = velocityFor(daysToSell, settings);
  const n = netProceeds(salePrice, settings, channel);
  const holdRate = settings.holdingCostPerDay * Math.max(0, daysToSell);
  const numerator = n - settings.transportCost * (1 + velocity.requiredRoi);
  const denominator = 1 + holdRate + velocity.requiredRoi;
  return round2(Math.max(0, numerator / denominator));
}

export function computeDeal(
  listing: Listing,
  appraisal: Appraisal,
  settings: CostSettings,
): DealMath {
  const channel = appraisal.comps.channel ?? settings.channel;
  const haircut = confidenceHaircut(appraisal.confidence);
  const adjustedComps = {
    low: round2(appraisal.comps.low * haircut),
    median: round2(appraisal.comps.median * haircut),
    high: round2(appraisal.comps.high * haircut),
  };

  const days = Math.max(0, appraisal.estimatedDaysToSell || 0);
  const fees = feesFor(settings, channel);
  const net = netProceeds(adjustedComps.median, settings, channel);
  const velocity = velocityFor(days, settings);

  // Walk-away, floored to whole dollars so rounding never works against you.
  const maxOffer = Math.floor(maxOfferFor(adjustedComps.median, days, settings, channel));
  const openingOffer = Math.max(1, Math.floor(maxOffer * settings.openingOfferFactor));

  const positionAt = (buyPrice: number): Position => {
    const profit = profitAt(buyPrice, adjustedComps.median, days, settings, channel);
    const roi = roiAt(buyPrice, profit, settings);
    return { buyPrice, profit, roi, annualizedRoi: annualize(roi, velocity) };
  };

  const asking = listing.askingPrice;
  const atAsking = asking === null ? null : positionAt(asking);
  const atMaxOffer = positionAt(maxOffer);

  const downside =
    asking === null
      ? null
      : (() => {
          const profit = profitAt(asking, adjustedComps.low, days, settings, channel);
          return { profit, roi: roiAt(asking, profit, settings) };
        })();

  const { verdict, reason } = judge(atAsking, maxOffer, asking, appraisal, velocity);

  return {
    channel,
    adjustedComps,
    netProceedsAtMedian: net,
    velocity,
    feeBreakdown: {
      platformPercent: round2(adjustedComps.median * fees.percentFee),
      platformFixed: fees.fixedFee,
      shipping: fees.sellerPaysShipping ? settings.shippingCost : 0,
      packaging: fees.sellerPaysShipping ? settings.packagingCost : 0,
      lossAllowance: round2(adjustedComps.median * settings.lossAllowance),
      holding: holdingCost(maxOffer, days, settings),
      transport: settings.transportCost,
      total: round2(adjustedComps.median - net + settings.transportCost),
    },
    maxOffer,
    openingOffer,
    atAsking,
    atMaxOffer,
    downside,
    verdict,
    verdictReason: reason,
  };
}

function judge(
  atAsking: Position | null,
  maxOffer: number,
  asking: number | null,
  appraisal: Appraisal,
  velocity: Velocity,
): { verdict: Verdict; reason: string } {
  const highRisk = appraisal.risks.find((r) => r.severity === "high");
  if (highRisk) {
    return {
      verdict: "pass",
      reason: `High-severity risk flagged (${highRisk.kind}): ${highRisk.detail}`,
    };
  }

  if (maxOffer <= 0) {
    return {
      verdict: "pass",
      reason: "Fees, shipping, and the drive eat the entire spread — there's no price at which this clears your target.",
    };
  }

  if (atAsking === null || asking === null) {
    return {
      verdict: "workable",
      reason: `No asking price found. Your walk-away is $${maxOffer}${speedNote(velocity)}`,
    };
  }

  if (atAsking.profit < MIN_WORTHWHILE_PROFIT && asking <= maxOffer) {
    return {
      verdict: "thin",
      reason: `Clears your target but only nets $${atAsking.profit.toFixed(0)} — below the $${MIN_WORTHWHILE_PROFIT} floor where a pickup is worth the trip.`,
    };
  }

  if (asking <= maxOffer * 0.8 && atAsking.profit >= MIN_WORTHWHILE_PROFIT * 2) {
    return {
      verdict: "strong",
      reason: `Asking $${asking} is well under your $${maxOffer} walk-away — $${atAsking.profit.toFixed(0)} at the median comp even without negotiating.${speedNote(velocity)}`,
    };
  }

  if (asking <= maxOffer) {
    return {
      verdict: "workable",
      reason: `Asking $${asking} is inside your $${maxOffer} walk-away. Open at your offer price and there's real room.${speedNote(velocity)}`,
    };
  }

  if (asking <= maxOffer * 1.25) {
    return {
      verdict: "thin",
      reason: `Asking $${asking} is above your $${maxOffer} walk-away, but close enough that a successful negotiation makes it work.${speedNote(velocity)}`,
    };
  }

  return {
    verdict: "pass",
    reason: `Asking $${asking} is far above your $${maxOffer} walk-away. They'd have to come down ${Math.round((1 - maxOffer / asking) * 100)}%.${speedNote(velocity)}`,
  };
}

/**
 * Say why the walk-away price moved, but only when speed actually shifted it.
 * On an average-turning item this adds nothing and stays quiet.
 */
function speedNote(velocity: Velocity): string {
  if (velocity.multiplier >= SLOW_MOVER_MULTIPLIER) {
    return ` Slow mover — about ${velocity.daysToSell} days to sell, so your cash only turns ${velocity.turnsPerYear.toFixed(1)}x a year. That's why the walk-away price is lower than the profit alone suggests.`;
  }
  if (velocity.multiplier <= FAST_MOVER_MULTIPLIER) {
    return ` Quick turn — about ${velocity.daysToSell} days to sell, ${velocity.turnsPerYear.toFixed(1)}x a year on the same cash, so a thinner margin still pays.`;
  }
  return "";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Deterministic negotiation leverage from how long the listing has sat. */
export function stalenessLeverage(daysListed: number | null): string | null {
  if (daysListed === null) return null;
  if (daysListed >= 45)
    return `Sitting ${daysListed} days. At this point the seller is usually more motivated than the price suggests — lead with a firm cash-today offer.`;
  if (daysListed >= 21)
    return `Sitting ${daysListed} days. Long enough that a lowball won't offend; mention you can pick up immediately.`;
  if (daysListed >= 7)
    return `Listed ${daysListed} days ago. Mild leverage — worth one offer below asking before meeting in the middle.`;
  return `Listed ${daysListed} days ago. Fresh listing, so expect competition and less flexibility on price.`;
}
