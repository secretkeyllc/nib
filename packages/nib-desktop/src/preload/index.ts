import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { CreditsPayload, ShellState } from "../main/app-context.js";

/**
 * The sandboxed renderer bridge (docs/IPC.md): only contextBridge and
 * ipcRenderer are reachable here. `on` accepts the contract's event channels
 * and returns an unsubscribe function.
 */

interface NibBridge {
  getState(): Promise<ShellState>;
  startLogin(): Promise<void>;
  cancelLogin(): Promise<void>;
  logout(): Promise<void>;
  refreshCredits(): Promise<CreditsPayload>;
  chooseProject(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  checkForUpdates(): Promise<void>;
  writeTerminal(data: string): void;
  resizeTerminal(cols: number, rows: number): void;
  on(channel: string, listener: (payload: unknown) => void): () => void;
}

const EVENT_CHANNELS = new Set<string>([
  "state:changed",
  "engine:data",
  "engine:event",
  "auth:code",
  "auth:waiting",
  "auth:ok",
  "auth:cancelled",
  "auth:failed",
  "auth:expired",
  "auth:signed-out",
  "update:status",
]);

const bridge: NibBridge = {
  getState: () => ipcRenderer.invoke("state:get"),
  startLogin: () => ipcRenderer.invoke("auth:start-login"),
  cancelLogin: () => ipcRenderer.invoke("auth:cancel-login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  refreshCredits: () => ipcRenderer.invoke("credits:refresh"),
  chooseProject: () => ipcRenderer.invoke("project:choose"),
  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  writeTerminal: (data: string) => ipcRenderer.send("terminal:write", data),
  resizeTerminal: (cols: number, rows: number) => ipcRenderer.send("terminal:resize", { cols, rows }),
  on(channel: string, listener: (payload: unknown) => void): () => void {
    if (!EVENT_CHANNELS.has(channel)) return () => {};
    const wrapped = (_event: IpcRendererEvent, payload: unknown): void => listener(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld("nib", bridge);
