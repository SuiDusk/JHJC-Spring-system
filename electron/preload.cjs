// 注意：此文件必须使用 CommonJS 语法并命名为 .cjs。
// 因为 BrowserWindow 启用了 sandbox: true，沙箱化的 preload 脚本只支持
// 受限的 CommonJS（require），不支持 ES Modules（import）。
// 同时 package.json 设置了 "type": "module"，若保留 .js 后缀会按 ESM 解析，
// 导致沙箱 preload 加载失败，window.desktopAPI 未注入，更新模块无按钮。
const { contextBridge, ipcRenderer } = require('electron');

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
