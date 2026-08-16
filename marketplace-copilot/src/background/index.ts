/**
 * Service worker.
 *
 * Everything that touches the API key happens here. The content script sends a
 * listing and gets back a finished analysis; it never sees a credential and
 * never makes a cross-origin request itself.
 */

import { appraise, AppraisalError } from "../lib/client.ts";
import { computeDeal } from "../lib/valuation.ts";
import { getConfig, saveConfig, getWatchlist, watch, unwatch } from "../lib/storage.ts";
import type { Analysis, Listing, WorkerRequest, WorkerResponse } from "../lib/types.ts";

/** Long edge, in pixels, that photos are downscaled to before upload. */
const MAX_IMAGE_EDGE = 1024;

chrome.runtime.onMessage.addListener((req: WorkerRequest, _sender, sendResponse) => {
  handle(req)
    .then((data) => sendResponse({ ok: true, data } satisfies WorkerResponse))
    .catch((err: unknown) => {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        kind: err instanceof AppraisalError ? err.kind : undefined,
      } satisfies WorkerResponse);
    });
  // Keep the message channel open for the async reply.
  return true;
});

async function handle(req: WorkerRequest): Promise<unknown> {
  switch (req.kind) {
    case "analyze":
      return analyze(req.listing);
    case "getSettings":
      return getConfig();
    case "saveSettings":
      return saveConfig(req.settings);
    case "watch":
      return watch(req.listing, req.analysis);
    case "unwatch":
      return unwatch(req.id);
    case "listWatched":
      return getWatchlist();
    case "openOptions":
      return chrome.runtime.openOptionsPage();
  }
}

async function analyze(listing: Listing): Promise<Analysis> {
  const config = await getConfig();

  const images = await loadImages(listing.imageUrls);
  const { appraisal, meta } = await appraise(listing, {
    apiKey: config.apiKey,
    model: config.model,
    effort: config.effort,
    liveComps: config.liveComps,
    images,
  });

  // The model gave us a comp range; the money math is ours.
  const math = computeDeal(listing, appraisal, config);

  return {
    listing,
    appraisal,
    math,
    meta: { ...meta, analyzedAt: new Date().toISOString() },
  };
}

/**
 * Fetch the listing photos and shrink them.
 *
 * Full-resolution Facebook photos cost several times more in image tokens than
 * a 1024px version, and condition assessment doesn't need the extra pixels.
 * A photo that fails to load is skipped rather than failing the analysis.
 */
async function loadImages(
  urls: string[],
): Promise<Array<{ mediaType: "image/jpeg"; base64: string }>> {
  const results = await Promise.allSettled(urls.map(downscaleToJpeg));
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => ({ mediaType: "image/jpeg" as const, base64: r.value }));
}

async function downscaleToJpeg(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image fetch failed: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  return toBase64(await blob.arrayBuffer());
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.runtime.openOptionsPage();
  }
});
