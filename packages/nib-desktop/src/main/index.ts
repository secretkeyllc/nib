import { app, BrowserWindow, nativeTheme } from "electron";
import { join } from "node:path";
import { createCredentialStore } from "../../auth/credential-store.js";
import { AppContext } from "./app-context.js";
import { buildMenu } from "./menu.js";
import { wireIpc } from "./ipc.js";
import { setupUpdater } from "./updater.js";
import { createMainWindow, createSplash } from "./window.js";

/**
 * Main-process entry: identity, the single-instance lock, and the boot
 * sequence that wires context, window, menu, IPC and the updater together.
 */

app.setName("Nib");
if (process.platform === "win32") app.setAppUserModelId("com.secretkeyllc.nib");
nativeTheme.themeSource = "dark";

let mainWindow: BrowserWindow | null = null;
let context: AppContext | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", () => context?.engine.kill());

  void app.whenReady().then(() => bootstrap());
}

async function bootstrap(): Promise<void> {
  mainWindow = createMainWindow();
  const splash = createSplash();
  mainWindow.once("show", () => splash.destroy());

  context = new AppContext({
    window: () => mainWindow,
    store: createCredentialStore({ fileDir: join(app.getPath("userData"), "credentials") }),
  });

  // The updater exists first: both the IPC layer and the menu hold a reference.
  const updater = setupUpdater({ window: () => mainWindow });
  wireIpc({ context, updater });
  buildMenu({ context, getWindow: () => mainWindow, updater });

  mainWindow.on("focus", () => context?.onWindowFocus());

  await context.loadStoredCredentials();
  if (context.signedIn) await context.engine.start();
}
