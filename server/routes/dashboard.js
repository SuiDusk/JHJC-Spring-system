import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();

  const totalSprings = db.prepare('SELECT COUNT(*) as cnt FROM springs').get().cnt;
  const totalQuantity = db.prepare('SELECT COALESCE(SUM(quantity), 0) as sum FROM springs').get().sum;
  const lowStockCount = db.prepare('SELECT COUNT(*) as cnt FROM springs WHERE quantity <= min_stock AND min_stock > 0').get().cnt;

  const todayInbound = db.prepare(
    `SELECT COALESCE(SUM(quantity), 0) as sum FROM inbound_records WHERE date(created_at) = date('now','localtime')`
  ).get().sum;

  const todayOutbound = db.prepare(
    `SELECT COALESCE(SUM(quantity), 0) as sum FROM outbound_records WHERE date(created_at) = date('now','localtime')`
  ).get().sum;

  const monthInbound = db.prepare(
    `SELECT COALESCE(SUM(quantity), 0) as sum FROM inbound_records WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')`
  ).get().sum;

  const monthOutbound = db.prepare(
    `SELECT COALESCE(SUM(quantity), 0) as sum FROM outbound_records WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')`
  ).get().sum;

  // 最近7天趋势
  const trend = db.prepare(`
    SELECT date(created_at) as day, 'inbound' as type, SUM(quantity) as total
    FROM inbound_records
    WHERE created_at >= date('now','localtime','-6 days')
    GROUP BY date(created_at)
    UNION ALL
    SELECT date(created_at) as day, 'outbound' as type, SUM(quantity) as total
    FROM outbound_records
    WHERE created_at >= date('now','localtime','-6 days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all();

  // 各区域库存统计
  const areaStats = db.prepare(`
    SELECT w.id, w.name, w.code, COUNT(s.id) as spring_count, COALESCE(SUM(s.quantity),0) as total_qty
    FROM warehouse_areas w
    LEFT JOIN springs s ON s.warehouse_area_id = w.id
    GROUP BY w.id
    ORDER BY w.code
  `).all();

  // 状态分布
  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as cnt, COALESCE(SUM(quantity),0) as total_qty
    FROM springs GROUP BY status
  `).all();

  res.json({
    totalSprings,
    totalQuantity,
    lowStockCount,
    todayInbound,
    todayOutbound,
    monthInbound,
    monthOutbound,
    trend,
    areaStats,
    statusStats
  });
});

export default router;
