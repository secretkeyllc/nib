import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Locate the engine binary. Precedence:
 *   1. NIB_OPENCODE_BIN (dev / support override)
 *   2. a binary bundled under the app's resources/bin directory
 *   3. `opencode` resolved from PATH by the OS
 *
 * The engine is the upstream OpenCode TUI; Nib never forks it, so users and
 * the installer can upgrade it independently.
 */

export interface ResolvedEngine {
  /** Command to spawn. */
  command: string;
  /** Args before any user args. */
  args: string[];
  source: "env" | "bundled" | "path" | "missing";
}

export function resolveEngine(options: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  resourcesDir?: string;
} = {}): ResolvedEngine {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const exe = platform === "win32" ? "opencode.exe" : "opencode";

  const fromEnv = env.NIB_OPENCODE_BIN?.trim();
  if (fromEnv) {
    return { command: fromEnv, args: [], source: "env" };
  }

  if (options.resourcesDir) {
    const bundled = join(options.resourcesDir, "bin", exe);
    if (existsSync(bundled)) {
      return { command: bundled, args: [], source: "bundled" };
    }
  }

  return { command: "opencode", args: [], source: "path" };
}

export function engineHint(resolved: ResolvedEngine): string | null {
  if (resolved.source !== "missing" && resolved.source !== "path") return null;
  if (resolved.source === "path") {
    // May still resolve on the user's machine; the UI reports spawn failure.
    return null;
  }
  return "The engine was not found. Install it, or bundle it under resources/bin.";
}
