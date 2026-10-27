import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * OS credential storage behind one interface, so later platform phases
 * (macOS Keychain, libsecret) implement the same three methods.
 *
 * - Windows: Credential Manager through a PowerShell P/Invoke of CredRead /
 *   CredWrite / CredDelete. The secret travels via an environment variable,
 *   never on the command line.
 * - Everywhere else (developer machines): a 0600 file under the given
 *   directory. Shipped builds on Windows never touch this path.
 */

export interface CredentialStore {
  readonly kind: "windows-credman" | "file";
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, secret: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

const READ_TIMEOUT_MS = 10_000;

export function createCredentialStore(options: { platform?: NodeJS.Platform; fileDir?: string } = {}): CredentialStore {
  const platform = options.platform ?? process.platform;
  return platform === "win32" ? new WindowsCredentialStore() : new FileCredentialStore(options.fileDir ?? ".credentials");
}

/* ------------------------------------------------------------------ */
/* Windows Credential Manager                                          */
/* ------------------------------------------------------------------ */

const CREDMAN_SCRIPT = `
$ErrorActionPreference = 'Stop'
$target = $env:NIB_CRED_TARGET
$action = $env:NIB_CRED_ACTION
$sig = @'
using System;
using System.Runtime.InteropServices;
public static class CredMan {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags;
    public uint Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist;
    public uint AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, EntryPoint = "CredReadW")]
  public static extern bool CredRead(string target, uint type, uint flags, out IntPtr credPtr);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, EntryPoint = "CredWriteW")]
  public static extern bool CredWrite(ref CREDENTIAL credential, uint flags);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, EntryPoint = "CredDeleteW")]
  public static extern bool CredDelete(string target, uint type, uint flags);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr buffer);
}
'@
Add-Type -TypeDefinition $sig
if ($action -eq 'read') {
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead($target, 1, 0, [ref]$ptr)) { exit 2 }
  try {
    $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
    $bytes = New-Object byte[] $cred.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
    [Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))
  } finally { [CredMan]::CredFree($ptr) }
  exit 0
}
if ($action -eq 'write') {
  $bytes = [Text.Encoding]::UTF8.GetBytes($env:NIB_CRED_SECRET)
  $cred = New-Object CredMan+CREDENTIAL
  $cred.Type = 1
  $cred.TargetName = $target
  $cred.Comment = 'Nib gateway token'
  $cred.CredentialBlobSize = $bytes.Length
  $blob = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
  try {
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
    $cred.CredentialBlob = $blob
    $cred.Persist = 2
    if (-not [CredMan]::CredWrite([ref]$cred, 0)) { exit [Runtime.InteropServices.Marshal]::GetLastWin32Error() }
  } finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($blob) }
  exit 0
}
if ($action -eq 'delete') {
  if (-not [CredMan]::CredDelete($target, 1, 0)) { exit 2 }
  exit 0
}
exit 87
`;

class WindowsCredentialStore implements CredentialStore {
  readonly kind = "windows-credman" as const;

  async getPassword(service: string, account: string): Promise<string | null> {
    const out = await this.runCredMan("read", service, account);
    return out === null ? null : out;
  }

  async setPassword(service: string, account: string, secret: string): Promise<void> {
    await this.runCredMan("write", service, account, secret);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      await this.runCredMan("delete", service, account);
      return true;
    } catch (err) {
      if (err instanceof CredentialNotFoundError) return false;
      throw err;
    }
  }

  private async runCredMan(action: "read" | "write" | "delete", service: string, account: string, secret?: string): Promise<string | null> {
    const script = Buffer.from(CREDMAN_SCRIPT, "utf16le").toString("base64");
    const env: NodeJS.ProcessEnv = { ...process.env, NIB_CRED_TARGET: targetName(service, account), NIB_CRED_ACTION: action };
    if (secret !== undefined) env.NIB_CRED_SECRET = secret;

    const result = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", script], {
        env,
        windowsHide: true,
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("credential store timed out"));
      }, READ_TIMEOUT_MS);
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (status) => {
        clearTimeout(timer);
        resolve({ status: status ?? 1, stdout, stderr });
      });
    });

    if (result.status === 0) return action === "read" ? result.stdout : null;
    if (result.status === 2 && action !== "write") throw new CredentialNotFoundError();
    throw new Error(`credential store failed (exit ${result.status}): ${result.stderr.trim().slice(0, 200)}`);
  }
}

export class CredentialNotFoundError extends Error {
  constructor() {
    super("credential not found");
    this.name = "CredentialNotFoundError";
  }
}

function targetName(service: string, account: string): string {
  return `${service}:${account}`;
}

/* ------------------------------------------------------------------ */
/* File fallback (developer machines and later-platform dev builds)    */
/* ------------------------------------------------------------------ */

export class FileCredentialStore implements CredentialStore {
  readonly kind = "file" as const;
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private pathFor(service: string, account: string): string {
    return join(this.dir, `${sanitize(service)}.${sanitize(account)}.secret`);
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      return await readFile(this.pathFor(service, account), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async setPassword(service: string, account: string, secret: string): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const path = this.pathFor(service, account);
    await writeFile(path, secret, { mode: 0o600 });
    // writeFile's mode is masked by umask on some platforms; enforce explicitly.
    await chmod(path, 0o600);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      await rm(this.pathFor(service, account));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }
}

function sanitize(part: string): string {
  return part.replace(/[^A-Za-z0-9_-]+/g, "-");
}

export const SERVICE = "Nib";
export const ACCOUNT = "gateway";
