/**
 * Run one appraisal from the terminal, without loading the extension.
 *
 * This is how you iterate on the prompt and the cost settings: edit a fixture,
 * re-run, read the numbers. Reaching for the browser to tune a prompt is slow.
 *
 *   ANTHROPIC_API_KEY=sk-... npm run analyze -- fixtures/macbook.json
 */

import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { appraise } from "../lib/client.ts";
import { DEFAULT_SETTINGS, computeDeal } from "../lib/valuation.ts";
import type { CostSettings, Listing } from "../lib/types.ts";

interface Fixture {
  title: string;
  askingPrice: number | null;
  description?: string;
  location?: string | null;
  listedAgo?: string | null;
  /** Local paths to listing photos. */
  imagePaths?: string[];
  /** Overrides for the cost model. */
  settings?: Partial<CostSettings>;
}

const MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npm run analyze -- <fixture.json>");
    process.exit(2);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY in the environment.");
    process.exit(2);
  }

  const fixture: Fixture = JSON.parse(await readFile(path, "utf8"));
  const settings: CostSettings = { ...DEFAULT_SETTINGS, ...fixture.settings };

  const listing: Listing = {
    id: basename(path, ".json"),
    url: `file://${path}`,
    title: fixture.title,
    askingPrice: fixture.askingPrice,
    description: fixture.description ?? "",
    location: fixture.location ?? null,
    listedAgo: fixture.listedAgo ?? null,
    daysListed: null,
    imageUrls: fixture.imagePaths ?? [],
    extraction: { missing: [], edited: [], strategy: { source: "fixture" } },
  };

  const images = await Promise.all(
    (fixture.imagePaths ?? []).map(async (p) => {
      const mediaType = MEDIA_TYPES[extname(p).toLowerCase()];
      if (!mediaType) throw new Error(`unsupported image type: ${p}`);
      return { mediaType, base64: (await readFile(p)).toString("base64") };
    }),
  );

  const started = Date.now();
  const { appraisal, meta } = await appraise(listing, {
    apiKey,
    images,
    liveComps: settings.liveComps,
  });
  const math = computeDeal(listing, appraisal, settings);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  console.log(`\n  ${appraisal.identifiedAs}`);
  console.log(`  ${appraisal.condition} — ${appraisal.conditionNotes}\n`);
  console.log(`  VERDICT   ${math.verdict.toUpperCase()}`);
  console.log(`            ${math.verdictReason}\n`);
  console.log(`  Comps     ${money(math.adjustedComps.low)} / ${money(math.adjustedComps.median)} / ${money(math.adjustedComps.high)}  on ${math.channel}`);
  console.log(`            ${appraisal.comps.basis}`);
  console.log(`  Confidence ${Math.round(appraisal.confidence * 100)}% · sells in ~${appraisal.estimatedDaysToSell}d\n`);
  console.log(`  Open at   ${money(math.openingOffer)}`);
  console.log(`  Walk away ${money(math.maxOffer)}`);
  if (math.atAsking) {
    console.log(
      `  At asking ${money(math.atAsking.buyPrice)} → ${money(math.atAsking.profit)} profit (${Math.round(math.atAsking.roi * 100)}% ROI)`,
    );
  }

  if (appraisal.risks.length) {
    console.log("\n  Risks");
    for (const r of appraisal.risks) console.log(`    [${r.severity}] ${r.detail}`);
  }
  if (appraisal.questionsForSeller.length) {
    console.log("\n  Ask the seller");
    for (const q of appraisal.questionsForSeller) console.log(`    - ${q}`);
  }
  console.log(`\n  ${appraisal.negotiationNotes}`);
  console.log(
    `\n  ${elapsed}s · ${meta.servedBy} · ${meta.inputTokens} in (${meta.cacheReadTokens} cached) / ${meta.outputTokens} out · ${meta.imagesAnalyzed} image(s) · ${meta.searches} search(es)\n`,
  );
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
