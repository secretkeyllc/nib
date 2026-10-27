import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { resourcesDir } from "./app-context.js";

/**
 * Window management: the splash (Ink background + brand mark, static per the
 * plan's time-box), the main window, and the About panel that carries the
 * one permitted mention of OpenCode.
 */

const INK = "#08090B";

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: "Nib",
    backgroundColor: INK,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.on("ready-to-show", () => win.show());
  // The document title is ours; never let anything else rename the window.
  win.on("page-title-updated", (event) => event.preventDefault());
  win.loadFile(join(__dirname, "../renderer/index.html"));
  return win;
}

export function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 340,
    height: 240,
    frame: false,
    resizable: false,
    movable: true,
    show: false,
    backgroundColor: INK,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  const icon = join(resourcesDir() ?? ".", "splash-mark.png");
  splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!doctype html><meta charset="utf-8">
      <style>
        html,body{height:100%;margin:0;background:${INK};display:grid;place-items:center;overflow:hidden}
        img{width:72px;height:72px}
        p{font:13px/1 system-ui,sans-serif;color:#F4F1EA;letter-spacing:0.12em;margin:16px 0 0}
      </style>
      <div style="text-align:center"><img src="${toFileUrl(icon)}"><p>Nib</p></div>`)}`,
  );
  splash.once("ready-to-show", () => splash.show());
  return splash;
}

export async function showAbout(parent: BrowserWindow): Promise<void> {
  const icon = join(resourcesDir() ?? ".", "logo-gray.png");
  const html = `<!doctype html><meta charset="utf-8">
    <style>
      html,body{height:100%;margin:0;background:${INK};color:#F4F1EA;font:13px/1.6 system-ui,sans-serif}
      main{display:grid;place-items:center;height:100%;text-align:center}
      img{width:64px;height:64px;opacity:0.9}
      h1{font-size:20px;font-weight:600;margin:12px 0 2px}
      .muted{color:#8B909A}
      .legal{margin-top:18px;color:#8B909A;font-size:12px}
      a{color:#FF5C35;text-decoration:none}
    </style>
    <main>
      <div>
        <img src="${toFileUrl(icon)}">
        <h1>Nib</h1>
        <div class="muted">Version ${app.getVersion()}</div>
        <div class="muted" style="margin-top:14px">A Secret Key LLC product</div>
        <div class="legal">Built on OpenCode (MIT)<br><a href="https://opencode.ai">opencode.ai</a></div>
      </div>
    </main>`;
  const about = new BrowserWindow({
    width: 380,
    height: 420,
    parent,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "About Nib",
    backgroundColor: INK,
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  about.setMenu(null);
  about.once("ready-to-show", () => about.show());
  await about.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

export async function loadMarkDataUrl(file: string): Promise<string> {
  const png = await readFile(file);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function toFileUrl(path: string): string {
  const normalised = path.replace(/\\/g, "/");
  return `file://${normalised.startsWith("/") ? "" : "/"}${normalised}`;
}
