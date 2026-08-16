# Marketplace Copilot

A Chrome extension that appraises the Facebook Marketplace listing you're **already looking at**: what the item really is, what it resells for, what you'd actually clear after fees, what looks wrong with it, and what to offer.

It does not crawl, poll, or watch for new listings. It reads the page in front of you, on your own session, when you click the button. That's a deliberate design constraint — see [Why it works this way](#why-it-works-this-way).

---

## What you get

Open a listing, hit **Appraise**, and the panel gives you:

- **A verdict** — strong buy / workable / thin / pass, with the reason stated in one line.
- **Two numbers**: what to open at, and the price above which you walk away.
- **Comps** for the resale channel you sell on, with the basis stated.
- **The full cost stack** — platform fees, shipping, packaging, returns allowance, gas — so the profit number isn't a black box.
- **Risk flags** with evidence: counterfeit signals, stock photos on a used listing, damage the seller didn't mention.
- **Questions to ask before you drive out.**
- **Price tracking** on items you're watching.

## Install

```bash
npm install
npm run build          # -> dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick `dist/`.

The options page opens on first install. Paste an Anthropic API key from
[console.anthropic.com](https://console.anthropic.com/settings/keys) and set your economics
(resale channel, target ROI, what a pickup costs you). Defaults are reasonable but they're
not *your* numbers — the math is only as good as what you put in here.

## Tuning it without the browser

The slow way to iterate on a prompt is to reload an extension and click through Facebook.
Don't. Run one appraisal straight from the terminal:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run analyze -- fixtures/macbook.json
```

Edit the fixture, re-run, read the numbers. Add `imagePaths` to the fixture to test photo reading.

```bash
npm test          # the valuation engine
npx tsc --noEmit  # typecheck
npm run watch     # rebuild on save
```

---

## How it's put together

```
content script  →  scrapes the listing, renders the panel, never sees your API key
service worker  →  downscales photos, calls the API, runs the math
   lib/prompt.ts    the schema + system prompt (model judgment only)
   lib/valuation.ts every dollar figure (plain arithmetic, fully tested)
```

**The model estimates value; code does the money math.** The model returns a comp range,
a condition read, a confidence, and risk flags — and nothing else. Profit, ROI, the
walk-away price, and the verdict are all computed in `valuation.ts` from that range.
That split is the point: those numbers are reproducible, unit-tested, and wrong only when
the inputs are wrong. Asking a model to compute your max offer gets you a number that
looks authoritative and moves every time you ask.

Other things worth knowing:

- **Live comps.** By default the model searches the web for current sold prices rather than
  pricing from training memory. This is the single biggest accuracy lever, and it's why
  appraisals take ~15–30s. Turn it off in options for speed; confidence drops accordingly,
  and the confidence haircut widens the margin the math demands.
- **Confidence feeds the math.** A low-confidence identification shrinks the comp range
  before any profit is computed, so an uncertain appraisal automatically produces a more
  conservative offer instead of a confident-sounding guess.
- **Speed feeds the math too.** Raw profit makes a $150 item that sits for three months
  look better than a $40 item that turns in a week. It isn't — the fast one recycles the
  same cash into eight more flips over that quarter. So each item is held to a return
  scaled by how long it ties money up: your target ROI is what a *normal-paced* flip must
  clear, fast movers can clear less, and slow movers have to earn more. Set your normal
  pace in options.
- **Photos are downscaled to 1024px** before upload. Condition assessment doesn't need
  full resolution, and full-size Facebook photos cost several times more in image tokens.
- **The system prompt is cached.** It's byte-identical every call, so repeat appraisals
  read it from cache instead of paying for it again.

## Where your key lives

In `chrome.storage.local`, in this browser profile — not synced, and never passed into the
page. All API calls happen in the service worker, so nothing running on `facebook.com`
can read it. That still means: anyone with access to your browser profile can read the key.
**Use a key with a spend limit set.**

---

## Why it works this way

The obvious version of this product is a bot that watches Marketplace and alerts you the
moment an underpriced item appears. That version can't be built responsibly:

Marketplace listings sit behind a login and there's no public API for consumer listings.
Polling them at speed means a fleet of Facebook accounts, residential proxies, and headless
browsers — a straightforward breach of the terms you agreed to, on infrastructure that
exists to get around detection. Meta has litigated against exactly this. And the operational
reality is no better: accounts get checkpointed constantly, so uptime becomes a treadmill.

So this reads one page, on your session, when you ask it to — the same thing you'd do by
hand, faster. It gives up the "five minutes before everyone else" hook, which was never
deliverable at scale anyway, and keeps the part that's actually hard: knowing what the
thing is worth.

## Known limitations

- **The extraction will break.** Facebook's DOM is obfuscated and changes without notice.
  Every field has several fallback strategies and anything unparsed is surfaced as an
  editable box in the panel, so a broken scrape degrades to "type it in" rather than a
  dead extension. `src/content/extract.ts` is the file that will need periodic care.
- **Fee defaults are approximations.** eBay's final value fee varies by category and seller
  standing. Override them in options once you know your real numbers.
- **Comps are estimates, not a sold-listings database.** With live comps on, the model reads
  what it finds on the open web. That's much better than memory and still not the same as
  eBay's Marketplace Insights data. Treat the range as informed, not authoritative.
- **Facebook Marketplace only, for now.** Craigslist and OfferUp would each need their own
  extractor; nothing else in the codebase would change.
