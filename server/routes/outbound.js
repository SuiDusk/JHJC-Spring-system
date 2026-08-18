import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// 获取所有出库记录
router.get('/', (req, res) => {
  const db = getDb();
  const { spring_id, start_date, end_date, page = 1, limit = 50 } = req.query;
  let conditions = [];
  let params = [];

  if (spring_id) { conditions.push('obr.spring_id = ?'); params.push(spring_id); }
  if (start_date) { conditions.push('obr.created_at >= ?'); params.push(start_date); }
  if (end_date) { conditions.push('obr.created_at <= ?'); params.push(end_date + ' 23:59:59'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM outbound_records obr ${where}`).get(...params);
  const rows = db.prepare(`
    SELECT obr.*, s.material_code, s.name as spring_name, s.specification, s.unit,
           w.name as area_name
    FROM outbound_records obr
    LEFT JOIN springs s ON obr.spring_id = s.id
    LEFT JOIN warehouse_areas w ON obr.warehouse_area_id = w.id
    ${where}
    ORDER BY obr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ data: rows, total: countRow.total, page: Number(page), limit: Number(limit) });
});

// 创建出库记录（同时扣减库存）
router.post('/', (req, res) => {
  const { spring_id, quantity, operator, recipient, purpose, order_no, warehouse_area_id, remark } = req.body;
  if (!spring_id || !quantity || quantity <= 0) return res.status(400).json({ error: '物料和数量必填' });

  const db = getDb();
  const spring = db.prepare('SELECT * FROM springs WHERE id = ?').get(spring_id);
  if (!spring) return res.status(404).json({ error: '物料不存在' });
  if (spring.quantity < quantity) return res.status(400).json({ error: `库存不足，当前库存: ${spring.quantity}` });

  const areaId = warehouse_area_id || spring.warehouse_area_id;

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO outbound_records (spring_id, quantity, operator, recipient, purpose, order_no, warehouse_area_id, remark) VALUES (?,?,?,?,?,?,?,?)')
      .run(spring_id, quantity, operator || '', recipient || '', purpose || '', order_no || '', areaId, remark || '');
    db.prepare('UPDATE springs SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, spring_id);
  });
  tx();

  const record = db.prepare(`
    SELECT obr.*, s.material_code, s.name as spring_name, s.specification, w.name as area_name
    FROM outbound_records obr
    LEFT JOIN springs s ON obr.spring_id = s.id
    LEFT JOIN warehouse_areas w ON obr.warehouse_area_id = w.id
    WHERE obr.id = last_insert_rowid()
  `).get();
  res.status(201).json(record);
});

// 删除出库记录（恢复库存）
router.delete('/:id', (req, res) => {
  const db = getDb();
  const record = db.prepare('SELECT * FROM outbound_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE springs SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(record.quantity, record.spring_id);
    db.prepare('DELETE FROM outbound_records WHERE id = ?').run(req.params.id);
  });
  tx();
  res.json({ success: true });
});

export default router;
