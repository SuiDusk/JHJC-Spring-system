import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 优先使用环境变量注入的目录（Electron 桌面版指向 userData），否则使用原目录保持本地开发兼容
const dbPath = process.env.SPRING_DB_PATH
  ? path.join(process.env.SPRING_DB_PATH, 'spring_inventory.db')
  : path.join(__dirname, 'spring_inventory.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouse_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      manager TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS springs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      specification TEXT DEFAULT '',
      material_type TEXT DEFAULT '',
      wire_diameter REAL DEFAULT 0,
      outer_diameter REAL DEFAULT 0,
      free_length REAL DEFAULT 0,
      total_coils REAL DEFAULT 0,
      winding_direction TEXT DEFAULT 'right' CHECK(winding_direction IN ('left','right')),
      quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT '个',
      status TEXT DEFAULT 'normal' CHECK(status IN ('normal','locked','defective','reserved')),
      warehouse_area_id INTEGER,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_area_id) REFERENCES warehouse_areas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inbound_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spring_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      batch_no TEXT DEFAULT '',
      operator TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      warehouse_area_id INTEGER,
      remark TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (spring_id) REFERENCES springs(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_area_id) REFERENCES warehouse_areas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS outbound_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spring_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      operator TEXT DEFAULT '',
      recipient TEXT DEFAULT '',
      purpose TEXT DEFAULT '',
      order_no TEXT DEFAULT '',
      warehouse_area_id INTEGER,
      remark TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (spring_id) REFERENCES springs(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_area_id) REFERENCES warehouse_areas(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_springs_material_code ON springs(material_code);
    CREATE INDEX IF NOT EXISTS idx_springs_area ON springs(warehouse_area_id);
    CREATE INDEX IF NOT EXISTS idx_springs_status ON springs(status);
    CREATE INDEX IF NOT EXISTS idx_inbound_spring ON inbound_records(spring_id);
    CREATE INDEX IF NOT EXISTS idx_outbound_spring ON outbound_records(spring_id);
  `);

  // 插入默认仓库区域
  const insert = db.prepare(`INSERT OR IGNORE INTO warehouse_areas (name, code, description) VALUES (?, ?, ?)`);
  insert.run('A区-原材料仓', 'AREA-A', '存放原材料弹簧');
  insert.run('B区-半成品仓', 'AREA-B', '存放半成品弹簧');
  insert.run('C区-成品仓', 'AREA-C', '存放成品弹簧');
  insert.run('D区-退货仓', 'AREA-D', '存放退货/待处理弹簧');
}

export default getDb;
