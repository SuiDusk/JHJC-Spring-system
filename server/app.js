import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { getDb } from './db.js';
import springsRouter from './routes/springs.js';
import inboundRouter from './routes/inbound.js';
import outboundRouter from './routes/outbound.js';
import warehouseRouter from './routes/warehouse.js';
import dashboardRouter from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 读取版本号（web/桌面端统一从此接口获取，避免前端硬编码不一致）
function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    return { version: pkg.version || '1.0.0', name: pkg.productName || '弹簧厂出入库管理系统' };
  } catch (e) {
    return { version: '1.0.0', name: '弹簧厂出入库管理系统' };
  }
}

export function createApp() {
  const app = express();

  app.use(cors());
  // 请求体上限：批量导入 Excel 时单次可能提交上千行（约几百 KB~数 MB），
  // express.json() 默认仅 100kb，会导致 413 PayloadTooLargeError 而无法导入
  app.use(express.json({ limit: '20mb' }));

  // API路由
  app.use('/api/springs', springsRouter);
  app.use('/api/inbound', inboundRouter);
  app.use('/api/outbound', outboundRouter);
  app.use('/api/warehouse', warehouseRouter);
  app.use('/api/dashboard', dashboardRouter);

  // 应用元信息（版本号等），供前端展示，web/桌面端统一
  app.get('/api/meta', (req, res) => res.json(getAppVersion()));

  // 提供前端静态文件（打包版通过 STATIC_DIR 指向 resources 下的真实目录，避免 asar 读取边界问题）
  const clientDist = process.env.STATIC_DIR || path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });

  return app;
}

/**
 * 启动服务
 * @param {number} port 端口号，传 0 表示自动分配空闲端口
 * @param {string} host 监听地址，默认 127.0.0.1
 * @returns {Promise<{server: import('http').Server, port: number}>}
 */
export function startServer(port = 3001, host = '127.0.0.1') {
  const app = createApp();
  getDb(); // 初始化数据库
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort });
    });
    server.on('error', reject);
  });
}

export default createApp;
