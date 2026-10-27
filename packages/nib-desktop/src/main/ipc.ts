import { ipcMain, shell } from "electron";
import type { AppContext } from "./app-context.js";
import type { Updater } from "./updater.js";

/**
 * The IPC contract (docs/IPC.md): eight invoke channels, two fire-and-forget
 * terminal sends. Main→renderer events are sent from AppContext and the
 * updater, not here.
 */

export function wireIpc(options: { context: AppContext; updater: Updater }): void {
  const { context, updater } = options;

  ipcMain.handle("state:get", () => context.state());
  ipcMain.handle("auth:start-login", () => context.startLogin());
  ipcMain.handle("auth:cancel-login", () => context.cancelLogin());
  ipcMain.handle("auth:logout", () => context.logout());
  ipcMain.handle("credits:refresh", () => context.refreshCredits());
  ipcMain.handle("project:choose", () => context.chooseProject());
  ipcMain.handle("app:open-external", (_event, url: string) => shell.openExternal(url));
  ipcMain.handle("update:check", () => updater.checkForUpdates());

  ipcMain.on("terminal:write", (_event, data: string) => context.engine.write(data));
  ipcMain.on("terminal:resize", (_event, size: { cols: number; rows: number }) => context.engine.resize(size.cols, size.rows));
}
