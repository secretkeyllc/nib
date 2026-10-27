#!/usr/bin/env node
import { loginCommand, logoutCommand } from "./commands/login.js";
import { statusCommand, modelsCommand, whoamiCommand } from "./commands/status.js";
import { initCommand, runCommand, keyPrintCommand } from "./commands/init.js";
import { style, out, err, glyph } from "./lib/ui.js";
import { NibError } from "./lib/types.js";

const VERSION = "0.1.0";

const HELP = `
  ${style.bold("nib")} ${style.dim(`v${VERSION}`)} — an agentic coding tool

  ${style.bold("Usage")}
    nib <command> [options]

  ${style.bold("Commands")}
    login              Sign in with a device code
    logout             Remove local credentials
    status             Show plan, credits and reset date
    models             List models available on your plan
    init               Point OpenCode at the Nib gateway
    run [args...]      Launch the coding agent
    key print          Print the API key for external tools
    whoami             Print the current plan

  ${style.bold("Options")}
    --json             Machine-readable output (status, models)
    --project          Write opencode.json in the current directory (init)
    --force            Replace an existing Nib provider block (init)
    --dry-run          Print the command instead of running it (run)
    -h, --help         Show this help
    -v, --version      Show the version

  ${style.dim("Docs")}  https://sknib.com/docs
`;

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help" || command === "help") {
    out(HELP);
    return 0;
  }
  if (command === "-v" || command === "--version" || command === "version") {
    out(VERSION);
    return 0;
  }

  const flags = parseFlags(rest);

  switch (command) {
    case "login": {
      const apiUrl = flags.value("--api-url");
      await loginCommand({ noOpen: flags.has("--no-open"), ...(apiUrl ? { apiUrl } : {}) });
      return 0;
    }
    case "logout":
      await logoutCommand();
      return 0;
    case "status":
      await statusCommand({ json: flags.has("--json") });
      return 0;
    case "models":
      await modelsCommand({ json: flags.has("--json") });
      return 0;
    case "whoami":
      await whoamiCommand();
      return 0;
    case "init": {
      const model = flags.value("--model");
      await initCommand({
        project: flags.has("--project"),
        force: flags.has("--force"),
        ...(model ? { model } : {}),
      });
      return 0;
    }
    case "key": {
      if (rest[0] === "print") {
        await keyPrintCommand();
        return 0;
      }
      throw new NibError("usage: nib key print", 64);
    }
    case "run":
      await runCommand({ passthrough: rest, dryRun: flags.has("--dry-run") });
      return 0;
    default:
      err(`${style.red(glyph.fail)} Unknown command: ${command}`);
      err(`  Run ${style.bold("nib --help")} for available commands.`);
      return 64;
  }
}

interface Flags {
  has(name: string): boolean;
  value(name: string): string | undefined;
}

export function parseFlags(args: string[]): Flags {
  const set = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg?.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq > -1) {
      values.set(arg.slice(0, eq), arg.slice(eq + 1));
      set.add(arg.slice(0, eq));
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith("-")) {
      values.set(arg, next);
      i += 1;
    }
    set.add(arg);
  }
  return {
    has: (name) => set.has(name),
    value: (name) => values.get(name),
  };
}

const isMain = process.argv[1]?.endsWith("index.js") || process.argv[1]?.endsWith("index.ts");
if (isMain) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      if (error instanceof NibError) {
        err(`${style.red(glyph.fail)} ${error.message}`);
        if (error.hint) err(`  ${style.dim(error.hint)}`);
        process.exitCode = error.exitCode;
        return;
      }
      err(`${style.red(glyph.fail)} ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
