import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let httpServer = null;
let autoUpdater = null;

// 单实例锁：防止重复启动导致数据库并发写冲突
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // 必须在导入 server 模块之前设置环境变量（db.js 顶层即读取 SPRING_DB_PATH）
  // 数据库存放在用户数据目录，避免 asar 内不可写
  process.env.SPRING_DB_PATH = app.getPath('userData');
  // 静态资源目录：开发模式用 client/dist，打包模式指向 resources 下的副本
  process.env.STATIC_DIR = app.isPackaged
    ? path.join(process.resourcesPath, 'client-dist')
    : path.join(app.getAppPath(), 'client', 'dist');

  function sendUpdateEvent(type, data = {}) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:event', { type, data });
    }
  }

  function wireUpdaterEvents() {
    if (!autoUpdater) return;
    autoUpdater.on('checking-for-update', () => sendUpdateEvent('checking-for-update'));
    autoUpdater.on('update-available', (info) => sendUpdateEvent('update-available', info));
    autoUpdater.on('update-not-available', () => sendUpdateEvent('update-not-available'));
    autoUpdater.on('download-progress', (progressObj) => sendUpdateEvent('download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    }));
    autoUpdater.on('update-downloaded', (info) => sendUpdateEvent('update-downloaded', info));
    autoUpdater.on('error', (err) => sendUpdateEvent('error', { message: err?.message || String(err) }));
  }

  function createWindow(port) {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      title: '弹簧厂出入库管理系统',
      autoHideMenuBar: true,
      icon: path.join(__dirname, 'icons', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(async () => {
    // electron-updater 必须在 app ready 后加载，且仅在打包版启用
    if (app.isPackaged) {
      try {
        // 使用 require 以正确解析 CJS 的 autoUpdater getter（ESM named import 无法触发 getter）
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const updater = require('electron-updater');
        autoUpdater = updater.autoUpdater;
        autoUpdater.autoDownload = false; // 仅手动更新
        autoUpdater.autoInstallOnAppQuit = true;
        wireUpdaterEvents();
      } catch (err) {
        console.error('electron-updater 加载失败:', err);
      }
    }

    try {
      const { startServer } = await import('../server/app.js');
      const { server, port } = await startServer(0, '127.0.0.1');
      httpServer = server;
      console.log(`内嵌服务已启动: http://127.0.0.1:${port}`);
      createWindow(port);
    } catch (err) {
      console.error('启动内嵌服务失败:', err);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(httpServer?.address()?.port || 3001);
      }
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  // 退出时关闭 HTTP 服务与数据库（WAL 模式下数据保证落盘）
  app.on('before-quit', () => {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
  });

  // ---------- IPC 处理 ----------
  ipcMain.handle('app:get-info', () => {
    return {
      version: pkg.version || '1.0.0',
      name: pkg.productName || '弹簧厂出入库管理系统',
      source: app.isPackaged ? 'GitHub Releases' : '开发模式',
    };
  });

  ipcMain.handle('update:check', async () => {
    if (!autoUpdater) return { ok: false, error: '更新功能仅在桌面版可用' };
    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('update:download', async () => {
    if (!autoUpdater) return { ok: false, error: '更新功能仅在桌面版可用' };
    try {
      autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('update:install', async () => {
    if (!autoUpdater) return { ok: false, error: '更新功能仅在桌面版可用' };
    autoUpdater.quitAndInstall();
    return { ok: true };
  });
}
