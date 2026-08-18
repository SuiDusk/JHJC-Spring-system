import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// 获取所有仓库区域
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM warehouse_areas ORDER BY code').all();
  res.json(rows);
});

// 创建仓库区域
router.post('/', (req, res) => {
  const { name, code, description, manager } = req.body;
  if (!name || !code) return res.status(400).json({ error: '名称和编码必填' });
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO warehouse_areas (name, code, description, manager) VALUES (?,?,?,?)').run(name, code, description || '', manager || '');
    const row = db.prepare('SELECT * FROM warehouse_areas WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新仓库区域
router.put('/:id', (req, res) => {
  const { name, code, description, manager, status } = req.body;
  const db = getDb();
  const row = db.prepare('SELECT * FROM warehouse_areas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '区域不存在' });
  db.prepare(`UPDATE warehouse_areas SET name=?, code=?, description=?, manager=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name || row.name, code || row.code, description ?? row.description, manager ?? row.manager, status || row.status, req.params.id);
  const updated = db.prepare('SELECT * FROM warehouse_areas WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// 删除仓库区域
router.delete('/:id', (req, res) => {
  const db = getDb();
  const has = db.prepare('SELECT COUNT(*) as cnt FROM springs WHERE warehouse_area_id = ?').get(req.params.id);
  if (has.cnt > 0) return res.status(400).json({ error: '该区域下还有弹簧物料，无法删除' });
  db.prepare('DELETE FROM warehouse_areas WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
