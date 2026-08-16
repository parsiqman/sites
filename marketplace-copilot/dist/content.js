function M(t=location.href){return/\/marketplace\/item\/\d+/.test(t)}function T(){let t={},e=[],n=O(t);n||e.push("title");let r=D(t);r===null&&e.push("askingPrice");let i=q(n,t);i||e.push("description");let o=j(t);o||e.push("location");let a=X(t);a||e.push("listedAgo");let p=Z(t);return p.length===0&&e.push("imageUrls"),{id:location.href.match(/\/marketplace\/item\/(\d+)/)?.[1]??null,url:location.href.split("?")[0],title:n??"",askingPrice:r,description:i??"",location:o,listedAgo:a,daysListed:V(a),imageUrls:p,extraction:{missing:e,edited:[],strategy:t}}}function O(t){let e=E("h1").map(i=>L(i)).find(i=>i.length>2&&!/^marketplace$/i.test(i));if(e)return t.title="h1",e;let n=C("og:title");if(n)return t.title="og:title",n.replace(/^marketplace\s*[-–|]\s*/i,"").trim();let r=document.title.replace(/\s*\|\s*facebook.*$/i,"").trim();return r?(t.title="document.title",r):null}var _=/^\$\s?([\d,]+(?:\.\d{2})?)$/;function D(t){for(let r of E("span, div, h2")){let i=L(r);if(/^free$/i.test(i)&&r.children.length===0)return t.askingPrice="standalone 'Free'",0;let o=i.match(_);if(o&&r.children.length===0)return t.askingPrice="standalone price element",Number(o[1].replace(/,/g,""))}let n=(C("og:description")??"").match(/\$\s?([\d,]+(?:\.\d{2})?)/);return n?(t.askingPrice="og:description",Number(n[1].replace(/,/g,""))):null}function q(t,e){let r=E('[dir="auto"]').filter(o=>o.querySelector('[dir="auto"]')===null).map(o=>L(o)).filter(o=>o.length>40).filter(o=>o!==t).filter(o=>!U(o)).sort((o,a)=>a.length-o.length)[0];if(r)return e.description='longest [dir="auto"] block',r;let i=C("og:description");return i&&i.length>40?(e.description="og:description",i):null}function U(t){return/(?:send seller a message|is this still available|marketplace is not|see more|message seller|location is approximate|log in or sign up|buy and sell|join or log in)/i.test(t)}function j(t){let e=document.body.innerText,n=e.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3},\s*[A-Z]{2})\b/);if(n)return t.location="city, ST pattern",n[1];let r=e.match(/Listed .{0,40}? in ([^\n]{2,60})/i);return r?(t.location="'Listed ... in X'",r[1].trim()):null}function X(t){let e=document.body.innerText,n=e.match(/Listed\s+(?:about\s+)?((?:a|an|\d+)\s+\w+)\s+ago/i);if(n)return t.listedAgo="'Listed X ago'",`${n[1]} ago`;if(/just listed/i.test(e))return t.listedAgo="'Just listed'","just listed";let r=e.match(/Listed on\s+([^\n]{3,30})/i);return r?(t.listedAgo="'Listed on X'",`on ${r[1].trim()}`):null}function V(t){if(!t)return null;if(/just listed/i.test(t))return 0;let e=t.match(/(a|an|\d+)\s+(minute|hour|day|week|month|year)s?/i);if(!e)return null;let n=/^(a|an)$/i.test(e[1])?1:Number(e[1]),r=e[2].toLowerCase(),i={minute:1/1440,hour:1/24,day:1,week:7,month:30,year:365};return Math.round(n*i[r])}function Z(t){let e=new Set,n=[];for(let i of Array.from(document.images)){if(n.length>=3)break;let o=i.currentSrc||i.src;if(!o||!/fbcdn|scontent/.test(o)||i.naturalWidth<200||i.naturalHeight<200)continue;let a=o.split("?")[0];e.has(a)||(e.add(a),n.push(o))}if(n.length>0)return t.imageUrls=`${n.length} fbcdn image(s) >=200px`,n;let r=C("og:image");return r?(t.imageUrls="og:image",[r]):[]}function C(t){return(document.querySelector(`meta[property="${t}"]`)??document.querySelector(`meta[name="${t}"]`))?.content?.trim()||null}function E(t){return Array.from(document.querySelectorAll(t)).filter(e=>e.closest('[role="banner"], [role="navigation"], nav, header')||e.closest("#mkt-copilot-root")?!1:e.offsetParent!==null||e.getClientRects().length>0)}function L(t){return(t.innerText??t.textContent??"").trim()}var S=`
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
`;function P(t){return t===null?null:t>=45?`Sitting ${t} days. At this point the seller is usually more motivated than the price suggests \u2014 lead with a firm cash-today offer.`:t>=21?`Sitting ${t} days. Long enough that a lowball won't offend; mention you can pick up immediately.`:t>=7?`Listed ${t} days ago. Mild leverage \u2014 worth one offer below asking before meeting in the middle.`:`Listed ${t} days ago. Fresh listing, so expect competition and less flexibility on price.`}var R="mkt-copilot-root",k=class{constructor(e,n){this.handlers=n;this.listing=e,document.getElementById(R)?.remove(),this.host=document.createElement("div"),this.host.id=R,document.documentElement.appendChild(this.host),this.root=this.host.attachShadow({mode:"open"});let r=document.createElement("style");r.textContent=S,this.root.appendChild(r),this.render()}host;root;state={phase:"idle"};collapsed=!1;listing;watched=!1;setListing(e){this.listing=e,this.state={phase:"idle"},this.watched=!1,this.render()}setLoading(){this.state={phase:"loading"},this.render()}setAnalysis(e){this.state={phase:"done",analysis:e},this.render()}setError(e,n=!1){this.state={phase:"error",message:e,canOpenOptions:n},this.render()}setWatched(e){this.watched=e,this.render()}destroy(){this.host.remove()}render(){this.root.querySelector(".wrap")?.remove();let e=s("div",`wrap${this.collapsed?" collapsed":""}`);e.appendChild(this.renderHeader()),this.collapsed||e.appendChild(this.renderBody()),this.root.appendChild(e)}renderHeader(){let e=s("header");e.appendChild(s("span","dot"));let n=s("h2");n.textContent="Marketplace Copilot",e.appendChild(n),e.appendChild(s("div","spacer"));let r=s("button");return r.textContent=this.collapsed?"\u25B2":"\u25BC",r.title=this.collapsed?"Expand":"Collapse",e.appendChild(r),e.addEventListener("click",()=>{this.collapsed=!this.collapsed,this.render()}),e}renderBody(){let e=s("div","body");switch(this.state.phase){case"idle":this.renderIdle(e);break;case"loading":this.renderLoading(e);break;case"error":this.renderError(e,this.state.message,this.state.canOpenOptions);break;case"done":this.renderAnalysis(e,this.state.analysis);break}return e}renderIdle(e){let{missing:n}=this.listing.extraction;if(n.length>0){let o=s("div","warn");o.textContent=`Couldn't read ${n.join(", ")} off the page. Fill in what you can \u2014 the appraisal is only as good as what goes in.`,e.appendChild(o)}e.appendChild(this.renderFields());let r=s("button","primary");r.textContent="Appraise this listing",r.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),e.appendChild(r);let i=s("p","note");i.textContent=`${this.listing.imageUrls.length} photo(s) will be sent with the listing text.`,e.appendChild(i)}renderFields(){let e=s("div","fields");return e.appendChild(z("title","Item",this.listing.title,"What is it?")),e.appendChild(z("askingPrice","Asking price ($)",this.listing.askingPrice===null?"":String(this.listing.askingPrice),"0")),e.appendChild(K("description","Seller's description",this.listing.description)),e}collectFields(){let e=b=>this.root.querySelector(`[data-field="${b}"]`)?.value??"",n=e("title").trim(),r=e("askingPrice").trim(),i=e("description").trim(),o=[];n!==this.listing.title&&o.push("title"),i!==this.listing.description&&o.push("description");let a=r===""?null:Number(r.replace(/[^\d.]/g,"")),p=a!==null&&Number.isFinite(a)?a:null;return p!==this.listing.askingPrice&&o.push("askingPrice"),{...this.listing,title:n,description:i,askingPrice:p,extraction:{...this.listing.extraction,edited:o}}}renderLoading(e){let n=s("p","body-text");n.appendChild(s("span","spinner")),n.append("Appraising \u2014 reading the photos and pricing comps."),e.appendChild(n)}renderError(e,n,r){let i=s("div","error");i.textContent=n,e.appendChild(i);let o=s("footer"),a=s("button","ghost");if(a.textContent="Retry",a.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),o.appendChild(a),r){let p=s("button","ghost");p.textContent="Open settings",p.addEventListener("click",()=>this.handlers.onOpenOptions()),o.appendChild(p)}e.appendChild(o)}renderAnalysis(e,n){let{appraisal:r,math:i}=n,o=s("div",`verdict ${i.verdict}`),a=s("div","label");a.textContent=G[i.verdict],o.appendChild(a);let p=s("div","reason");p.textContent=i.verdictReason,o.appendChild(p),e.appendChild(o);let b=s("div","offers");b.appendChild(F("Open at",u(i.openingOffer),"your first number")),b.appendChild(F("Walk away above",u(i.maxOffer),`${I(n.appraisal.confidence)} confidence`)),e.appendChild(b),e.appendChild(m("What it is",()=>{let l=s("div"),d=s("p","body-text");d.textContent=r.identifiedAs,l.appendChild(d);let c=s("p","note");return c.textContent=`${J(r.condition)} \u2014 ${r.conditionNotes}`,l.appendChild(c),l})),e.appendChild(m(`Resale on ${i.channel}`,()=>{let l=s("div"),d=document.createElement("table");d.appendChild(h("Sells for (median)",u(i.adjustedComps.median))),d.appendChild(h("Range",`${u(i.adjustedComps.low)} \u2013 ${u(i.adjustedComps.high)}`,!0)),d.appendChild(h("Platform fees",`\u2212${u(i.feeBreakdown.platformPercent+i.feeBreakdown.platformFixed)}`,!0)),i.feeBreakdown.shipping>0&&d.appendChild(h("Ship + pack",`\u2212${u(i.feeBreakdown.shipping+i.feeBreakdown.packaging)}`,!0)),d.appendChild(h("Returns allowance",`\u2212${u(i.feeBreakdown.lossAllowance)}`,!0)),d.appendChild(h("Pickup",`\u2212${u(i.feeBreakdown.transport)}`,!0)),d.appendChild(h("Net before you pay for it",u(i.netProceedsAtMedian-i.feeBreakdown.transport),!1,!0)),l.appendChild(d);let c=s("p","note");return c.style.marginTop="6px",c.textContent=r.comps.basis,l.appendChild(c),l})),i.atAsking&&e.appendChild(m("If you pay the asking price",()=>{let l=document.createElement("table");return l.appendChild(h("Buy at",u(i.atAsking.buyPrice))),l.appendChild(H("Profit",i.atAsking.profit)),l.appendChild(h("Return on cash",I(i.atAsking.roi),!0)),i.downside&&l.appendChild(H("If it only fetches the low comp",i.downside.profit)),l})),r.risks.length>0&&e.appendChild(m("Watch out for",()=>{let l=s("div");for(let d of r.risks){let c=s("div","risk"),f=s("span",`sev ${d.severity}`);f.textContent=d.severity,c.appendChild(f);let A=s("span");A.textContent=d.detail,c.appendChild(A),l.appendChild(c)}return l})),r.questionsForSeller.length>0&&e.appendChild(m("Ask before you drive out",()=>{let l=document.createElement("ul");for(let d of r.questionsForSeller){let c=document.createElement("li");c.textContent=d,l.appendChild(c)}return l})),e.appendChild(m("Making the offer",()=>{let l=s("div"),d=s("p","body-text");d.textContent=r.negotiationNotes,l.appendChild(d);let c=P(n.listing.daysListed);if(c){let f=s("p","note");f.style.marginTop="6px",f.textContent=c,l.appendChild(f)}return l}));let x=s("footer"),v=s("button","ghost");v.textContent=this.watched?"Tracking \u2713":"Track price",v.disabled=this.watched,v.addEventListener("click",()=>this.handlers.onWatch(n)),x.appendChild(v);let y=s("button","ghost");y.textContent="Re-appraise",y.addEventListener("click",()=>this.handlers.onAnalyze(this.collectFields())),x.appendChild(y),x.appendChild(s("div","spacer"));let w=s("span","meta");w.textContent=`${n.meta.imagesAnalyzed} photo(s)`+(n.meta.searches>0?` \xB7 ${n.meta.searches} search(es)`:" \xB7 no live comps"),w.title=`${n.meta.servedBy} \xB7 ${n.meta.inputTokens} in (${n.meta.cacheReadTokens} cached)`,x.appendChild(w),e.appendChild(x)}},G={strong:"Strong buy",workable:"Workable",thin:"Thin margin",pass:"Pass"};function J(t){return{new:"New",like_new:"Like new",good:"Good",fair:"Fair",parts_or_repair:"For parts or repair",unclear:"Condition unclear"}[t]??t}function F(t,e,n){let r=s("div","offer"),i=s("div","k");i.textContent=t;let o=s("div","v");o.textContent=e;let a=s("div","n");return a.textContent=n,r.append(i,o,a),r}function m(t,e){let n=s("div","section"),r=document.createElement("h3");return r.textContent=t,n.appendChild(r),n.appendChild(e()),n}function h(t,e,n=!1,r=!1){let i=document.createElement("tr");r&&(i.className="total");let o=document.createElement("td");o.textContent=t,n&&(o.className="muted");let a=document.createElement("td");return a.className=n?"n muted":"n",a.textContent=e,i.append(o,a),i}function H(t,e){let n=h(t,`${e<0?"\u2212":""}${u(Math.abs(e))}`);return n.lastChild.classList.add(e<0?"neg":"pos"),n}function z(t,e,n,r=""){let i=s("div","field"),o=document.createElement("label");o.textContent=e;let a=document.createElement("input");return a.dataset.field=t,a.value=n,a.placeholder=r,i.append(o,a),i}function K(t,e,n){let r=s("div","field"),i=document.createElement("label");i.textContent=e;let o=document.createElement("textarea");return o.dataset.field=t,o.value=n,r.append(i,o),r}function s(t,e=""){let n=document.createElement(t);return e&&(n.className=e),n}function u(t){return`$${Math.round(t).toLocaleString("en-US")}`}function I(t){return`${Math.round(t*100)}%`}var g=null,W="";function B(t){return chrome.runtime.sendMessage(t)}function Y(t){let e={onAnalyze:async n=>{g?.setLoading();let r=await B({kind:"analyze",listing:n});r.ok?g?.setAnalysis(r.data):g?.setError(r.error,r.kind==="no_api_key")},onWatch:async n=>{(await B({kind:"watch",listing:n.listing,analysis:n})).ok&&g?.setWatched(!0)},onOpenOptions:()=>{chrome.runtime.sendMessage({kind:"openOptions"})}};g?g.setListing(t):g=new k(t,e)}function N(t=0){let e=T();if(e.title&&(e.askingPrice!==null||e.description)||t>=10){Y(e);return}setTimeout(()=>N(t+1),400)}function $(){let t=location.href.split("?")[0];t!==W&&(W=t,M(t)?N():(g?.destroy(),g=null))}var Q=history.pushState;history.pushState=function(...t){let e=Q.apply(this,t);return window.dispatchEvent(new Event("mkt-copilot:navigate")),e};window.addEventListener("popstate",$);window.addEventListener("mkt-copilot:navigate",$);$();
