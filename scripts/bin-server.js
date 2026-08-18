// 本地工具包 HTTP 服务器：为 electron-builder 提供 winCodeSign/nsis 等二进制
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'local-bin');
const port = Number(process.env.BIN_SERVER_PORT) || 18080;

http.createServer((req, res) => {
  const cleanPath = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  // 支持两种路径格式：/a/b.7z 和 /b.7z
  const candidates = [path.join(root, cleanPath), path.join(root, path.basename(cleanPath))];
  const file = candidates.find((f) => f.startsWith(root) && fs.existsSync(f));
  if (!file) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': data.length,
    });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`bin-server running on http://127.0.0.1:${port}`);
});
