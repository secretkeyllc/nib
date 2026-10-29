import { app, BrowserWindow } from "electron";
import {
  defaultDataDir,
  hasSingleInstanceLock,
  singleInstanceRequired,
} from "./installation";
import { prepareStorage } from "./storage/bootstrap";

// Do not top-level-await Electron readiness: module evaluation gates the ready event.
// The full composition root is imported only after offline maintenance has finished.
if (hasSingleInstanceLock) {
  let booted = false;
  // Before the composition root loads there is no activation handler yet, so a
  // second launch (including one caused by a `nib://open` link from the
  // browser after a web sign-in) is answered here. Once booted, the handler in
  // bootstrap/app-activation.ts owns it.
  app.on("second-instance", () => {
    if (booted) return;
    const window = BrowserWindow.getAllWindows()[0];
    window?.show();
    window?.focus();
  });
  void prepareStorage(defaultDataDir, !singleInstanceRequired)
    .then(() => {
      booted = true;
      return import("./index");
    })
    .catch((error: unknown) => {
      console.error("Storage startup failed", error instanceof Error ? error.message : String(error));
      app.exit(1);
    });
}
