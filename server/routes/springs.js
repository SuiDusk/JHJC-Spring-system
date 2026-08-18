import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// 导出/导入共用的中文列头 → 数据库字段 映射（顺序与前端导出一致）
const IMPORT_COLUMN_MAP = {
  '物料编码': 'material_code',
  '名称': 'name',
  '规格': 'specification',
  '材质': 'material_type',
  '线径mm': 'wire_diameter',
  '外径mm': 'outer_diameter',
  '自由长度mm': 'free_length',
  '总圈数': 'total_coils',
  '旋向': 'winding_direction',
  '库存数量': 'quantity',
  '单位': 'unit',
  '仓库区域': 'warehouse_area_id',
  '状态': 'status',
  '最低库存': 'min_stock',
  '最高库存': 'max_stock',
  '单价': 'unit_price',
  '供应商': 'supplier',
  '备注': 'remark',
};

const STATUS_MAP = { '正常': 'normal', '锁定': 'locked', '次品': 'defective', '预留': 'reserved' };
const WINDING_MAP = { '左旋': 'left', '右旋': 'right' };

// 获取所有弹簧库存（支持搜索和区域筛选）
router.get('/', (req, res) => {
  const db = getDb();
  const { search, area_id, status, low_stock } = req.query;
  let sql = `
    SELECT s.*, w.name as area_name, w.code as area_code
    FROM springs s
    LEFT JOIN warehouse_areas w ON s.warehouse_area_id = w.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ` AND (s.material_code LIKE ? OR s.name LIKE ? OR s.specification LIKE ? OR s.supplier LIKE ?)`;
    const kw = `%${search}%`;
    params.push(kw, kw, kw, kw);
  }
  if (area_id) {
    sql += ` AND s.warehouse_area_id = ?`;
    params.push(area_id);
  }
  if (status) {
    sql += ` AND s.status = ?`;
    params.push(status);
  }
  if (low_stock === '1') {
    sql += ` AND s.quantity <= s.min_stock AND s.min_stock > 0`;
  }

  sql += ` ORDER BY s.updated_at DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// 获取单个弹簧详情
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, w.name as area_name, w.code as area_code
    FROM springs s
    LEFT JOIN warehouse_areas w ON s.warehouse_area_id = w.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: '物料不存在' });
  res.json(row);
});

// 创建新弹簧物料
router.post('/', (req, res) => {
  const { material_code, name, specification, material_type, wire_diameter, outer_diameter,
    free_length, total_coils, winding_direction, quantity, unit, status,
    warehouse_area_id, min_stock, max_stock, unit_price, supplier, remark } = req.body;

  if (!material_code || !name) return res.status(400).json({ error: '物料编码和名称必填' });

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO springs (material_code, name, specification, material_type, wire_diameter,
        outer_diameter, free_length, total_coils, winding_direction, quantity, unit, status,
        warehouse_area_id, min_stock, max_stock, unit_price, supplier, remark)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(material_code, name, specification || '', material_type || '', wire_diameter || 0,
      outer_diameter || 0, free_length || 0, total_coils || 0, winding_direction || 'right',
      quantity || 0, unit || '个', status || 'normal',
      warehouse_area_id || null, min_stock || 0, max_stock || 0,
      unit_price || 0, supplier || '', remark || '');

    const row = db.prepare(`
      SELECT s.*, w.name as area_name, w.code as area_code
      FROM springs s LEFT JOIN warehouse_areas w ON s.warehouse_area_id = w.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '物料编码已存在' });
    res.status(500).json({ error: e.message });
  }
});

// 批量导入弹簧物料（格式与导出一致，支持按物料编码新增/更新）
// 请求体: { rows: [ { 物料编码, 名称, ... }, ... ] }，rows 的键为中文列头
router.post('/import', (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows)) return res.status(400).json({ error: '导入数据格式不正确' });
  if (rows.length === 0) return res.status(400).json({ error: '没有可导入的数据' });

  const db = getDb();
  // 预取区域映射：名称 -> id，用于把导出的"仓库区域"中文名转回 id
  const areaRows = db.prepare('SELECT id, name FROM warehouse_areas').all();
  const areaMap = {};
  for (const a of areaRows) areaMap[a.name] = a.id;

  const insertStmt = db.prepare(`
    INSERT INTO springs (material_code, name, specification, material_type, wire_diameter,
      outer_diameter, free_length, total_coils, winding_direction, quantity, unit, status,
      warehouse_area_id, min_stock, max_stock, unit_price, supplier, remark)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(material_code) DO UPDATE SET
      name=excluded.name, specification=excluded.specification, material_type=excluded.material_type,
      wire_diameter=excluded.wire_diameter, outer_diameter=excluded.outer_diameter,
      free_length=excluded.free_length, total_coils=excluded.total_coils,
      winding_direction=excluded.winding_direction, quantity=excluded.quantity, unit=excluded.unit,
      status=excluded.status, warehouse_area_id=excluded.warehouse_area_id,
      min_stock=excluded.min_stock, max_stock=excluded.max_stock, unit_price=excluded.unit_price,
      supplier=excluded.supplier, remark=excluded.remark, updated_at=CURRENT_TIMESTAMP
  `);

  const created = [];
  const updated = [];
  const errors = [];
  const toNumber = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const run = db.transaction(() => {
    rows.forEach((raw, index) => {
      // 规范化：将中文列头（或前端已转好的英文字段）统一读取
      const get = (key) => {
        if (raw[key] !== undefined) return raw[key];
        const field = IMPORT_COLUMN_MAP[key];
        return raw[field];
      };
      const getAny = (...keys) => {
        for (const k of keys) {
          const v = raw[k] !== undefined ? raw[k] : raw[IMPORT_COLUMN_MAP[k]];
          if (v !== undefined && v !== null && v !== '') return v;
        }
        return undefined;
      };

      const material_code = String(getAny('物料编码', 'material_code') ?? '').trim();
      const name = String(getAny('名称', 'name') ?? '').trim();
      if (!material_code || !name) {
        errors.push(`第 ${index + 2} 行：物料编码和名称为必填`);
        return;
      }

      // 区域名称 -> id
      const areaName = getAny('仓库区域', 'warehouse_area_id');
      let warehouse_area_id = null;
      if (areaName !== undefined && areaName !== null && String(areaName).trim() !== '' && String(areaName).trim() !== '未分配') {
        warehouse_area_id = areaMap[String(areaName).trim()];
        if (!warehouse_area_id) {
          errors.push(`第 ${index + 2} 行：仓库区域 "${String(areaName).trim()}" 不存在`);
          return;
        }
      }

      // 状态/旋向 中文转英文
      const statusRaw = String(getAny('状态', 'status') ?? '正常').trim();
      const status = STATUS_MAP[statusRaw] || statusRaw;
      const windingRaw = String(getAny('旋向', 'winding_direction') ?? '右旋').trim();
      const winding_direction = WINDING_MAP[windingRaw] || windingRaw;

      const exists = db.prepare('SELECT id FROM springs WHERE material_code = ?').get(material_code);
      insertStmt.run(
        material_code, name,
        String(getAny('规格', 'specification') ?? ''),
        String(getAny('材质', 'material_type') ?? ''),
        toNumber(getAny('线径mm', 'wire_diameter')),
        toNumber(getAny('外径mm', 'outer_diameter')),
        toNumber(getAny('自由长度mm', 'free_length')),
        toNumber(getAny('总圈数', 'total_coils')),
        winding_direction,
        Math.floor(toNumber(getAny('库存数量', 'quantity'))),
        String(getAny('单位', 'unit') ?? '个'),
        status,
        warehouse_area_id,
        Math.floor(toNumber(getAny('最低库存', 'min_stock'))),
        Math.floor(toNumber(getAny('最高库存', 'max_stock'))),
        toNumber(getAny('单价', 'unit_price')),
        String(getAny('供应商', 'supplier') ?? ''),
        String(getAny('备注', 'remark') ?? '')
      );
      if (exists) updated.push(material_code);
      else created.push(material_code);
    });
  });

  run();

  res.json({ created: created.length, updated: updated.length, errors });
});

// 更新弹簧物料
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM springs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '物料不存在' });

  const fields = ['material_code','name','specification','material_type','wire_diameter',
    'outer_diameter','free_length','total_coils','winding_direction','quantity','unit','status',
    'warehouse_area_id','min_stock','max_stock','unit_price','supplier','remark'];

  const setClauses = fields.map(f => `${f}=?`).join(',');
  const values = fields.map(f => req.body[f] !== undefined ? req.body[f] : existing[f]);

  db.prepare(`UPDATE springs SET ${setClauses}, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(...values, req.params.id);

  const row = db.prepare(`
    SELECT s.*, w.name as area_name, w.code as area_code
    FROM springs s LEFT JOIN warehouse_areas w ON s.warehouse_area_id = w.id
    WHERE s.id = ?
  `).get(req.params.id);
  res.json(row);
});

// 删除弹簧物料
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM springs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
