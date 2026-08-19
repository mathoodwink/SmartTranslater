import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, OverlayMessage, TranslatorApi } from '../src/shared/types.js';

const api: TranslatorApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('settings:save', settings),
  onOverlayMessage: (callback: (message: OverlayMessage) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: OverlayMessage) => {
      callback(message);
    };

    ipcRenderer.on('overlay:message', listener);

    return () => {
      ipcRenderer.removeListener('overlay:message', listener);
    };
  },
};

contextBridge.exposeInMainWorld('translatorApi', api);
