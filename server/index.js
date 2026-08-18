import { startServer } from './app.js';

const PORT = Number(process.env.PORT) || 3001;

startServer(PORT, '0.0.0.0').then(({ port }) => {
  console.log(`弹簧厂出入库管理系统服务已启动: http://localhost:${port}`);
}).catch((err) => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
