import { getConfig, saveConfig, type StoredConfig } from "../lib/storage.ts";

const TEXT_FIELDS = ["apiKey", "model", "effort", "channel"] as const;
const BOOL_FIELDS = ["liveComps"] as const;

const NUMBER_FIELDS = [
  "targetRoi",
  "transportCost",
  "shippingCost",
  "packagingCost",
  "lossAllowance",
  "openingOfferFactor",
] as const;

function input(id: string): HTMLInputElement | HTMLSelectElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing field: ${id}`);
  return el as HTMLInputElement | HTMLSelectElement;
}

async function load() {
  const config = await getConfig();
  for (const key of TEXT_FIELDS) input(key).value = String(config[key] ?? "");
  for (const key of NUMBER_FIELDS) input(key).value = String(config[key] ?? 0);
  for (const key of BOOL_FIELDS) input(key).value = config[key] ? "true" : "false";
}

async function save() {
  const patch: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) patch[key] = input(key).value.trim();
  for (const key of NUMBER_FIELDS) {
    const n = Number(input(key).value);
    if (Number.isFinite(n)) patch[key] = n;
  }
  for (const key of BOOL_FIELDS) patch[key] = input(key).value === "true";

  await saveConfig(patch as Partial<StoredConfig>);

  const status = document.getElementById("status")!;
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 2000);
}

document.getElementById("save")!.addEventListener("click", () => void save());
void load();
