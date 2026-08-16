function A(t=location.href){return/\/marketplace\/item\/\d+/.test(t)}function S(){let t={},e=[],n=B(t);n||e.push("title");let i=N(t);i===null&&e.push("askingPrice");let r=q(n,t);r||e.push("description");let o=V(t);o||e.push("location");let a=j(t);a||e.push("listedAgo");let p=X(t);return p.length===0&&e.push("imageUrls"),{id:location.href.match(/\/marketplace\/item\/(\d+)/)?.[1]??null,url:location.href.split("?")[0],title:n??"",askingPrice:i,description:r??"",location:o,listedAgo:a,daysListed:Y(a),imageUrls:p,extraction:{missing:e,edited:[],strategy:t}}}function B(t){let e=L("h1").map(r=>E(r)).find(r=>r.length>2&&!/^marketplace$/i.test(r));if(e)return t.title="h1",e;let n=y("og:title");if(n)return t.title="og:title",n.replace(/^marketplace\s*[-–|]\s*/i,"").trim();let i=document.title.replace(/\s*\|\s*facebook.*$/i,"").trim();return i?(t.title="document.title",i):null}var D=/^\$\s?([\d,]+(?:\.\d{2})?)$/;function N(t){for(let i of L("span, div, h2")){let r=E(i);if(/^free$/i.test(r)&&i.children.length===0)return t.askingPrice="standalone 'Free'",0;let o=r.match(D);if(o&&i.children.length===0)return t.askingPrice="standalone price element",Number(o[1].replace(/,/g,""))}let n=(y("og:description")??"").match(/\$\s?([\d,]+(?:\.\d{2})?)/);return n?(t.askingPrice="og:description",Number(n[1].replace(/,/g,""))):null}function q(t,e){let i=L('[dir="auto"]').filter(o=>o.querySelector('[dir="auto"]')===null).map(o=>E(o)).filter(o=>o.length>40).filter(o=>o!==t).filter(o=>!U(o)).sort((o,a)=>a.length-o.length)[0];if(i)return e.description='longest [dir="auto"] block',i;let r=y("og:description");return r&&r.length>40?(e.description="og:description",r):null}function U(t){return/(?:send seller a message|is this still available|marketplace is not|see more|message seller|location is approximate|log in or sign up|buy and sell|join or log in)/i.test(t)}function V(t){let e=document.body.innerText,n=e.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3},\s*[A-Z]{2})\b/);if(n)return t.location="city, ST pattern",n[1];let i=e.match(/Listed .{0,40}? in ([^\n]{2,60})/i);return i?(t.location="'Listed ... in X'",i[1].trim()):null}function j(t){let e=document.body.innerText,n=e.match(/Listed\s+(?:about\s+)?((?:a|an|\d+)\s+\w+)\s+ago/i);if(n)return t.listedAgo="'Listed X ago'",`${n[1]} ago`;if(/just listed/i.test(e))return t.listedAgo="'Just listed'","just listed";let i=e.match(/Listed on\s+([^\n]{3,30})/i);return i?(t.listedAgo="'Listed on X'",`on ${i[1].trim()}`):null}function Y(t){if(!t)return null;if(/just listed/i.test(t))return 0;let e=t.match(/(a|an|\d+)\s+(minute|hour|day|week|month|year)s?/i);if(!e)return null;let n=/^(a|an)$/i.test(e[1])?1:Number(e[1]),i=e[2].toLowerCase(),r={minute:1/1440,hour:1/24,day:1,week:7,month:30,year:365};return Math.round(n*r[i])}function X(t){let e=new Set,n=[];for(let r of Array.from(document.images)){if(n.length>=3)break;let o=r.currentSrc||r.src;if(!o||!/fbcdn|scontent/.test(o)||r.naturalWidth<200||r.naturalHeight<200)continue;let a=o.split("?")[0];e.has(a)||(e.add(a),n.push(o))}if(n.length>0)return t.imageUrls=`${n.length} fbcdn image(s) >=200px`,n;let i=y("og:image");return i?(t.imageUrls="og:image",[i]):[]}function y(t){return(document.querySelector(`meta[property="${t}"]`)??document.querySelector(`meta[name="${t}"]`))?.content?.trim()||null}function L(t){return Array.from(document.querySelectorAll(t)).filter(e=>e.closest('[role="banner"], [role="navigation"], nav, header')||e.closest("#mkt-copilot-root")?!1:e.offsetParent!==null||e.getClientRects().length>0)}function E(t){return(t.innerText??t.textContent??"").trim()}var P=`
:host {
  --bg: #ffffff;
  --fg: #16181c;
  --muted: #65686c;
  --line: #dfe1e5;
  --accent: #1b74e4;
  --strong: #1a7f4b;
  --strong-bg: #e8f6ee;
  --workable: #2c6ecb;
  --workable-bg: #e9f1fd;
  --thin: #96650a;
  --thin-bg: #fdf3e0;
  --pass: #b3261e;
  --pass-bg: #fdeceb;
  all: initial;
}
@media (prefers-color-scheme: dark) {
  :host {
    --bg: #242526;
    --fg: #e4e6eb;
    --muted: #b0b3b8;
    --line: #3a3b3c;
    --accent: #4a9eff;
    --strong: #6fd39b;
    --strong-bg: #17301f;
    --workable: #7cb2ff;
    --workable-bg: #16233a;
    --thin: #e6b45c;
    --thin-bg: #33270f;
    --pass: #ef7c74;
    --pass-bg: #38191a;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: inherit; }

.wrap {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 380px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,.18);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  z-index: 2147483000;
  overflow: hidden;
}
.wrap.collapsed { width: auto; }

header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--line);
  cursor: pointer; user-select: none;
}
header .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex: none; }
header h2 { font-size: 13px; font-weight: 650; letter-spacing: .01em; }
header .spacer { flex: 1; }
header button { background: none; border: 0; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 4px; }
.collapsed header { border-bottom: 0; }
.collapsed .body { display: none; }

.body { overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }

button.primary {
  width: 100%; padding: 9px 12px; border: 0; border-radius: 8px;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
button.primary:disabled { opacity: .55; cursor: default; }
button.ghost {
  padding: 6px 10px; border: 1px solid var(--line); border-radius: 7px;
  background: transparent; color: var(--fg); font-size: 12.5px; cursor: pointer;
}

.verdict { border-radius: 9px; padding: 10px 12px; border: 1px solid transparent; }
.verdict .label { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
.verdict .reason { margin-top: 4px; font-size: 13px; }
.verdict.strong   { background: var(--strong-bg);   border-color: var(--strong);   }
.verdict.strong .label { color: var(--strong); }
.verdict.workable { background: var(--workable-bg); border-color: var(--workable); }
.verdict.workable .label { color: var(--workable); }
.verdict.thin     { background: var(--thin-bg);     border-color: var(--thin);     }
.verdict.thin .label { color: var(--thin); }
.verdict.pass     { background: var(--pass-bg);     border-color: var(--pass);     }
.verdict.pass .label { color: var(--pass); }

.offers { display: flex; gap: 10px; }
.offer { flex: 1; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; }
.offer .k { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.offer .v { font-size: 22px; font-weight: 680; margin-top: 2px; font-variant-numeric: tabular-nums; }
.offer .n { font-size: 11.5px; color: var(--muted); margin-top: 2px; }

h3 { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.section { border-top: 1px solid var(--line); padding-top: 10px; }
.section:first-child { border-top: 0; padding-top: 0; }

table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
td { padding: 3px 0; font-size: 13px; vertical-align: top; }
td.n { text-align: right; white-space: nowrap; }
td.muted { color: var(--muted); }
tr.total td { border-top: 1px solid var(--line); padding-top: 6px; font-weight: 640; }
.neg { color: var(--pass); }
.pos { color: var(--strong); }

ul { list-style: none; display: flex; flex-direction: column; gap: 6px; }
li { font-size: 13px; padding-left: 14px; position: relative; }
li::before { content: "\u2022"; position: absolute; left: 2px; color: var(--muted); }

.risk { display: flex; gap: 7px; align-items: baseline; font-size: 13px; padding: 5px 0; }
.risk .sev { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; flex: none; letter-spacing: .04em; }
.risk .sev.high { background: var(--pass-bg); color: var(--pass); }
.risk .sev.medium { background: var(--thin-bg); color: var(--thin); }
.risk .sev.low { background: var(--line); color: var(--muted); }

p.body-text { font-size: 13px; }
p.note { font-size: 12px; color: var(--muted); }

.fields { display: flex; flex-direction: column; gap: 7px; }
.field { display: flex; flex-direction: column; gap: 3px; }
.field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.field input, .field textarea {
  border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px;
  background: var(--bg); color: var(--fg); font-size: 13px; font-family: inherit; width: 100%;
}
.field textarea { resize: vertical; min-height: 54px; }

.warn { background: var(--thin-bg); border: 1px solid var(--thin); color: var(--thin); border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
.error { background: var(--pass-bg); border: 1px solid var(--pass); color: var(--pass); border-radius: 8px; padding: 8px 10px; font-size: 13px; }

.spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; vertical-align: -2px; margin-right: 7px; }
@keyframes spin { to { transform: rotate(360deg); } }

footer { display: flex; gap: 8px; align-items: center; }
footer .spacer { flex: 1; }
.meta { font-size: 11px; color: var(--muted); }
`;function R(t){return t===null?null:t>=45?`Sitting ${t} days. At this point the seller is usually more motivated than the price suggests \u2014 lead with a firm cash-today offer.`:t>=21?`Sitting ${t} days. Long enough that a lowball won't offend; mention you can pick up immediately.`:t>=7?`Listed ${t} days ago. Mild leverage \u2014 worth one offer below asking before meeting in the middle.`:`Listed ${t} days ago. Fresh listing, so expect competition and less flexibility on price.`}var F="mkt-copilot-root",C=class{constructor(e,n){this.handlers=n;this.listing=e,document.getElementById(F)?.remove(),this.host=document.createElement("div"),this.host.id=F,document.documentElement.appendChild(this.host),this.root=this.host.attachShadow({mode:"open"});let i=document.createElement("style");i.textContent=P,this.root.appendChild(i),this.render()}host;root;state={phase:"idle"};collapsed=!1;listing;watched=!1;setListing(e){this.listing=e,this.state={phase:"idle"},this.watched=!1,this.render()}setLoading(){this.state={phase:"loading"},this.render()}setAnalysis(e){this.state={phase:"done",analysis:e},this.render()}setError(e,n=!1){this.state={phase:"error",message:e,canOpenOptions:n},this.render()}setWatched(e){this.watched=e,this.render()}destroy(){this.host.remove()}render(){this.root.querySelector(".wrap")?.remove();let e=s("div",`wrap${this.collapsed?" collapsed":""}`);e.appendChild(this.renderHeader()),this.collapsed||e.appendChild(this.renderBody()),this.root.appendChild(e)}renderHeader(){let e=s("header");e.appendChild(s("span","dot"));let n=s("h2");n.textContent="Marketplace Copilot",e.appendChild(n),e.appendChild(s("div","spacer"));let i=s("button");return i.textContent=this.collapsed?"\u25B2":"\u25BC",i.title=this.collapsed?"Expand":"Collapse",e.appendChild(i),e.addEventListener("click",()=>{this.collapsed=!this.collapsed,this.render()}),e}renderBody(){let e=s("div","body");switch(this.state.phase){case"idle":this.renderIdle(e);break;case"loading":this.renderLoading(e);break;case"error":this.renderError(e,this.state.message,this.state.canOpenOptions);break;case"done":this.renderAnalysis(e,this.state.analysis);break}return e}renderIdle(e){let{missing:n}=this.listing.extraction;if(n.length>0){let o=s("div","warn");o.textContent=`Couldn't read ${n.join(", ")} off the page. Fill in what you can \u2014 the appraisal is only as good as what goes in.`,e.appendChild(o)}e.appendChild(this.renderFields());let i=s("button","primary");i.textContent="Appraise this listing",i.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),e.appendChild(i);let r=s("p","note");r.textContent=`${this.listing.imageUrls.length} photo(s) will be sent with the listing text.`,e.appendChild(r)}renderFields(){let e=s("div","fields");return e.appendChild(I("title","Item",this.listing.title,"What is it?")),e.appendChild(I("askingPrice","Asking price ($)",this.listing.askingPrice===null?"":String(this.listing.askingPrice),"0")),e.appendChild(J("description","Seller's description",this.listing.description)),e}collectFields(){let e=b=>this.root.querySelector(`[data-field="${b}"]`)?.value??"",n=e("title").trim(),i=e("askingPrice").trim(),r=e("description").trim(),o=[];n!==this.listing.title&&o.push("title"),r!==this.listing.description&&o.push("description");let a=i===""?null:Number(i.replace(/[^\d.]/g,"")),p=a!==null&&Number.isFinite(a)?a:null;return p!==this.listing.askingPrice&&o.push("askingPrice"),{...this.listing,title:n,description:r,askingPrice:p,extraction:{...this.listing.extraction,edited:o}}}renderLoading(e){let n=s("p","body-text");n.appendChild(s("span","spinner")),n.append("Appraising \u2014 reading the photos and pricing comps."),e.appendChild(n)}renderError(e,n,i){let r=s("div","error");r.textContent=n,e.appendChild(r);let o=s("footer"),a=s("button","ghost");if(a.textContent="Retry",a.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),o.appendChild(a),i){let p=s("button","ghost");p.textContent="Open settings",p.addEventListener("click",()=>this.handlers.onOpenOptions()),o.appendChild(p)}e.appendChild(o)}renderAnalysis(e,n){let{appraisal:i,math:r}=n,o=s("div",`verdict ${r.verdict}`),a=s("div","label");a.textContent=Z[r.verdict],o.appendChild(a);let p=s("div","reason");p.textContent=r.verdictReason,o.appendChild(p),e.appendChild(o);let b=s("div","offers");b.appendChild(H("Open at",h(r.openingOffer),"your first number")),b.appendChild(H("Walk away above",h(r.maxOffer),r.velocity.multiplier>=1.5?"held down by slow turn":r.velocity.multiplier<=.7?"lifted by quick turn":`${$(n.appraisal.confidence)} confidence`)),e.appendChild(b),e.appendChild(m("What it is",()=>{let l=s("div"),d=s("p","body-text");d.textContent=i.identifiedAs,l.appendChild(d);let c=s("p","note");return c.textContent=`${G(i.condition)} \u2014 ${i.conditionNotes}`,l.appendChild(c),l})),e.appendChild(m(`Resale on ${r.channel}`,()=>{let l=s("div"),d=document.createElement("table");d.appendChild(u("Sells for (median)",h(r.adjustedComps.median))),d.appendChild(u("Range",`${h(r.adjustedComps.low)} \u2013 ${h(r.adjustedComps.high)}`,!0)),d.appendChild(u("Platform fees",`\u2212${h(r.feeBreakdown.platformPercent+r.feeBreakdown.platformFixed)}`,!0)),r.feeBreakdown.shipping>0&&d.appendChild(u("Ship + pack",`\u2212${h(r.feeBreakdown.shipping+r.feeBreakdown.packaging)}`,!0)),d.appendChild(u("Returns allowance",`\u2212${h(r.feeBreakdown.lossAllowance)}`,!0)),d.appendChild(u("Pickup",`\u2212${h(r.feeBreakdown.transport)}`,!0)),d.appendChild(u("Net before you pay for it",h(r.netProceedsAtMedian-r.feeBreakdown.transport),!1,!0)),d.appendChild(u("Turns in",`~${r.velocity.daysToSell}d \xB7 ${r.velocity.turnsPerYear.toFixed(1)}x a year`,!0)),l.appendChild(d);let c=s("p","note");return c.style.marginTop="6px",c.textContent=i.comps.basis,l.appendChild(c),l})),r.atAsking&&e.appendChild(m("If you pay the asking price",()=>{let l=document.createElement("table");return l.appendChild(u("Buy at",h(r.atAsking.buyPrice))),l.appendChild(z("Profit",r.atAsking.profit)),l.appendChild(u("Return on cash",$(r.atAsking.roi),!0)),l.appendChild(u("Annualized",`${$(r.atAsking.annualizedRoi)} a year`,!0)),r.downside&&l.appendChild(z("If it only fetches the low comp",r.downside.profit)),l})),i.risks.length>0&&e.appendChild(m("Watch out for",()=>{let l=s("div");for(let d of i.risks){let c=s("div","risk"),f=s("span",`sev ${d.severity}`);f.textContent=d.severity,c.appendChild(f);let M=s("span");M.textContent=d.detail,c.appendChild(M),l.appendChild(c)}return l})),i.questionsForSeller.length>0&&e.appendChild(m("Ask before you drive out",()=>{let l=document.createElement("ul");for(let d of i.questionsForSeller){let c=document.createElement("li");c.textContent=d,l.appendChild(c)}return l})),e.appendChild(m("Making the offer",()=>{let l=s("div"),d=s("p","body-text");d.textContent=i.negotiationNotes,l.appendChild(d);let c=R(n.listing.daysListed);if(c){let f=s("p","note");f.style.marginTop="6px",f.textContent=c,l.appendChild(f)}return l}));let x=s("footer"),v=s("button","ghost");v.textContent=this.watched?"Tracking \u2713":"Track price",v.disabled=this.watched,v.addEventListener("click",()=>this.handlers.onWatch(n)),x.appendChild(v);let k=s("button","ghost");k.textContent="Re-appraise",k.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),x.appendChild(k),x.appendChild(s("div","spacer"));let w=s("span","meta");w.textContent=`${n.meta.imagesAnalyzed} photo(s)`+(n.meta.searches>0?` \xB7 ${n.meta.searches} search(es)`:" \xB7 no live comps"),w.title=`${n.meta.servedBy} \xB7 ${n.meta.inputTokens} in (${n.meta.cacheReadTokens} cached)`,x.appendChild(w),e.appendChild(x)}},Z={strong:"Strong buy",workable:"Workable",thin:"Thin margin",pass:"Pass"};function G(t){return{new:"New",like_new:"Like new",good:"Good",fair:"Fair",parts_or_repair:"For parts or repair",unclear:"Condition unclear"}[t]??t}function H(t,e,n){let i=s("div","offer"),r=s("div","k");r.textContent=t;let o=s("div","v");o.textContent=e;let a=s("div","n");return a.textContent=n,i.append(r,o,a),i}function m(t,e){let n=s("div","section"),i=document.createElement("h3");return i.textContent=t,n.appendChild(i),n.appendChild(e()),n}function u(t,e,n=!1,i=!1){let r=document.createElement("tr");i&&(r.className="total");let o=document.createElement("td");o.textContent=t,n&&(o.className="muted");let a=document.createElement("td");return a.className=n?"n muted":"n",a.textContent=e,r.append(o,a),r}function z(t,e){let n=u(t,`${e<0?"\u2212":""}${h(Math.abs(e))}`);return n.lastChild.classList.add(e<0?"neg":"pos"),n}function I(t,e,n,i=""){let r=s("div","field"),o=document.createElement("label");o.textContent=e;let a=document.createElement("input");return a.dataset.field=t,a.value=n,a.placeholder=i,r.append(o,a),r}function J(t,e,n){let i=s("div","field"),r=document.createElement("label");r.textContent=e;let o=document.createElement("textarea");return o.dataset.field=t,o.value=n,i.append(r,o),i}function s(t,e=""){let n=document.createElement(t);return e&&(n.className=e),n}function h(t){return`$${Math.round(t).toLocaleString("en-US")}`}function $(t){return`${Math.round(t*100)}%`}var g=null,_="";function W(t){return chrome.runtime.sendMessage(t)}function K(t){let e={onAnalyze:async n=>{g?.setLoading();let i=await W({kind:"analyze",listing:n});i.ok?g?.setAnalysis(i.data):g?.setError(i.error,i.kind==="no_api_key")},onWatch:async n=>{(await W({kind:"watch",listing:n.listing,analysis:n})).ok&&g?.setWatched(!0)},onOpenOptions:()=>{chrome.runtime.sendMessage({kind:"openOptions"})}};g?g.setListing(t):g=new C(t,e)}function O(t=0){let e=S();if(e.title&&(e.askingPrice!==null||e.description)||t>=10){K(e);return}setTimeout(()=>O(t+1),400)}function T(){let t=location.href.split("?")[0];t!==_&&(_=t,A(t)?O():(g?.destroy(),g=null))}var Q=history.pushState;history.pushState=function(...t){let e=Q.apply(this,t);return window.dispatchEvent(new Event("mkt-copilot:navigate")),e};window.addEventListener("popstate",T);window.addEventListener("mkt-copilot:navigate",T);T();
