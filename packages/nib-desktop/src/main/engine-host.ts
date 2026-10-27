import { EventEmitter } from "node:events";

/**
 * Hosts the OpenCode engine in a pseudo-terminal so the full upstream TUI
 * (sessions, task list, diffs) runs inside the Nib window unchanged.
 * The engine is spawned, never forked: Nib only wires its environment.
 *
 * Lazy-loads node-pty so a missing native module degrades into an error
 * event instead of crashing the app.
 */

export type EngineStatus = "stopped" | "starting" | "running" | "exited" | "error";

export interface EngineEvent {
  status: EngineStatus;
  /** Human-facing explanation for error states. */
  message?: string;
  exitCode?: number;
}

export interface EngineHostOptions {
  resolve(): { command: string; args: string[]; source: string };
  env(): Promise<NodeJS.ProcessEnv>;
  onData(data: string): void;
  onEvent(event: EngineEvent): void;
}

const COLUMNS = 120;
const ROWS = 32;

export class EngineHost extends EventEmitter {
  private pty: {
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(): void;
    onExit(listener: (event: { exitCode: number; signal?: number }) => void): void;
    onData(listener: (data: string) => void): void;
  } | null = null;
  private starting = false;

  constructor(private readonly options: EngineHostOptions) {
    super();
  }

  get running(): boolean {
    return this.pty !== null;
  }

  async start(): Promise<void> {
    if (this.pty || this.starting) return;
    this.starting = true;
    this.options.onEvent({ status: "starting" });
    try {
      const resolved = this.options.resolve();
      const env = await this.options.env();
      // Loaded lazily: the native module is platform-specific.
      const { spawn } = await import("@lydell/node-pty");
      const pty = spawn(resolved.command, resolved.args, {
        name: "nib",
        cols: COLUMNS,
        rows: ROWS,
        cwd: env.NIB_PROJECT_DIR ?? undefined,
        env: { ...env, TERM: "xterm-256color" },
      });
      this.pty = pty;
      pty.onData((data) => this.options.onData(data));
      pty.onExit(({ exitCode }) => {
        this.pty = null;
        this.options.onEvent({ status: "exited", exitCode });
      });
      this.options.onEvent({ status: "running" });
    } catch (err) {
      this.pty = null;
      const message = err instanceof Error ? err.message : String(err);
      this.options.onEvent({
        status: "error",
        message: /cannot find|ENOENT|not found/i.test(message)
          ? "The engine was not found. Install it, or bundle it under resources/bin."
          : message,
      });
    } finally {
      this.starting = false;
    }
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
  }

  restart(): Promise<void> {
    this.kill();
    return this.start();
  }

  kill(): void {
    const pty = this.pty;
    this.pty = null;
    if (pty) {
      try {
        pty.kill();
      } catch {
        // Already gone.
      }
    }
  }
}
