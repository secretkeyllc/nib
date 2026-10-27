import { ApiClient } from "../lib/api.js";
import { resolveSession } from "../lib/config.js";
import { style, out, table, credits, bar, formatNumber, glyph } from "../lib/ui.js";
import { NibError, type Entitlement } from "../lib/types.js";

export interface StatusOptions {
  json?: boolean;
}

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  const session = await resolveSession();
  const client = new ApiClient({ apiUrl: session.apiUrl, token: session.token });
  const entitlement = await client.getEntitlement();

  if (options.json) {
    out(JSON.stringify(entitlement, null, 2));
    return;
  }

  render(entitlement);
}

export function render(entitlement: Entitlement): void {
  const { plan, usage, models } = entitlement;
  const remaining = Math.max(0, plan.monthly_credits - usage.credits_used);
  const percent = plan.monthly_credits > 0 ? Math.round((usage.credits_used / plan.monthly_credits) * 100) : 0;

  out();
  out(`  ${style.bold(plan.name)}${plan.promotional ? style.dim(`  promotional ${formatMoney(plan.effective_price_usd)}/mo`) : ""}`);
  out();
  out(`  ${bar(usage.credits_used, plan.monthly_credits)}  ${style.bold(`${percent}%`)}`);
  out(`  ${style.dim("Used")} ${credits(usage.credits_used)}`);
  out(`  ${style.dim("Left")} ${credits(remaining)}`);
  if (usage.topup_credits_remaining > 0) {
    out(`  ${style.dim("Top-up")} ${credits(usage.topup_credits_remaining)}`);
  }
  out();

  const rows: Array<[string, string]> = [
    ["Plan", plan.name],
    ["Price", plan.promotional ? `${formatMoney(plan.effective_price_usd)}/mo ${style.dim(`(list ${formatMoney(plan.price_usd)})`)}` : `${formatMoney(plan.price_usd)}/mo`],
    ["Monthly credits", formatNumber(plan.monthly_credits)],
  ];
  if (plan.weekly_credit_cap && plan.weekly_credit_cap > 0) {
    rows.push(["Weekly cap", `${formatNumber(usage.credits_used_this_week)} / ${formatNumber(plan.weekly_credit_cap)}`]);
  }
  if (plan.daily_credit_cap && plan.daily_credit_cap > 0) {
    rows.push(["Daily cap", `${formatNumber(usage.credits_used_today)} / ${formatNumber(plan.daily_credit_cap)}`]);
  }
  rows.push(["Resets", formatReset(usage.resets_at)]);
  rows.push(["Concurrency", String(plan.concurrency)]);
  rows.push(["RPM", String(plan.requests_per_minute)]);
  rows.push(["Models", String(models.available)]);

  out(table(rows));
  out();

  if (percent >= 100) {
    out(`  ${style.red(glyph.fail)} Monthly credits are exhausted.`);
    out(`  ${style.dim("Top up or upgrade:")} https://sknib.com/pricing`);
    out();
  } else if (percent >= 80) {
    out(`  ${style.yellow(glyph.warn)} You have used ${percent}% of this month's credits.`);
    out(`  ${style.dim("Top up:")} https://sknib.com/pricing`);
    out();
  }
}

function formatMoney(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function formatReset(iso: string): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return iso;
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  if (days > 0) return `in ${days}d ${hours}h`;
  const minutes = Math.max(1, Math.floor((diffMs % 3_600_000) / 60_000));
  return `in ${hours}h ${minutes}m`;
}

/** `nib models` prints the models routable on the current plan. */
export async function modelsCommand(options: { json?: boolean } = {}): Promise<void> {
  const session = await resolveSession();
  const client = new ApiClient({ apiUrl: session.apiUrl, token: session.token });
  const list = await client.listModels();

  if (options.json) {
    out(JSON.stringify(list, null, 2));
    return;
  }

  if (list.data.length === 0) {
    out(style.dim("No models are available on this plan."));
    return;
  }

  out();
  out(`  ${style.bold(`${list.data.length} models available`)}`);
  out();
  for (const model of list.data) {
    const tier = model.tier ? style.dim(`[${model.tier}]`) : "";
    out(`  ${model.id.padEnd(34)} ${tier}`);
  }
  out();
  out(style.dim("  Change the default with `nib init --model <id> --force`."));
  out();
}

export async function whoamiCommand(): Promise<void> {
  const session = await resolveSession();
  const client = new ApiClient({ apiUrl: session.apiUrl, token: session.token });
  const entitlement: Entitlement = await client.getEntitlement();
  if (!entitlement.plan) throw new NibError("gateway returned an empty entitlement", 6);
  out(entitlement.plan.name);
}
