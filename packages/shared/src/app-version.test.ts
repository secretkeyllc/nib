import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./protocol.js";

/**
 * APP_VERSION is a hand-copied constant: the renderer's About page, the
 * sidebar badge and the remote-control hello frame all read it, and a stale
 * copy ships a client that reports the wrong version everywhere (0.22.16
 * displayed 0.22.15 exactly this way). It must always equal the workspace
 * release version — the same value the tag guard checks.
 */
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function packageVersion(path: string): string {
  const parsed = JSON.parse(readFileSync(`${repoRoot}${path}`, "utf8")) as {
    version?: string;
  };
  expect(parsed.version, `${path} carries a version`).toBeTruthy();
  return parsed.version as string;
}

describe("APP_VERSION tracks the workspace release version", () => {
  it("matches apps/desktop/package.json", () => {
    expect(APP_VERSION).toBe(packageVersion("apps/desktop/package.json"));
  });

  it("matches apps/nib-host/package.json", () => {
    expect(APP_VERSION).toBe(packageVersion("apps/nib-host/package.json"));
  });
});
