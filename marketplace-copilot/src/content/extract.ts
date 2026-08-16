/**
 * Reading a listing off the page.
 *
 * Facebook's DOM is obfuscated and reshuffles without notice, so nothing here
 * depends on a class name. Each field is attempted by several independent
 * strategies, the winning one is recorded, and anything we fail to find is
 * reported as missing so the panel can ask the user to fill it in by hand.
 * Assume this file will need maintenance; the rest of the extension shouldn't.
 */

import type { ExtractionReport, Listing } from "../lib/types.ts";

const MAX_IMAGES = 3;

export function isListingPage(url: string = location.href): boolean {
  return /\/marketplace\/item\/\d+/.test(url);
}

export function extractListing(): Listing {
  const strategy: Record<string, string> = {};
  const missing: Array<keyof Listing> = [];

  const title = extractTitle(strategy);
  if (!title) missing.push("title");

  const askingPrice = extractPrice(strategy);
  if (askingPrice === null) missing.push("askingPrice");

  const description = extractDescription(title, strategy);
  if (!description) missing.push("description");

  const location_ = extractLocation(strategy);
  if (!location_) missing.push("location");

  const listedAgo = extractListedAgo(strategy);
  if (!listedAgo) missing.push("listedAgo");

  const imageUrls = extractImages(strategy);
  if (imageUrls.length === 0) missing.push("imageUrls");

  return {
    id: location.href.match(/\/marketplace\/item\/(\d+)/)?.[1] ?? null,
    url: location.href.split("?")[0],
    title: title ?? "",
    askingPrice,
    description: description ?? "",
    location: location_,
    listedAgo,
    daysListed: parseDaysAgo(listedAgo),
    imageUrls,
    extraction: { missing, edited: [], strategy } satisfies ExtractionReport,
  };
}

function extractTitle(strategy: Record<string, string>): string | null {
  const h1 = queryVisible("h1")
    .map((el) => text(el))
    .find((t) => t.length > 2 && !/^marketplace$/i.test(t));
  if (h1) {
    strategy.title = "h1";
    return h1;
  }

  const og = meta("og:title");
  if (og) {
    strategy.title = "og:title";
    // FB prefixes some pages with "Marketplace - ".
    return og.replace(/^marketplace\s*[-–|]\s*/i, "").trim();
  }

  const docTitle = document.title.replace(/\s*\|\s*facebook.*$/i, "").trim();
  if (docTitle) {
    strategy.title = "document.title";
    return docTitle;
  }
  return null;
}

const PRICE_RE = /^\$\s?([\d,]+(?:\.\d{2})?)$/;

function extractPrice(strategy: Record<string, string>): number | null {
  // A standalone element whose entire text is a price is almost always the
  // asking price; prices inside sentences are usually something else.
  for (const el of queryVisible("span, div, h2")) {
    const t = text(el);
    if (/^free$/i.test(t) && el.children.length === 0) {
      strategy.askingPrice = "standalone 'Free'";
      return 0;
    }
    const m = t.match(PRICE_RE);
    if (m && el.children.length === 0) {
      strategy.askingPrice = "standalone price element";
      return Number(m[1].replace(/,/g, ""));
    }
  }

  // Fall back to the first price-looking token in the description meta.
  const desc = meta("og:description") ?? "";
  const loose = desc.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
  if (loose) {
    strategy.askingPrice = "og:description";
    return Number(loose[1].replace(/,/g, ""));
  }
  return null;
}

function extractDescription(title: string | null, strategy: Record<string, string>): string | null {
  // The description is the longest run of seller-authored prose on the page.
  // Filtering by `dir="auto"` drops most of Facebook's own chrome, which is
  // rendered without it.
  const candidates = queryVisible('[dir="auto"]')
    .filter((el) => el.querySelector('[dir="auto"]') === null)
    .map((el) => text(el))
    .filter((t) => t.length > 40)
    .filter((t) => t !== title)
    .filter((t) => !isChrome(t));

  const best = candidates.sort((a, b) => b.length - a.length)[0];
  if (best) {
    strategy.description = 'longest [dir="auto"] block';
    return best;
  }

  const og = meta("og:description");
  if (og && og.length > 40) {
    strategy.description = "og:description";
    return og;
  }
  return null;
}

/** Facebook UI strings that keep showing up in text sweeps. */
function isChrome(t: string): boolean {
  return /(?:send seller a message|is this still available|marketplace is not|see more|message seller|location is approximate|log in or sign up|buy and sell|join or log in)/i.test(
    t,
  );
}

function extractLocation(strategy: Record<string, string>): string | null {
  const body = document.body.innerText;

  // "Springfield, IL" style, which is how FB renders the item location.
  const cityState = body.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3},\s*[A-Z]{2})\b/);
  if (cityState) {
    strategy.location = "city, ST pattern";
    return cityState[1];
  }

  const listedIn = body.match(/Listed .{0,40}? in ([^\n]{2,60})/i);
  if (listedIn) {
    strategy.location = "'Listed ... in X'";
    return listedIn[1].trim();
  }
  return null;
}

function extractListedAgo(strategy: Record<string, string>): string | null {
  const body = document.body.innerText;
  const rel = body.match(/Listed\s+(?:about\s+)?((?:a|an|\d+)\s+\w+)\s+ago/i);
  if (rel) {
    strategy.listedAgo = "'Listed X ago'";
    return `${rel[1]} ago`;
  }
  if (/just listed/i.test(body)) {
    strategy.listedAgo = "'Just listed'";
    return "just listed";
  }
  const onDate = body.match(/Listed on\s+([^\n]{3,30})/i);
  if (onDate) {
    strategy.listedAgo = "'Listed on X'";
    return `on ${onDate[1].trim()}`;
  }
  return null;
}

/** "3 weeks ago" -> 21. Returns null when the string isn't a relative age. */
export function parseDaysAgo(listedAgo: string | null): number | null {
  if (!listedAgo) return null;
  if (/just listed/i.test(listedAgo)) return 0;

  const m = listedAgo.match(/(a|an|\d+)\s+(minute|hour|day|week|month|year)s?/i);
  if (!m) return null;

  const n = /^(a|an)$/i.test(m[1]) ? 1 : Number(m[1]);
  const unit = m[2].toLowerCase();
  const perDay: Record<string, number> = {
    minute: 1 / 1440,
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  };
  return Math.round(n * perDay[unit]);
}

function extractImages(strategy: Record<string, string>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const img of Array.from(document.images)) {
    if (urls.length >= MAX_IMAGES) break;
    const src = img.currentSrc || img.src;
    if (!src || !/fbcdn|scontent/.test(src)) continue;
    // Skip avatars, icons, and reaction sprites.
    if (img.naturalWidth < 200 || img.naturalHeight < 200) continue;
    const key = src.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(src);
  }

  if (urls.length > 0) {
    strategy.imageUrls = `${urls.length} fbcdn image(s) >=200px`;
    return urls;
  }

  const ogImage = meta("og:image");
  if (ogImage) {
    strategy.imageUrls = "og:image";
    return [ogImage];
  }
  return [];
}

function meta(property: string): string | null {
  const el =
    document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`) ??
    document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`);
  return el?.content?.trim() || null;
}

function queryVisible(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (el.closest('[role="banner"], [role="navigation"], nav, header')) return false;
    if (el.closest("#mkt-copilot-root")) return false;
    return el.offsetParent !== null || el.getClientRects().length > 0;
  });
}

function text(el: HTMLElement): string {
  return (el.innerText ?? el.textContent ?? "").trim();
}
