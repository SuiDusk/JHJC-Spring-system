import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

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
