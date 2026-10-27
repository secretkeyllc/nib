import { app, type BrowserWindow } from "electron";
import type { AppUpdater } from "electron-updater";
import { resolveUpdatePolicy } from "../../update/policy.js";

/**
 * Auto-update, driven by the build's update policy. When the policy disables
 * the channel, checking for updates narrates the reason instead of touching
 * the network. When enabled, electron-updater downloads in the background and
 * installs on the next launch — it never restarts the app underneath the user.
 */

export interface Updater {
  /** False when the update channel is disabled for this build. */
  readonly enabled: boolean;
  checkForUpdates(): void;
}

export function setupUpdater(options: { window: () => BrowserWindow | null }): Updater {
  const policy = resolveUpdatePolicy({ packaged: app.isPackaged, platform: process.platform });
  const send = (message: string): void => {
    const win = options.window();
    if (win && !win.isDestroyed()) win.webContents.send("update:status", { message });
  };

  if (!policy.enabled) {
    return {
      enabled: false,
      checkForUpdates(): void {
        send(`Updates are unavailable for this build: ${policy.reason}.`);
      },
    };
  }

  let lastPercent = -1;

  // electron-updater is loaded lazily so a disabled build never pays for it.
  const ready: Promise<AppUpdater> = import("electron-updater").then(({ autoUpdater }) => {
    autoUpdater.channel = policy.channel;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("checking-for-update", () => send("Checking for updates…"));
    autoUpdater.on("update-available", (info) => send(`Nib ${info.version} is available — downloading in the background.`));
    autoUpdater.on("update-not-available", () => send(`Nib ${app.getVersion()} is up to date.`));
    autoUpdater.on("download-progress", (progress) => {
      const percent = Math.round(progress.percent);
      if (percent !== lastPercent) {
        lastPercent = percent;
        send(`Downloading update — ${percent}%.`);
      }
    });
    autoUpdater.on("update-downloaded", (event) =>
      send(`Nib ${event.version} downloaded — it installs the next time you start Nib.`),
    );
    autoUpdater.on("error", (error) => send(`Update check failed: ${error.message}`));
    return autoUpdater;
  });

  return {
    enabled: true,
    checkForUpdates(): void {
      void ready.then(
        (autoUpdater) => autoUpdater.checkForUpdates(),
        (err: unknown) => send(`Update check failed: ${err instanceof Error ? err.message : String(err)}`),
      );
    },
  };
}
