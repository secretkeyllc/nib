import { app, BrowserWindow } from "electron";
import { APP_ID, APP_NAME } from "@pi-desktop/shared";
import { applyDevelopmentUserData, desktopDataDir } from "./data-paths";
import { ignoreBrokenStdio } from "./logger";
import { installMainProcessErrorHandlers } from "./main-process-errors";

// Complete identity and locking synchronously, before the ready promise or any writer.
ignoreBrokenStdio();
installMainProcessErrorHandlers();
export const isDevelopmentBuild = process.env.PI_DESKTOP_DEV === "1" || !app.isPackaged;
app.setName(APP_NAME);
applyDevelopmentUserData(app, isDevelopmentBuild);
if (process.platform === "win32") app.setAppUserModelId(APP_ID);

// A managed restart inherits the root published for children, not an explicit profile override.
if (process.argv.includes("--pi-managed-storage")) delete process.env.PI_DESKTOP_DATA_DIR;
export const singleInstanceRequired = !process.env.PI_DESKTOP_DATA_DIR;
export const hasSingleInstanceLock = singleInstanceRequired ? app.requestSingleInstanceLock() : true;
export const defaultDataDir = desktopDataDir(isDevelopmentBuild);
if (!hasSingleInstanceLock) app.quit();

/**
 * Deep link the browser uses to hand the user back to the app after a web
 * sign-in (`<a href="nib://open">` on the approval page).
 *
 * Registration is best-effort: a development build must not steal the scheme
 * from an installed release, and on Linux it only takes effect for packaged
 * launches whose .desktop entry declares the handler. Opening the app is a
 * convenience here — the device login itself completes by polling — so a
 * failure is not worth surfacing.
 */
export function registerDeepLinkProtocol(): void {
  if (process.defaultApp || isDevelopmentBuild) return;
  try {
    app.setAsDefaultProtocolClient("nib");
  } catch {
    // No installer to register with (portable/dev build); ignore.
  }
}

/** True when this launch was caused by `nib://…` rather than by the user. */
export function isDeepLinkLaunch(argv: readonly string[]): boolean {
  return argv.some(
    (arg) => typeof arg === "string" && arg.toLowerCase().startsWith("nib://"),
  );
}

registerDeepLinkProtocol();

// macOS delivers deep links through open-url rather than argv. A link is only
// ever "show me the app" today, so restoring the existing window is the whole
// response; BrowserWindow may not exist yet at this point, which is fine —
// the app is booting and will show a window anyway.
app.on("open-url", (event, url) => {
  if (!url || !url.toLowerCase().startsWith("nib://")) return;
  event.preventDefault();
  const [window] = BrowserWindow.getAllWindows();
  if (window) {
    window.show();
    window.focus();
  }
});

// Preserve the existing Chromium accessibility crash workaround before ready.
app.commandLine.appendSwitch("disable-renderer-accessibility");
