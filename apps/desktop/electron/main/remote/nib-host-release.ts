/**
 * Release coordinates for the `nib-host` bundle the desktop installs on a
 * remote machine (spec `02-architecture/05-remote-agent-control.md` §5.2 step 2,
 * D375).
 *
 * The desktop never uploads executable bytes: it resolves the artifact for the
 * remote platform at *its own* version, keeps the SHA-256 the release publishes
 * as the trust anchor, and hands both to the bootstrap script that runs on the
 * remote machine. Everything here is pure so the URL, target, and checksum
 * rules stay testable without a network or an SSH connection.
 */

/** Platforms the bootstrap can classify from `uname -s`. */
export type NibHostPlatform = "linux" | "darwin";
/** Architectures the bootstrap can classify from `uname -m`. */
export type NibHostArch = "x64" | "arm64";

export type NibHostTarget = {
  platform: NibHostPlatform;
  arch: NibHostArch;
};

/**
 * Release-matrix parity. `release.yml`'s `nib-host-bundle` job publishes the
 * Linux architectures the desktop build matrix ships (x64 and arm64). A target
 * outside this list is refused with a typed failure instead of a 404 halfway
 * through a download.
 */
const PUBLISHED_TARGETS: readonly string[] = ["linux-x64", "linux-arm64"];

export function targetKey(target: NibHostTarget): string {
  return `${target.platform}-${target.arch}`;
}

export function isPublishedTarget(target: NibHostTarget): boolean {
  return PUBLISHED_TARGETS.includes(targetKey(target));
}

/** `uname -s` → a platform the release matrix can serve, or `null`. */
export function platformFromUname(systemName: string): NibHostPlatform | null {
  const value = systemName.trim().toLowerCase();
  if (value === "linux") return "linux";
  if (value === "darwin") return "darwin";
  return null;
}

/** `uname -m` → an architecture the release matrix can serve, or `null`. */
export function archFromUname(machine: string): NibHostArch | null {
  const value = machine.trim().toLowerCase();
  if (value === "x86_64" || value === "amd64") return "x64";
  if (value === "aarch64" || value === "arm64") return "arm64";
  return null;
}

/**
 * `uname -s` and `uname -m` are the only remote facts needed before a
 * download; they are collected in one exec so a host that answers at all
 * answers both.
 */
export function parseUnameOutput(stdout: string): { systemName: string; machine: string } {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return { systemName: lines[0] ?? "", machine: lines[1] ?? "" };
}

export function resolveTarget(stdout: string): NibHostTarget | null {
  const { systemName, machine } = parseUnameOutput(stdout);
  const platform = platformFromUname(systemName);
  const arch = archFromUname(machine);
  if (!platform || !arch) return null;
  return { platform, arch };
}

/** Directory name the tarball unpacks to, `bundle.mjs`'s `nib-host-<version>-<platform>-<arch>`. */
export function nibHostBundleDir(version: string, target: NibHostTarget): string {
  return `nib-host-${version}-${targetKey(target)}`;
}

export function nibHostArtifactName(version: string, target: NibHostTarget): string {
  return `${nibHostBundleDir(version, target)}.tar.gz`;
}

/**
 * Where the Host artifact is published.
 *
 * The Host is Nib's own program, built from this repository and released with
 * it. The download server is the primary source: it is the same host that
 * serves the installer and the updater feed, and unlike GitHub it is reachable
 * from the networks where this product is actually used — a remote Host that
 * cannot fetch its bundle is exactly the failure the pairing toast reports.
 * The GitHub release stays in the list as a fallback for the case where the
 * site is down behind an otherwise-working GitHub route.
 *
 * `NIB_HOST_ARTIFACT_BASE_URL` overrides the location for a mirror or a local
 * test server, without rebuilding the app.
 */
const RELEASE_REPOSITORY = "secretkeyllc/nib";
const DEFAULT_SITE_BASE = "https://nib.am/downloads/host";
const DEFAULT_RELEASE_BASE = `https://github.com/${RELEASE_REPOSITORY}/releases/download`;

export function nibHostArtifactBases(version: string): string[] {
  const override = process.env.NIB_HOST_ARTIFACT_BASE_URL?.trim();
  if (override) {
    const base = override.replace(/\/+$/, "");
    // `{version}` keeps one setting usable across releases; without it the
    // version is appended, which is how a per-release directory is laid out.
    const resolved = base.includes("{version}")
      ? base.replaceAll("{version}", version)
      : `${base}/v${version}`;
    return [resolved];
  }
  return [`${DEFAULT_SITE_BASE}/v${version}`, `${DEFAULT_RELEASE_BASE}/v${version}`];
}

/**
 * Release asset URLs, primary source first. Every base must host both files
 * (tarball + .sha256 sidecar); the bootstrap walks the list until one answers.
 */
export function nibHostArtifactUrls(
  version: string,
  target: NibHostTarget,
): Array<{ tarball: string; checksum: string }> {
  const name = nibHostArtifactName(version, target);
  return nibHostArtifactBases(version).map((base) => ({
    tarball: `${base}/${name}`,
    checksum: `${base}/${name}.sha256`,
  }));
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Lower-case a digest, or `null` when it is not 64 hex characters. */
export function normalizeChecksum(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return SHA256_HEX.test(trimmed) ? trimmed : null;
}

/**
 * Read the digest out of a `sha256sum` file. `release.yml` writes
 * `<digest>  <name>`; the file name is checked so a checksum for a different
 * artifact can never be mistaken for this one.
 */
export function parseChecksumFile(text: string, artifactName: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [rawChecksum, ...rest] = trimmed.split(/\s+/);
    const normalized = normalizeChecksum(rawChecksum ?? "");
    if (!normalized) continue;
    // `sha256sum` writes the bare name; some tools prefix `*` or a path.
    const named = rest.join(" ").replace(/^\*/, "").split("/").pop() ?? "";
    if (named && named !== artifactName) continue;
    return normalized;
  }
  return null;
}

/** Constant-work comparison of two normalized digests. */
export function checksumMatches(actual: string, expected: string): boolean {
  const left = normalizeChecksum(actual);
  const right = normalizeChecksum(expected);
  if (!left || !right) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

/**
 * A bootstrapped host must run the same release as the desktop: the bundle is
 * downloaded at the desktop's version and the RACP capability set is pinned to
 * it (D375). A leading `v` is tolerated on either side because the tag carries
 * one and `APP_VERSION` does not.
 */
export function versionsMatch(remote: string, local: string): boolean {
  const strip = (value: string) => value.trim().replace(/^v/, "");
  const a = strip(remote);
  const b = strip(local);
  return a.length > 0 && a === b;
}
