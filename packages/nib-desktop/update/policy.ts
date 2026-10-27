/**
 * Whether the auto-update channel is active for this build.
 *
 * Plan rules (desktop plan §3.6):
 *  - The unsigned internal beta does not enable auto-update; the signed public
 *    build does (EV code signing, verified on a clean Windows machine).
 *  - Development runs never check for updates.
 *  - Channel: `latest` (stable) by default, `beta` opt-in via NIB_CHANNEL.
 */

export type UpdateChannel = "latest" | "beta";

export interface UpdatePolicyInput {
  platform?: NodeJS.Platform;
  /** electron `app.isPackaged`. */
  packaged: boolean;
  /** CI or support escape hatch: NIB_DISABLE_UPDATES / NIB_ENABLE_UPDATES. */
  env?: NodeJS.ProcessEnv;
  /** Set by the packaging pipeline once the binary is EV-signed. */
  codeSigned?: boolean;
}

export interface UpdatePolicy {
  enabled: boolean;
  channel: UpdateChannel;
  reason: string;
}

export function resolveUpdatePolicy(input: UpdatePolicyInput): UpdatePolicy {
  const platform = input.platform ?? process.platform;
  const env = input.env ?? process.env;

  if (env.NIB_DISABLE_UPDATES === "1") {
    return { enabled: false, channel: "latest", reason: "updates disabled by NIB_DISABLE_UPDATES" };
  }
  if (env.NIB_ENABLE_UPDATES === "1") {
    return { enabled: true, channel: resolveChannel(env), reason: "updates forced on by NIB_ENABLE_UPDATES" };
  }
  if (!input.packaged) {
    return { enabled: false, channel: "latest", reason: "not packaged" };
  }
  if (platform !== "win32") {
    return { enabled: false, channel: "latest", reason: "auto-update ships for Windows first" };
  }
  if (input.codeSigned === false) {
    return { enabled: false, channel: "latest", reason: "unsigned beta build" };
  }
  return { enabled: true, channel: resolveChannel(env), reason: "signed Windows build" };
}

function resolveChannel(env: NodeJS.ProcessEnv): UpdateChannel {
  return env.NIB_CHANNEL === "beta" ? "beta" : "latest";
}
