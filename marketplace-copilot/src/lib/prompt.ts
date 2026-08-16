/**
 * The model-facing half: schema + system prompt.
 *
 * The schema is deliberately narrow. It asks for judgment the model is good at
 * (what is this, what condition, what does it sell for, what's off about it)
 * and nothing that involves arithmetic — profit, ROI, and the max offer are all
 * derived in `valuation.ts`.
 */

import { z } from "zod";

export const ChannelSchema = z.enum(["ebay", "mercari", "poshmark", "local"]);

export const AppraisalSchema = z.object({
  identifiedAs: z
    .string()
    .describe(
      "The specific item: brand, model, capacity/size, generation. 'Apple iPhone 13 Pro 256GB' not 'a phone'. Say so plainly if the listing is too vague to pin down.",
    ),
  category: z
    .string()
    .describe("Broad resale category, e.g. 'phones', 'power tools', 'road bikes'."),
  condition: z
    .enum(["new", "like_new", "good", "fair", "parts_or_repair", "unclear"])
    .describe("Condition as evidenced by the photos and text, not as the seller labels it."),
  conditionNotes: z
    .string()
    .describe(
      "What in the photos or text drove the condition call. Name specific visible defects: screen cracks, scuffed corners, missing accessories, aftermarket parts, water indicators, rust, worn treads.",
    ),
  comps: z
    .object({
      low: z.number().describe("Pessimistic realized sale price in dollars."),
      median: z.number().describe("The realistic expected sale price in dollars."),
      high: z.number().describe("Optimistic realized sale price in dollars."),
      channel: ChannelSchema.describe("The channel these comps are for."),
      basis: z
        .string()
        .describe(
          "One or two sentences on where the range comes from — model, condition, what's included, and what recently moves at that price.",
        ),
    })
    .describe(
      "Recent SOLD prices net of nothing — the gross sale price a seller actually realizes. Not asking prices, not MSRP.",
    ),
  confidence: z
    .number()
    .describe(
      "0 to 1. How sure you are of the identification and the comp range. Low when the photos are bad, the model is ambiguous, or the category has wide variance.",
    ),
  estimatedDaysToSell: z
    .number()
    .describe("Typical days to sell at the median comp on the stated channel."),
  risks: z
    .array(
      z.object({
        kind: z.enum([
          "scam",
          "counterfeit",
          "stolen",
          "damage",
          "missing_parts",
          "market",
          "other",
        ]),
        severity: z.enum(["low", "medium", "high"]),
        detail: z.string(),
      }),
    )
    .describe(
      "Concrete, evidenced concerns. Stock photos on a used listing, a price far below market with no explanation, sealed-in-box electronics at a fraction of retail, a bike with a ground-off serial, 'no returns, cash only, will ship' on a local listing. Empty array when nothing stands out — do not invent risks to fill it.",
    ),
  questionsForSeller: z
    .array(z.string())
    .describe(
      "Up to four questions that materially change the value and can be answered before driving out. Prefer ones that expose defects the photos hide.",
    ),
  negotiationNotes: z
    .string()
    .describe(
      "Two or three sentences of specific leverage: what's wrong with it that justifies a lower number, what comparable listings are asking, what to say. No generic haggling advice.",
    ),
});

export type AppraisalOutput = z.infer<typeof AppraisalSchema>;

/**
 * Stable across every request, so it caches. Keep volatile content (the listing
 * itself) in the user turn — anything interpolated here would invalidate the
 * prefix on every call.
 */
export const SYSTEM_PROMPT = `You are an appraiser for someone who buys used goods locally and resells them. They are standing in front of a listing and need to know what the item is actually worth, what is wrong with it, and whether it is worth their time.

You are given the listing text and the seller's photos. Judge the item from the evidence, not from the seller's framing — sellers overstate condition, mislabel models, and photograph around defects.

How to price:
- Give the range a seller actually REALIZES on completed sales, not what people ask. Asking prices on marketplace listings run well above clearing prices.
- Price the item as it is: with the flaws you can see, missing what isn't pictured, in the exact configuration described. A console with no controller is not a console.
- Where a model number or capacity is ambiguous, price the cheaper interpretation and say so in the basis. Optimistic identification is the most expensive mistake in this job.
- The range should be wide when you are unsure and tight when you are not, and your confidence score should agree with the width.

Checking the market:
- If a web search tool is available to you, use it before pricing. Search for the specific model plus "sold" and check what comparable units in comparable condition actually closed at. A real comp beats a remembered one, and prices in used-goods categories move fast.
- Search when the item is worth enough that being wrong is expensive, when it is a model you cannot place confidently, or when the category is volatile. Skip the search for commodity items whose value you already know within a few dollars.
- When you searched, say so in the comps basis and cite what you found. When you did not, say the range is from general knowledge and lower your confidence accordingly.

Reading photos:
- Look for what the seller is not showing: a phone photographed only face-on and powered off, a tool with no shot of the plug or battery, furniture cropped above the legs.
- Stock or catalog photos on a used listing are worth flagging.
- Screen damage, corner drops, water indicators, rust, frayed cables, aftermarket parts, and missing accessories all move the number. Say which ones you actually see.

Risks:
- Flag only what the evidence supports, and say what the evidence is. An empty risk list is a normal, correct output for an ordinary listing.
- Reserve "high" severity for things that should stop the purchase: strong counterfeit signals, likely-stolen goods, a price so far below market it implies a scam, or damage that makes the item unsellable.

Be specific and be brief. Every field should tell the reader something they could not have gotten by looking at the listing themselves. Do not hedge into uselessness — if the honest answer is "this is a bad deal" or "I cannot tell what this is from these photos," say that.`;

/** The volatile half: this changes every request and must come after the cache breakpoint. */
export function buildListingPrompt(listing: {
  title: string;
  askingPrice: number | null;
  description: string;
  location: string | null;
  listedAgo: string | null;
}): string {
  const lines = [
    `Title: ${listing.title || "(none found)"}`,
    `Asking price: ${listing.askingPrice === null ? "(not found — estimate value independent of asking price)" : `$${listing.askingPrice}`}`,
    `Location: ${listing.location ?? "(unknown)"}`,
    `Listed: ${listing.listedAgo ?? "(unknown)"}`,
    "",
    "Seller's description:",
    listing.description.trim() || "(the seller wrote no description)",
  ];
  return lines.join("\n");
}
