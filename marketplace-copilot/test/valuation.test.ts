import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_FEES,
  DEFAULT_SETTINGS,
  computeDeal,
  confidenceHaircut,
  holdingCost,
  maxOfferFor,
  netProceeds,
  profitAt,
  roiAt,
  stalenessLeverage,
  velocityFor,
  annualize,
} from "../src/lib/valuation.ts";
import { parseDaysAgo } from "../src/content/extract.ts";
import type { Appraisal, CostSettings, Listing } from "../src/lib/types.ts";

const settings: CostSettings = { ...DEFAULT_SETTINGS };

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    url: "https://www.facebook.com/marketplace/item/1",
    title: "MacBook Pro 14 M2",
    askingPrice: 700,
    description: "Works great, light scratches.",
    location: "Springfield, IL",
    listedAgo: "3 weeks ago",
    daysListed: 21,
    imageUrls: [],
    extraction: { missing: [], edited: [], strategy: {} },
    ...overrides,
  };
}

function appraisal(overrides: Partial<Appraisal> = {}): Appraisal {
  return {
    identifiedAs: "Apple MacBook Pro 14in M2 Pro 512GB",
    category: "laptops",
    condition: "good",
    conditionNotes: "Light scuffing on the lid, screen clean.",
    comps: { low: 900, median: 1050, high: 1200, channel: "ebay", basis: "recent sold listings" },
    confidence: 1,
    estimatedDaysToSell: 14,
    risks: [],
    questionsForSeller: [],
    negotiationNotes: "",
    ...overrides,
  };
}

test("netProceeds subtracts platform fees, logistics, and the loss allowance", () => {
  const sale = 1000;
  const fees = DEFAULT_FEES.ebay;
  const expected =
    sale -
    (sale * fees.percentFee + fees.fixedFee) -
    (settings.shippingCost + settings.packagingCost) -
    sale * settings.lossAllowance;

  assert.equal(netProceeds(sale, settings, "ebay"), Math.round(expected * 100) / 100);
});

test("local resale takes no platform fee and no shipping", () => {
  const local = netProceeds(1000, settings, "local");
  assert.equal(local, 1000 - 1000 * settings.lossAllowance);
  assert.ok(local > netProceeds(1000, settings, "ebay"));
});

test("maxOffer is exactly the price at which the deal hits the required return", () => {
  const sale = 1000;
  const days = 14;
  const max = maxOfferFor(sale, days, settings, "ebay");
  const profit = profitAt(max, sale, days, settings, "ebay");
  const roi = roiAt(max, profit, settings);
  const required = velocityFor(days, settings).requiredRoi;

  // The load-bearing identity of the engine: paying maxOffer lands on the
  // velocity-adjusted required return, not near it.
  assert.ok(
    Math.abs(roi - required) < 0.005,
    `expected ROI ~${required}, got ${roi}`,
  );
});

test("an item that sells at your baseline pace is held to exactly targetRoi", () => {
  const v = velocityFor(settings.baselineDaysToSell, settings);
  assert.equal(v.multiplier, 1);
  assert.equal(v.requiredRoi, settings.targetRoi);
});

test("velocity: faster items need a smaller margin, slower ones a bigger margin", () => {
  const fast = velocityFor(5, settings);
  const normal = velocityFor(30, settings);
  const slow = velocityFor(120, settings);

  assert.ok(fast.requiredRoi < normal.requiredRoi);
  assert.ok(slow.requiredRoi > normal.requiredRoi);
  assert.ok(fast.turnsPerYear > slow.turnsPerYear);
});

test("velocity multiplier is clamped at both ends", () => {
  // A same-day flip still carries a full flip's labour, so it can't demand ~no margin.
  assert.equal(velocityFor(0, settings).multiplier, 0.4);
  // And one absurd days-to-sell estimate can't declare every slow item worthless.
  assert.equal(velocityFor(5000, settings).multiplier, 3);
});

test("velocity: turnaround time counts against the fast items too", () => {
  const noTurnaround = velocityFor(7, { ...settings, turnaroundDays: 0 });
  const withTurnaround = velocityFor(7, { ...settings, turnaroundDays: 10 });
  assert.ok(withTurnaround.cycleDays > noTurnaround.cycleDays);
  assert.ok(withTurnaround.requiredRoi > noTurnaround.requiredRoi);
});

test("at the same profit, the faster flip is worth paying more for", () => {
  const comps = { low: 180, median: 220, high: 260, channel: "ebay" as const, basis: "" };
  const quick = computeDeal(
    listing({ askingPrice: 100 }),
    appraisal({ comps, estimatedDaysToSell: 5 }),
    settings,
  );
  const slow = computeDeal(
    listing({ askingPrice: 100 }),
    appraisal({ comps, estimatedDaysToSell: 120 }),
    settings,
  );

  // Same item, same comps, same asking price — only the turn speed differs.
  assert.ok(
    quick.maxOffer > slow.maxOffer,
    `quick ${quick.maxOffer} should beat slow ${slow.maxOffer}`,
  );
  assert.ok(quick.velocity.turnsPerYear > slow.velocity.turnsPerYear);
});

test("a slow mover can be rejected at a price the same fast mover would clear", () => {
  const comps = { low: 180, median: 220, high: 260, channel: "ebay" as const, basis: "" };
  const asking = 120;
  const quick = computeDeal(listing({ askingPrice: asking }), appraisal({ comps, estimatedDaysToSell: 4 }), settings);
  const slow = computeDeal(listing({ askingPrice: asking }), appraisal({ comps, estimatedDaysToSell: 150 }), settings);

  const rank = { strong: 3, workable: 2, thin: 1, pass: 0 };
  assert.ok(
    rank[quick.verdict] > rank[slow.verdict],
    `quick verdict ${quick.verdict} should outrank slow verdict ${slow.verdict}`,
  );
});

test("the verdict explains itself when speed moved the number, and stays quiet when it didn't", () => {
  const comps = { low: 180, median: 220, high: 260, channel: "ebay" as const, basis: "" };
  const l = listing({ askingPrice: 90 });

  assert.match(
    computeDeal(l, appraisal({ comps, estimatedDaysToSell: 150 }), settings).verdictReason,
    /Slow mover/,
  );
  assert.match(
    computeDeal(l, appraisal({ comps, estimatedDaysToSell: 4 }), settings).verdictReason,
    /Quick turn/,
  );
  assert.doesNotMatch(
    computeDeal(l, appraisal({ comps, estimatedDaysToSell: 30 }), settings).verdictReason,
    /Slow mover|Quick turn/,
  );
});

test("annualized return restates a flip as a year of repeating it", () => {
  const deal = computeDeal(listing({ askingPrice: 400 }), appraisal({ estimatedDaysToSell: 14 }), settings);
  const expected = annualize(deal.atAsking!.roi, deal.velocity);

  assert.equal(deal.atAsking!.annualizedRoi, expected);
  // 14 days to sell plus turnaround turns the cash ~21x a year.
  assert.ok(deal.atAsking!.annualizedRoi > deal.atAsking!.roi);
});

test("a higher target ROI lowers what you can pay", () => {
  const greedy = { ...settings, targetRoi: 1.0 };
  assert.ok(maxOfferFor(1000, 14, greedy, "ebay") < maxOfferFor(1000, 14, settings, "ebay"));
});

test("maxOffer floors at zero rather than going negative on cheap items", () => {
  assert.equal(maxOfferFor(5, 14, settings, "ebay"), 0);
});

test("confidence haircut shrinks the range and stays bounded", () => {
  assert.equal(confidenceHaircut(1), 1);
  assert.equal(confidenceHaircut(0), 0.75);
  assert.equal(confidenceHaircut(0.5), 0.875);
  // Out-of-range values from the model must not blow up the math.
  assert.equal(confidenceHaircut(5), 1);
  assert.equal(confidenceHaircut(-2), 0.75);
});

test("holding cost scales with days and is never negative", () => {
  assert.ok(holdingCost(500, 30, settings) > holdingCost(500, 5, settings));
  assert.equal(holdingCost(500, -10, settings), 0);
});

test("computeDeal: a clear win reads as a strong buy", () => {
  const deal = computeDeal(listing({ askingPrice: 400 }), appraisal(), settings);
  assert.equal(deal.verdict, "strong");
  assert.ok(deal.atAsking!.profit > 0);
  assert.ok(deal.openingOffer < deal.maxOffer);
});

test("computeDeal: asking well above the walk-away price is a pass", () => {
  const deal = computeDeal(listing({ askingPrice: 1400 }), appraisal(), settings);
  assert.equal(deal.verdict, "pass");
  assert.ok(deal.atAsking!.profit < 0);
});

test("computeDeal: a high-severity risk overrides good economics", () => {
  const deal = computeDeal(
    listing({ askingPrice: 200 }),
    appraisal({
      risks: [{ kind: "counterfeit", severity: "high", detail: "Logo and port spacing are wrong." }],
    }),
    settings,
  );
  assert.equal(deal.verdict, "pass");
  assert.match(deal.verdictReason, /counterfeit/);
});

test("computeDeal: low confidence pulls the comps and the offer down", () => {
  const sure = computeDeal(listing(), appraisal({ confidence: 1 }), settings);
  const unsure = computeDeal(listing(), appraisal({ confidence: 0.2 }), settings);

  assert.ok(unsure.adjustedComps.median < sure.adjustedComps.median);
  assert.ok(unsure.maxOffer < sure.maxOffer);
});

test("computeDeal: a missing asking price still produces a walk-away number", () => {
  const deal = computeDeal(listing({ askingPrice: null }), appraisal(), settings);
  assert.equal(deal.atAsking, null);
  assert.equal(deal.downside, null);
  assert.ok(deal.maxOffer > 0);
  assert.match(deal.verdictReason, /No asking price/);
});

test("computeDeal: the downside case uses the low comp, not the median", () => {
  const deal = computeDeal(listing({ askingPrice: 800 }), appraisal(), settings);
  assert.ok(deal.downside!.profit < deal.atAsking!.profit);
});

test("computeDeal: the model's channel wins over the configured default", () => {
  const deal = computeDeal(
    listing(),
    appraisal({ comps: { ...appraisal().comps, channel: "local" } }),
    { ...settings, channel: "ebay" },
  );
  assert.equal(deal.channel, "local");
  assert.equal(deal.feeBreakdown.shipping, 0);
});

test("parseDaysAgo understands the relative strings Facebook renders", () => {
  assert.equal(parseDaysAgo("3 weeks ago"), 21);
  assert.equal(parseDaysAgo("2 days ago"), 2);
  assert.equal(parseDaysAgo("an hour ago"), 0);
  assert.equal(parseDaysAgo("a month ago"), 30);
  assert.equal(parseDaysAgo("just listed"), 0);
  assert.equal(parseDaysAgo("on March 3"), null);
  assert.equal(parseDaysAgo(null), null);
});

test("staleness leverage escalates with time on market", () => {
  assert.match(stalenessLeverage(60)!, /more motivated/);
  assert.match(stalenessLeverage(2)!, /Fresh listing/);
  assert.equal(stalenessLeverage(null), null);
});
