import { contextBridge, ipcRenderer } from 'electron';
import type { PreviewPayload } from '../src/shared/types.js';

contextBridge.exposeInMainWorld('previewApi', {
  onPreview: (callback: (payload: PreviewPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: PreviewPayload) => {
      callback(payload);
    };

    ipcRenderer.on('preview:show', listener);
    ipcRenderer.send('preview:ready');

    return () => {
      ipcRenderer.removeListener('preview:show', listener);
    };
  },
  close: () => {
    ipcRenderer.send('preview:close');
  },
});
