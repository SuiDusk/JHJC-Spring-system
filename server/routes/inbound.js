import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// 获取所有入库记录
router.get('/', (req, res) => {
  const db = getDb();
  const { search, spring_id, start_date, end_date, page = 1, limit = 50 } = req.query;
  let conditions = [];
  let params = [];

  if (search) {
    // 对物料名称、物料编码、详情同时做模糊检索
    conditions.push('(s.name LIKE ? OR s.material_code LIKE ? OR s.detail LIKE ?)');
    const kw = `%${search}%`;
    params.push(kw, kw, kw);
  }
  if (spring_id) { conditions.push('ir.spring_id = ?'); params.push(spring_id); }
  if (start_date) { conditions.push('ir.created_at >= ?'); params.push(start_date); }
  if (end_date) { conditions.push('ir.created_at <= ?'); params.push(end_date + ' 23:59:59'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM inbound_records ir
    LEFT JOIN springs s ON ir.spring_id = s.id
    ${where}
  `).get(...params);
  const rows = db.prepare(`
    SELECT ir.*, s.material_code, s.name as spring_name, s.specification, s.unit, s.detail,
           w.name as area_name
    FROM inbound_records ir
    LEFT JOIN springs s ON ir.spring_id = s.id
    LEFT JOIN warehouse_areas w ON ir.warehouse_area_id = w.id
    ${where}
    ORDER BY ir.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ data: rows, total: countRow.total, page: Number(page), limit: Number(limit) });
});

// 创建入库记录（同时更新库存）
router.post('/', (req, res) => {
  const { spring_id, quantity, batch_no, operator, supplier, warehouse_area_id, remark } = req.body;
  if (!spring_id || !quantity || quantity <= 0) return res.status(400).json({ error: '物料和数量必填' });

  const db = getDb();
  const spring = db.prepare('SELECT * FROM springs WHERE id = ?').get(spring_id);
  if (!spring) return res.status(404).json({ error: '物料不存在' });

  const areaId = warehouse_area_id || spring.warehouse_area_id;

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO inbound_records (spring_id, quantity, batch_no, operator, supplier, warehouse_area_id, remark) VALUES (?,?,?,?,?,?,?)')
      .run(spring_id, quantity, batch_no || '', operator || '', supplier || '', areaId, remark || '');
    db.prepare('UPDATE springs SET quantity = quantity + ?, warehouse_area_id = COALESCE(?, warehouse_area_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, areaId, spring_id);
  });
  tx();

  const record = db.prepare(`
    SELECT ir.*, s.material_code, s.name as spring_name, s.specification, w.name as area_name
    FROM inbound_records ir
    LEFT JOIN springs s ON ir.spring_id = s.id
    LEFT JOIN warehouse_areas w ON ir.warehouse_area_id = w.id
    WHERE ir.id = last_insert_rowid()
  `).get();
  res.status(201).json(record);
});

// 删除入库记录（回退库存）
router.delete('/:id', (req, res) => {
  const db = getDb();
  const record = db.prepare('SELECT * FROM inbound_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  const tx = db.transaction(() => {
    // 不能减为负数
    const spring = db.prepare('SELECT quantity FROM springs WHERE id = ?').get(record.spring_id);
    if (spring && spring.quantity >= record.quantity) {
      db.prepare('UPDATE springs SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(record.quantity, record.spring_id);
    }
    db.prepare('DELETE FROM inbound_records WHERE id = ?').run(req.params.id);
  });
  tx();
  res.json({ success: true });
});

export default router;
