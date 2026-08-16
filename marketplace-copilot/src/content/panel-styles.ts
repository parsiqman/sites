/** Styles for the injected panel. Scoped by the shadow root, so no resets fight Facebook's. */
export const PANEL_CSS = `
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
li::before { content: "•"; position: absolute; left: 2px; color: var(--muted); }

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
`;
