/**
 * Electron stub for tests that import main-process modules directly (the
 * updater stub covers only the updater graph; this one carries the wider set
 * of names the workspace IPC graph touches). Every export is inert: tests
 * drive the registered handlers, never the real Electron APIs.
 */

export const app = {
  getAppPath: () => process.cwd(),
  getVersion: () => "0.0.0-test",
  isPackaged: false,
  quit: () => undefined,
  on: () => undefined,
  whenReady: async () => undefined,
};

export class BrowserWindow {
  webContents = {
    send: () => undefined,
    isDestroyed: () => true,
    getURL: () => "https://localhost/",
    setWindowButtonVisibility: () => undefined,
    on: () => undefined,
    focus: () => undefined,
  };
  isDestroyed() { return true; }
  isMinimized() { return true; }
  isMaximized() { return false; }
  isFullScreen() { return false; }
  focus() {}
  close() {}
  show() {}
  hide() {}
  loadURL() { return Promise.resolve(); }
  setMenuBarVisibility() {}
  on() { return undefined; }
  once() { return undefined; }
  getSize() { return [1280, 800]; }
  setPosition() {}
  getPosition() { return [0, 0]; }
  setContentSize() {}
  getContentSize() { return [1280, 800]; }
  setBounds() {}
  getBounds() { return { x: 0, y: 0, width: 1280, height: 800 }; }
  setTitle() {}
  getTitle() { return ""; }
  static getAllWindows() { return []; }
}

export const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showMessageDialog: async () => ({ response: 0 }),
  showError: () => undefined,
};

export const shell = {
  openExternal: async () => undefined,
  openPath: async () => "",
  showItemInFolder: () => undefined,
  trashItem: async () => undefined,
};

export const ipcMain = {
  on: () => undefined,
  handle: () => undefined,
  removeHandler: () => undefined,
};

export const nativeTheme = { on: () => undefined, shouldUseDarkColors: false, themeSource: "system" };
export const screen = {
  getPrimaryDisplay: () => ({ workAreaSize: { width: 1280, height: 800 }, scaleFactor: 1 }),
  getAllDisplays: () => [],
  on: () => undefined,
};
export const session = { defaultSession: {} };
export const clipboard = { readText: () => "", writeText: () => undefined, readImage: () => ({}), writeImage: () => undefined };
export const globalShortcut = { register: () => false, unregister: () => undefined, unregisterAll: () => undefined };
export const powerMonitor = { on: () => undefined };
export const Menu = { buildFromTemplate: () => ({}), setApplicationMenu: () => undefined };
export const Tray = class Tray {};
export const Notification = class Notification { static isSupported() { return false; } };
export const WebContentsView = class WebContentsView {};
export const systemPreferences = { getUserDefault: () => undefined, on: () => undefined };
export const net = { fetch: async () => ({ ok: false }) };
export const crashReporter = { start: () => undefined };
export const desktopCapturer = { getSources: async () => [] };
export const contextBridge = { exposeInMainWorld: () => undefined };
export const nativeImage = { createEmpty: () => ({}) };
