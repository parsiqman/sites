/**
 * The injected panel.
 *
 * Rendered into a shadow root so Facebook's stylesheet and ours never touch.
 * The panel owns no logic beyond presentation and the manual-correction form —
 * it asks the service worker for an analysis and renders whatever comes back.
 */

import type { Analysis, Listing } from "../lib/types.ts";
import { PANEL_CSS } from "./panel-styles.ts";
import { stalenessLeverage } from "../lib/valuation.ts";

const ROOT_ID = "mkt-copilot-root";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; analysis: Analysis }
  | { phase: "error"; message: string; canOpenOptions: boolean };

export class Panel {
  private host: HTMLElement;
  private root: ShadowRoot;
  private state: State = { phase: "idle" };
  private collapsed = false;
  private listing: Listing;
  private watched = false;

  constructor(
    listing: Listing,
    private handlers: {
      onAnalyze: (listing: Listing) => void;
      onWatch: (analysis: Analysis) => void;
      onOpenOptions: () => void;
    },
  ) {
    this.listing = listing;

    document.getElementById(ROOT_ID)?.remove();
    this.host = document.createElement("div");
    this.host.id = ROOT_ID;
    document.documentElement.appendChild(this.host);

    this.root = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    this.root.appendChild(style);

    this.render();
  }

  setListing(listing: Listing) {
    this.listing = listing;
    this.state = { phase: "idle" };
    this.watched = false;
    this.render();
  }

  setLoading() {
    this.state = { phase: "loading" };
    this.render();
  }

  setAnalysis(analysis: Analysis) {
    this.state = { phase: "done", analysis };
    this.render();
  }

  setError(message: string, canOpenOptions = false) {
    this.state = { phase: "error", message, canOpenOptions };
    this.render();
  }

  setWatched(on: boolean) {
    this.watched = on;
    this.render();
  }

  destroy() {
    this.host.remove();
  }

  private render() {
    this.root.querySelector(".wrap")?.remove();

    const wrap = el("div", `wrap${this.collapsed ? " collapsed" : ""}`);
    wrap.appendChild(this.renderHeader());
    if (!this.collapsed) wrap.appendChild(this.renderBody());
    this.root.appendChild(wrap);
  }

  private renderHeader(): HTMLElement {
    const header = el("header");
    header.appendChild(el("span", "dot"));
    const h2 = el("h2");
    h2.textContent = "Marketplace Copilot";
    header.appendChild(h2);
    header.appendChild(el("div", "spacer"));

    const toggle = el("button") as HTMLButtonElement;
    toggle.textContent = this.collapsed ? "▲" : "▼";
    toggle.title = this.collapsed ? "Expand" : "Collapse";
    header.appendChild(toggle);

    header.addEventListener("click", () => {
      this.collapsed = !this.collapsed;
      this.render();
    });
    return header;
  }

  private renderBody(): HTMLElement {
    const body = el("div", "body");

    switch (this.state.phase) {
      case "idle":
        this.renderIdle(body);
        break;
      case "loading":
        this.renderLoading(body);
        break;
      case "error":
        this.renderError(body, this.state.message, this.state.canOpenOptions);
        break;
      case "done":
        this.renderAnalysis(body, this.state.analysis);
        break;
    }
    return body;
  }

  private renderIdle(body: HTMLElement) {
    const { missing } = this.listing.extraction;

    if (missing.length > 0) {
      const warn = el("div", "warn");
      warn.textContent = `Couldn't read ${missing.join(", ")} off the page. Fill in what you can — the appraisal is only as good as what goes in.`;
      body.appendChild(warn);
    }

    body.appendChild(this.renderFields());

    const btn = el("button", "primary") as HTMLButtonElement;
    btn.textContent = "Appraise this listing";
    btn.addEventListener("click", () => this.handlers.onAnalyze(this.collectFields()));
    body.appendChild(btn);

    const note = el("p", "note");
    note.textContent = `${this.listing.imageUrls.length} photo(s) will be sent with the listing text.`;
    body.appendChild(note);
  }

  private renderFields(): HTMLElement {
    const fields = el("div", "fields");
    fields.appendChild(
      textField("title", "Item", this.listing.title, "What is it?"),
    );
    fields.appendChild(
      textField(
        "askingPrice",
        "Asking price ($)",
        this.listing.askingPrice === null ? "" : String(this.listing.askingPrice),
        "0",
      ),
    );
    fields.appendChild(
      areaField("description", "Seller's description", this.listing.description),
    );
    return fields;
  }

  /** Merge any hand-edits back over the scraped listing. */
  private collectFields(): Listing {
    const get = (name: string) =>
      this.root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${name}"]`)
        ?.value ?? "";

    const title = get("title").trim();
    const rawPrice = get("askingPrice").trim();
    const description = get("description").trim();

    const edited: Array<keyof Listing> = [];
    if (title !== this.listing.title) edited.push("title");
    if (description !== this.listing.description) edited.push("description");

    const price = rawPrice === "" ? null : Number(rawPrice.replace(/[^\d.]/g, ""));
    const askingPrice = price !== null && Number.isFinite(price) ? price : null;
    if (askingPrice !== this.listing.askingPrice) edited.push("askingPrice");

    return {
      ...this.listing,
      title,
      description,
      askingPrice,
      extraction: { ...this.listing.extraction, edited },
    };
  }

  private renderLoading(body: HTMLElement) {
    const p = el("p", "body-text");
    p.appendChild(el("span", "spinner"));
    p.append("Appraising — reading the photos and pricing comps.");
    body.appendChild(p);
  }

  private renderError(body: HTMLElement, message: string, canOpenOptions: boolean) {
    const err = el("div", "error");
    err.textContent = message;
    body.appendChild(err);

    const footer = el("footer");
    const retry = el("button", "ghost") as HTMLButtonElement;
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.handlers.onAnalyze(this.collectFields()));
    footer.appendChild(retry);

    if (canOpenOptions) {
      const opts = el("button", "ghost") as HTMLButtonElement;
      opts.textContent = "Open settings";
      opts.addEventListener("click", () => this.handlers.onOpenOptions());
      footer.appendChild(opts);
    }
    body.appendChild(footer);
  }

  private renderAnalysis(body: HTMLElement, a: Analysis) {
    const { appraisal, math } = a;

    const verdict = el("div", `verdict ${math.verdict}`);
    const label = el("div", "label");
    label.textContent = VERDICT_LABEL[math.verdict];
    verdict.appendChild(label);
    const reason = el("div", "reason");
    reason.textContent = math.verdictReason;
    verdict.appendChild(reason);
    body.appendChild(verdict);

    // The two numbers the user is actually here for.
    const offers = el("div", "offers");
    offers.appendChild(offerCard("Open at", money(math.openingOffer), "your first number"));
    offers.appendChild(
      offerCard(
        "Walk away above",
        money(math.maxOffer),
        math.velocity.multiplier >= 1.5
          ? "held down by slow turn"
          : math.velocity.multiplier <= 0.7
            ? "lifted by quick turn"
            : `${pct(a.appraisal.confidence)} confidence`,
      ),
    );
    body.appendChild(offers);

    body.appendChild(
      section("What it is", () => {
        const wrap = el("div");
        const p = el("p", "body-text");
        p.textContent = appraisal.identifiedAs;
        wrap.appendChild(p);
        const note = el("p", "note");
        note.textContent = `${labelCondition(appraisal.condition)} — ${appraisal.conditionNotes}`;
        wrap.appendChild(note);
        return wrap;
      }),
    );

    body.appendChild(
      section(`Resale on ${math.channel}`, () => {
        const wrap = el("div");
        const t = document.createElement("table");
        t.appendChild(row("Sells for (median)", money(math.adjustedComps.median)));
        t.appendChild(
          row("Range", `${money(math.adjustedComps.low)} – ${money(math.adjustedComps.high)}`, true),
        );
        t.appendChild(row("Platform fees", `−${money(math.feeBreakdown.platformPercent + math.feeBreakdown.platformFixed)}`, true));
        if (math.feeBreakdown.shipping > 0)
          t.appendChild(row("Ship + pack", `−${money(math.feeBreakdown.shipping + math.feeBreakdown.packaging)}`, true));
        t.appendChild(row("Returns allowance", `−${money(math.feeBreakdown.lossAllowance)}`, true));
        t.appendChild(row("Pickup", `−${money(math.feeBreakdown.transport)}`, true));
        t.appendChild(row("Net before you pay for it", money(math.netProceedsAtMedian - math.feeBreakdown.transport), false, true));
        t.appendChild(
          row(
            "Turns in",
            `~${math.velocity.daysToSell}d · ${math.velocity.turnsPerYear.toFixed(1)}x a year`,
            true,
          ),
        );
        wrap.appendChild(t);

        const basis = el("p", "note");
        basis.style.marginTop = "6px";
        basis.textContent = appraisal.comps.basis;
        wrap.appendChild(basis);
        return wrap;
      }),
    );

    if (math.atAsking) {
      body.appendChild(
        section("If you pay the asking price", () => {
          const t = document.createElement("table");
          t.appendChild(row("Buy at", money(math.atAsking!.buyPrice)));
          t.appendChild(signedRow("Profit", math.atAsking!.profit));
          t.appendChild(row("Return on cash", pct(math.atAsking!.roi), true));
          t.appendChild(
            row("Annualized", `${pct(math.atAsking!.annualizedRoi)} a year`, true),
          );
          if (math.downside)
            t.appendChild(signedRow("If it only fetches the low comp", math.downside.profit));
          return t;
        }),
      );
    }

    if (appraisal.risks.length > 0) {
      body.appendChild(
        section("Watch out for", () => {
          const wrap = el("div");
          for (const r of appraisal.risks) {
            const row = el("div", "risk");
            const sev = el("span", `sev ${r.severity}`);
            sev.textContent = r.severity;
            row.appendChild(sev);
            const detail = el("span");
            detail.textContent = r.detail;
            row.appendChild(detail);
            wrap.appendChild(row);
          }
          return wrap;
        }),
      );
    }

    if (appraisal.questionsForSeller.length > 0) {
      body.appendChild(
        section("Ask before you drive out", () => {
          const ul = document.createElement("ul");
          for (const q of appraisal.questionsForSeller) {
            const li = document.createElement("li");
            li.textContent = q;
            ul.appendChild(li);
          }
          return ul;
        }),
      );
    }

    body.appendChild(
      section("Making the offer", () => {
        const wrap = el("div");
        const p = el("p", "body-text");
        p.textContent = appraisal.negotiationNotes;
        wrap.appendChild(p);
        const stale = stalenessLeverage(a.listing.daysListed);
        if (stale) {
          const s = el("p", "note");
          s.style.marginTop = "6px";
          s.textContent = stale;
          wrap.appendChild(s);
        }
        return wrap;
      }),
    );

    const footer = el("footer");
    const watch = el("button", "ghost") as HTMLButtonElement;
    watch.textContent = this.watched ? "Tracking ✓" : "Track price";
    watch.disabled = this.watched;
    watch.addEventListener("click", () => this.handlers.onWatch(a));
    footer.appendChild(watch);

    const redo = el("button", "ghost") as HTMLButtonElement;
    redo.textContent = "Re-appraise";
    redo.addEventListener("click", () => this.handlers.onAnalyze(this.collectFields()));
    footer.appendChild(redo);

    footer.appendChild(el("div", "spacer"));
    const meta = el("span", "meta");
    meta.textContent =
      `${a.meta.imagesAnalyzed} photo(s)` +
      (a.meta.searches > 0 ? ` · ${a.meta.searches} search(es)` : " · no live comps");
    meta.title = `${a.meta.servedBy} · ${a.meta.inputTokens} in (${a.meta.cacheReadTokens} cached)`;
    footer.appendChild(meta);

    body.appendChild(footer);
  }
}

const VERDICT_LABEL: Record<string, string> = {
  strong: "Strong buy",
  workable: "Workable",
  thin: "Thin margin",
  pass: "Pass",
};

function labelCondition(c: string): string {
  return (
    {
      new: "New",
      like_new: "Like new",
      good: "Good",
      fair: "Fair",
      parts_or_repair: "For parts or repair",
      unclear: "Condition unclear",
    }[c] ?? c
  );
}

function offerCard(k: string, v: string, n: string): HTMLElement {
  const card = el("div", "offer");
  const kEl = el("div", "k");
  kEl.textContent = k;
  const vEl = el("div", "v");
  vEl.textContent = v;
  const nEl = el("div", "n");
  nEl.textContent = n;
  card.append(kEl, vEl, nEl);
  return card;
}

function section(title: string, build: () => HTMLElement): HTMLElement {
  const s = el("div", "section");
  const h = document.createElement("h3");
  h.textContent = title;
  s.appendChild(h);
  s.appendChild(build());
  return s;
}

function row(k: string, v: string, muted = false, total = false): HTMLTableRowElement {
  const tr = document.createElement("tr");
  if (total) tr.className = "total";
  const tdK = document.createElement("td");
  tdK.textContent = k;
  if (muted) tdK.className = "muted";
  const tdV = document.createElement("td");
  tdV.className = muted ? "n muted" : "n";
  tdV.textContent = v;
  tr.append(tdK, tdV);
  return tr;
}

function signedRow(k: string, amount: number): HTMLTableRowElement {
  const tr = row(k, `${amount < 0 ? "−" : ""}${money(Math.abs(amount))}`);
  (tr.lastChild as HTMLElement).classList.add(amount < 0 ? "neg" : "pos");
  return tr;
}

function textField(name: string, label: string, value: string, placeholder = ""): HTMLElement {
  const f = el("div", "field");
  const l = document.createElement("label");
  l.textContent = label;
  const i = document.createElement("input");
  i.dataset.field = name;
  i.value = value;
  i.placeholder = placeholder;
  f.append(l, i);
  return f;
}

function areaField(name: string, label: string, value: string): HTMLElement {
  const f = el("div", "field");
  const l = document.createElement("label");
  l.textContent = label;
  const t = document.createElement("textarea");
  t.dataset.field = name;
  t.value = value;
  f.append(l, t);
  return f;
}

function el(tag: string, className = ""): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
