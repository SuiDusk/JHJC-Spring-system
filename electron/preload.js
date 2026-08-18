import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的桌面能力（仅桌面版可用）
contextBridge.exposeInMainWorld('desktopAPI', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  quitAndInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update:event', listener);
    return () => ipcRenderer.removeListener('update:event', listener);
  },
});
