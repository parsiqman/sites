/**
 * Content script entry.
 *
 * Facebook is a single-page app: navigating between listings swaps the DOM
 * without a page load, so we watch for URL changes rather than relying on
 * document lifecycle events.
 */

import { extractListing, isListingPage } from "./extract.ts";
import { Panel } from "./panel.ts";
import type { Analysis, Listing, WorkerRequest, WorkerResponse } from "../lib/types.ts";

let panel: Panel | null = null;
let currentUrl = "";

function send<T>(req: WorkerRequest): Promise<WorkerResponse<T>> {
  return chrome.runtime.sendMessage(req) as Promise<WorkerResponse<T>>;
}

function mountPanel(listing: Listing) {
  const handlers = {
    onAnalyze: async (edited: Listing) => {
      panel?.setLoading();
      const res = await send<Analysis>({ kind: "analyze", listing: edited });
      if (res.ok) {
        panel?.setAnalysis(res.data);
      } else {
        panel?.setError(res.error, res.kind === "no_api_key");
      }
    },
    onWatch: async (analysis: Analysis) => {
      const res = await send({ kind: "watch", listing: analysis.listing, analysis });
      if (res.ok) panel?.setWatched(true);
    },
    onOpenOptions: () => {
      void chrome.runtime.sendMessage({ kind: "openOptions" });
    },
  };

  if (panel) {
    panel.setListing(listing);
  } else {
    panel = new Panel(listing, handlers);
  }
}

/**
 * Wait for the listing body to render before scraping — on a cold navigation
 * the title and price arrive a beat after the route change.
 */
function scrapeWhenReady(attempt = 0) {
  const listing = extractListing();
  const enoughToWorkWith = listing.title && (listing.askingPrice !== null || listing.description);

  if (enoughToWorkWith || attempt >= 10) {
    mountPanel(listing);
    return;
  }
  setTimeout(() => scrapeWhenReady(attempt + 1), 400);
}

function onRouteChange() {
  const url = location.href.split("?")[0];
  if (url === currentUrl) return;
  currentUrl = url;

  if (isListingPage(url)) {
    scrapeWhenReady();
  } else {
    panel?.destroy();
    panel = null;
  }
}

// history.pushState fires no event of its own; patch it so SPA navigations
// reach us the same way a back/forward does.
const origPush = history.pushState;
history.pushState = function (...args) {
  const result = origPush.apply(this, args as never);
  window.dispatchEvent(new Event("mkt-copilot:navigate"));
  return result;
};
window.addEventListener("popstate", onRouteChange);
window.addEventListener("mkt-copilot:navigate", onRouteChange);

onRouteChange();
