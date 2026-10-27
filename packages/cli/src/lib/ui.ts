/**
 * Minimal terminal helpers. No dependency: we detect TTY and honour NO_COLOR,
 * CLICOLOR_FORCE and FORCE_COLOR, which is what most CLIs do.
 */

const useColor = (() => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  if (process.env.CLICOLOR_FORCE && process.env.CLICOLOR_FORCE !== "0") return true;
  return Boolean(process.stdout.isTTY);
})();

function wrap(open: number, close: number): (text: string) => string {
  return (text) => (useColor ? `\u001b[${open}m${text}\u001b[${close}m` : text);
}

export const style = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  ember: wrap(38, 39), // replaced below with 256-colour when supported
  ink: wrap(90, 39),
  mint: (text: string) => (useColor ? `\u001b[38;5;79m${text}\u001b[39m` : text),
  emberAccent: (text: string) => (useColor ? `\u001b[38;5;203m${text}\u001b[39m` : text),
  red: (text: string) => (useColor ? `\u001b[31m${text}\u001b[39m` : text),
  green: (text: string) => (useColor ? `\u001b[32m${text}\u001b[39m` : text),
  yellow: (text: string) => (useColor ? `\u001b[33m${text}\u001b[39m` : text),
};

export const glyph = {
  ok: "✓",
  fail: "✗",
  warn: "!",
  arrow: "→",
  dot: "·",
};

export function out(line = ""): void {
  process.stdout.write(`${line}\n`);
}

export function err(line = ""): void {
  process.stderr.write(`${line}\n`);
}

/** Right-pad a string for aligned columns, counting printable characters only. */
export function pad(text: string, width: number): string {
  const visible = text.replace(/\u001b\[[0-9;]*m/g, "");
  const gap = Math.max(0, width - visible.length);
  return text + " ".repeat(gap);
}

/** Render a simple two-column table without pulling in a dependency. */
export function table(rows: Array<[string, string]>): string {
  const width = rows.reduce((max, [key]) => Math.max(max, key.length), 0);
  return rows.map(([key, value]) => `${pad(style.dim(key), width)}  ${value}`).join("\n");
}

/** Format a credit amount as both credits and the published-rate dollar value. */
export function credits(amount: number): string {
  const dollars = amount * 0.1;
  return `${formatNumber(amount)} credits ${style.dim(`(≈ $${dollars.toFixed(2)} of usage)`)}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Progress bar for credit consumption, 24 cells wide. */
export function bar(used: number, total: number, width = 24): string {
  if (total <= 0) return "[" + " ".repeat(width) + "]";
  const ratio = Math.min(1, Math.max(0, used / total));
  const filled = Math.round(ratio * width);
  const colour = ratio >= 1 ? style.red : ratio >= 0.8 ? style.yellow : style.mint;
  return `[${colour("█".repeat(filled))}${style.dim("░".repeat(width - filled))}]`;
}
