// 纯 Node 生成弹簧主题应用图标（多尺寸 ICO），无第三方依赖
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconDir = path.join(__dirname, '..', 'electron', 'icons');

// 渲染指定尺寸的 32bit BGRA 画布（自底向上 BMP 编码）
function render(size) {
  const px = new Uint8ClampedArray(size * size * 4);
  const put = (x, y, r, g, b, a = 255) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= size || yi >= size) return;
    const i = (yi * size + xi) * 4;
    px[i] = b; px[i + 1] = g; px[i + 2] = r; px[i + 3] = a;
  };

  // 蓝色渐变背景
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(24 + t * 36);
    const g = Math.round(90 + t * 44);
    const b = Math.round(222 + t * 20);
    for (let x = 0; x < size; x++) put(x, y, r, g, b);
  }

  const s = size / 256;
  const dot = (x, y, radius, r, g, b) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) put(x + dx, y + dy, r, g, b);
      }
    }
  };
  const drawLine = (x0, y0, x1, y1, r) => {
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 255, 255, 255);
    }
  };

  const cx = size / 2;
  const amp = 50 * s;
  const top = 38 * s;
  const bottom = size - 38 * s;
  const coils = 5;
  const stroke = Math.max(2, 2.6 * s);

  // 顶部/底部端尾线
  drawLine(cx - amp - 8 * s, top, cx + amp + 8 * s, top, stroke);
  drawLine(cx - amp - 8 * s, bottom, cx + amp + 8 * s, bottom, stroke);

  // 弹簧螺旋（垂直正弦波）
  const total = Math.ceil((bottom - top) * 2);
  let prevX = cx + amp * Math.sin(0);
  let prevY = top;
  for (let i = 1; i <= total; i++) {
    const y = top + (i / total) * (bottom - top);
    const t = (y - top) / (bottom - top);
    const x = cx + amp * Math.sin(t * Math.PI * 2 * coils);
    drawLine(prevX, prevY, x, y, stroke);
    prevX = x; prevY = y;
  }

  // 线圈极值处水平短连接线
  for (let k = 0; k <= coils * 2; k++) {
    const t = k / (coils * 2);
    const y = top + t * (bottom - top);
    drawLine(cx - 9 * s, y, cx + 9 * s, y, stroke * 0.85);
  }

  // 编码 BMP（BITMAPINFOHEADER + XOR 像素 + AND 掩码）
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(size * size * 4, 20);

  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const srcRow = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const si = (srcRow * size + x) * 4;
      const di = (y * size + x) * 4;
      xor[di] = px[si];
      xor[di + 1] = px[si + 1];
      xor[di + 2] = px[si + 2];
      xor[di + 3] = px[si + 3];
    }
  }

  const rowBytes = Math.ceil(size / 32) * 4;
  const and = Buffer.alloc(rowBytes * size);
  return Buffer.concat([header, xor, and]);
}

function buildIco(sizes) {
  const images = sizes.map((size) => ({ size, data: render(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.size === 256 ? 0 : img.size;
    entry[1] = img.size === 256 ? 0 : img.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

mkdirSync(iconDir, { recursive: true });
const icoPath = path.join(iconDir, 'icon.ico');
writeFileSync(icoPath, buildIco([16, 32, 48, 256]));
console.log('应用图标已生成:', icoPath);
