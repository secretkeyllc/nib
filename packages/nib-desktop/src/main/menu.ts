import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from "electron";
import type { AppContext } from "./app-context.js";
import { showAbout } from "./window.js";
import type { Updater } from "./updater.js";

/**
 * The application menu. Items call AppContext directly — no IPC round-trip
 * for our own process. "Check for Updates…" only exists on builds whose
 * update channel is enabled.
 */

export function buildMenu(options: { context: AppContext; getWindow: () => BrowserWindow | null; updater: Updater }): void {
  const { context, updater } = options;

  const nibSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "About Nib",
      click: () => {
        const win = options.getWindow();
        if (win) void showAbout(win);
      },
    },
    ...(updater.enabled
      ? [{ label: "Check for Updates…", click: () => updater.checkForUpdates() } satisfies MenuItemConstructorOptions]
      : []),
    { type: "separator" },
    { label: "Sign Out", click: () => void context.logout() },
    { type: "separator" },
    { role: "quit", label: "Quit" },
  ];

  const template: MenuItemConstructorOptions[] = [
    { label: "Nib", submenu: nibSubmenu },
    {
      label: "File",
      submenu: [{ label: "Open Project…", accelerator: "CmdOrCtrl+O", click: () => void context.chooseProject() }],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    {
      label: "Engine",
      submenu: [{ label: "Restart Engine", accelerator: "CmdOrCtrl+E", click: () => void context.engine.restart() }],
    },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [{ label: "Nib Documentation", click: () => void shell.openExternal("https://sknib.com/docs") }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
