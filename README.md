# 弹簧厂出入库管理系统

一个面向弹簧生产工厂的后台出入库管理系统，支持**网页端**与**桌面应用（Windows）**访问，数据本地存储（SQLite），并支持通过 GitHub Releases 手动检查更新。

## 功能特性

- 📊 **数据看板**：库存总量、今日/本月出入库、低库存预警、区域分布、状态分布、7天趋势
- 📦 **弹簧库存**：物料编码、规格/材质/线径/外径、库存数量、仓库区域、状态管理；搜索筛选、多选导出 Excel
- 📥 **入库管理**：选择物料入库、批号/供应商/操作人记录、自动更新库存
- 📤 **出库管理**：领用人/用途/订单号记录、库存不足拦截、自动扣减库存
- 🏭 **仓库区域**：A/B/C/D 区域管理、各区域物料统计
- ⚙️ **设置**：展示版本信息、手动检查更新（基于 GitHub Releases）
- 📤 **数据导出**：库存页面自由勾选（全选/反选/清空），导出为 Excel (.xlsx)

## 系统架构

```
client/    React 18 + Vite 前端（纯 CSS 响应式）
server/    Express + better-sqlite3 后端（ESM）
electron/  Electron 桌面主进程（内嵌 Express，本地 SQLite 持久化）
cloud-functions/  云端版本（可选，已保留）
```

- **网页版**：React 前端 + Express API + SQLite
- **桌面版**：Electron 主进程内嵌 Express，数据库存放在用户数据目录（`%APPDATA%/spring-inventory/`）
- **更新**：electron-updater 从 GitHub Releases 检测并手动更新

## 本地开发

```bash
# 安装依赖
npm run install:all        # 安装 server 与 client 依赖

# 启动后端（本地 API，端口 3001）
npm run dev:server

# 启动前端开发服务器（Vite 热更新）
npm run dev:client

# 桌面版调试（需先构建 client）
npm run desktop:start
```

访问 `http://localhost:5173` 查看网页版。

## 构建桌面安装包

```bash
# 生成 Windows 安装包 .exe
npm run build:desktop

# 产物输出到 release/
```

> 注意：本仓库打包配置了 `electronDist: node_modules/electron/dist` 复用本地 Electron，以及本地工具镜像 `scripts/bin-server.js`（提供 winCodeSign/nsis 二进制），以规避 Windows 下 darwin 符号链接解压失败的问题。打包前需先启动本地工具服务器并设置镜像变量，详见 `scripts/` 目录说明。

## 发布新版本（GitHub Releases 更新）

1. **修改版本号**：更新根 `package.json` 中 `version` 字段（如 `1.1.0`）
2. **配置发布源**：在 `electron-builder.yml` 的 `publish` 中填写你的 GitHub `owner` 和 `repo`
3. **发布构建**：
   ```bash
   npm run build:desktop:publish
   ```
   该命令会生成安装包并自动上传到 GitHub Releases（需要配置 `GH_TOKEN` 环境变量为具有 `repo` 权限的 Personal Access Token）
4. 用户打开应用的"设置 → 检查更新"即可检测到新版本并手动下载更新

> ⚠️ **Windows 未签名提示**：由于当前未配置代码签名证书，用户首次下载更新时 Windows SmartScreen 可能弹出提示，需选择"仍要运行"。正式商用建议申请代码签名证书并在 electron-builder 中配置。

## 数据存储

- 数据库文件：`spring_inventory.db`（SQLite）
- 桌面版路径：`%APPDATA%/spring-inventory/spring_inventory.db`
- 网页/本地开发路径：`server/spring_inventory.db`
- 卸载桌面应用默认**保留**数据（可在 NSIS 卸载时选择）

## 技术栈

- 前端：React 18、React Router 6、Vite、SheetJS (xlsx)
- 后端：Express、better-sqlite3
- 桌面：Electron 31、electron-builder、electron-updater
