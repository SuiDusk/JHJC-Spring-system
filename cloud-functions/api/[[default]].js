import express from 'express';

// ========== 数据存储层（内存存储） ==========
// 生产环境请替换为 MySQL/PostgreSQL 等持久化数据库

const DB = {
  warehouse_areas: [],
  springs: [],
  inbound_records: [],
  outbound_records: []
};

let nextId = { area: 1, spring: 1, inbound: 1, outbound: 1 };

const now = () => new Date().toISOString();

// 初始化默认数据
function initData() {
  DB.warehouse_areas = [
    { id: 1, name: 'A区-原材料仓', code: 'AREA-A', description: '存放原材料弹簧', manager: '张工', status: 'active', created_at: now(), updated_at: now() },
    { id: 2, name: 'B区-半成品仓', code: 'AREA-B', description: '存放半成品弹簧', manager: '李工', status: 'active', created_at: now(), updated_at: now() },
    { id: 3, name: 'C区-成品仓', code: 'AREA-C', description: '存放成品弹簧', manager: '王工', status: 'active', created_at: now(), updated_at: now() },
    { id: 4, name: 'D区-退货仓', code: 'AREA-D', description: '存放退货/待处理弹簧', manager: '', status: 'active', created_at: now(), updated_at: now() },
  ];
  nextId.area = 5;

  DB.springs = [
    { id: 1, material_code: 'SP-001', name: '压缩弹簧', specification: 'Φ3×20×80', material_type: '65Mn', wire_diameter: 3, outer_diameter: 20, free_length: 80, total_coils: 10, winding_direction: 'right', quantity: 1500, unit: '个', status: 'normal', warehouse_area_id: 1, min_stock: 200, max_stock: 5000, unit_price: 0.85, supplier: '鑫达弹簧材料', remark: '', created_at: now(), updated_at: now() },
    { id: 2, material_code: 'SP-002', name: '拉伸弹簧', specification: 'Φ2×15×60', material_type: '304不锈钢', wire_diameter: 2, outer_diameter: 15, free_length: 60, total_coils: 20, winding_direction: 'right', quantity: 800, unit: '个', status: 'normal', warehouse_area_id: 1, min_stock: 100, max_stock: 3000, unit_price: 1.20, supplier: '恒通金属材料', remark: '', created_at: now(), updated_at: now() },
    { id: 3, material_code: 'SP-003', name: '扭转弹簧', specification: 'Φ4×25×100', material_type: '55CrSi', wire_diameter: 4, outer_diameter: 25, free_length: 100, total_coils: 8, winding_direction: 'left', quantity: 50, unit: '个', status: 'normal', warehouse_area_id: 2, min_stock: 100, max_stock: 2000, unit_price: 2.50, supplier: '鑫达弹簧材料', remark: '低库存预警', created_at: now(), updated_at: now() },
    { id: 4, material_code: 'SP-004', name: '波形弹簧', specification: 'Φ1.5×30×15', material_type: '301不锈钢', wire_diameter: 1.5, outer_diameter: 30, free_length: 15, total_coils: 3, winding_direction: 'right', quantity: 2000, unit: '个', status: 'normal', warehouse_area_id: 3, min_stock: 300, max_stock: 10000, unit_price: 0.60, supplier: '恒通金属材料', remark: '', created_at: now(), updated_at: now() },
    { id: 5, material_code: 'SP-005', name: '模具弹簧', specification: 'Φ6×35×150', material_type: '50CrVA', wire_diameter: 6, outer_diameter: 35, free_length: 150, total_coils: 7, winding_direction: 'right', quantity: 320, unit: '个', status: 'locked', warehouse_area_id: 2, min_stock: 50, max_stock: 1500, unit_price: 8.00, supplier: '龙腾精密弹簧', remark: '质检中', created_at: now(), updated_at: now() },
    { id: 6, material_code: 'SP-006', name: '气门弹簧', specification: 'Φ3.5×22×55', material_type: '55CrSi', wire_diameter: 3.5, outer_diameter: 22, free_length: 55, total_coils: 6.5, winding_direction: 'right', quantity: 1200, unit: '个', status: 'normal', warehouse_area_id: 3, min_stock: 200, max_stock: 5000, unit_price: 1.50, supplier: '龙腾精密弹簧', remark: '', created_at: now(), updated_at: now() },
  ];
  nextId.spring = 7;

  // 示例入库记录
  const t1 = new Date(); t1.setHours(t1.getHours() - 2);
  const t2 = new Date(); t2.setDate(t2.getDate() - 1);
  const t3 = new Date(); t3.setDate(t3.getDate() - 2);
  DB.inbound_records = [
    { id: 1, spring_id: 1, quantity: 500, batch_no: 'B20260801', operator: '张三', supplier: '鑫达弹簧材料', warehouse_area_id: 1, remark: '新批次入库', created_at: t1.toISOString() },
    { id: 2, spring_id: 4, quantity: 1000, batch_no: 'B20260730', operator: '张三', supplier: '恒通金属材料', warehouse_area_id: 3, remark: '', created_at: t2.toISOString() },
    { id: 3, spring_id: 6, quantity: 600, batch_no: 'B20260728', operator: '李四', supplier: '龙腾精密弹簧', warehouse_area_id: 3, remark: '', created_at: t3.toISOString() },
  ];
  nextId.inbound = 4;

  const t4 = new Date(); t4.setHours(t4.getHours() - 1);
  DB.outbound_records = [
    { id: 1, spring_id: 3, quantity: 200, operator: '王五', recipient: '组装车间', purpose: '生产用', order_no: 'O2026080401', warehouse_area_id: 2, remark: '', created_at: t4.toISOString() },
  ];
  nextId.outbound = 2;
}

initData();

// ========== Express App ==========
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ========== Dashboard ==========
app.get('/api/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const totalSprings = DB.springs.length;
  const totalQuantity = DB.springs.reduce((s, sp) => s + sp.quantity, 0);
  const lowStockCount = DB.springs.filter(s => s.quantity <= s.min_stock && s.min_stock > 0).length;
  const todayInbound = DB.inbound_records.filter(r => r.created_at.startsWith(today)).reduce((s, r) => s + r.quantity, 0);
  const todayOutbound = DB.outbound_records.filter(r => r.created_at.startsWith(today)).reduce((s, r) => s + r.quantity, 0);
  const monthInbound = DB.inbound_records.filter(r => r.created_at.startsWith(thisMonth)).reduce((s, r) => s + r.quantity, 0);
  const monthOutbound = DB.outbound_records.filter(r => r.created_at.startsWith(thisMonth)).reduce((s, r) => s + r.quantity, 0);

  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = d.toISOString().split('T')[0];
    const inQty = DB.inbound_records.filter(r => r.created_at.startsWith(day)).reduce((s, r) => s + r.quantity, 0);
    const outQty = DB.outbound_records.filter(r => r.created_at.startsWith(day)).reduce((s, r) => s + r.quantity, 0);
    if (inQty > 0) trend.push({ day, type: 'inbound', total: inQty });
    if (outQty > 0) trend.push({ day, type: 'outbound', total: outQty });
  }

  const areaStats = DB.warehouse_areas.map(w => {
    const ss = DB.springs.filter(s => s.warehouse_area_id === w.id);
    return { id: w.id, name: w.name, code: w.code, spring_count: ss.length, total_qty: ss.reduce((a, s) => a + s.quantity, 0) };
  });

  const statusMap = {};
  DB.springs.forEach(s => {
    if (!statusMap[s.status]) statusMap[s.status] = { cnt: 0, total_qty: 0 };
    statusMap[s.status].cnt++;
    statusMap[s.status].total_qty += s.quantity;
  });
  const statusStats = Object.entries(statusMap).map(([status, v]) => ({ status, ...v }));

  res.json({ totalSprings, totalQuantity, lowStockCount, todayInbound, todayOutbound, monthInbound, monthOutbound, trend, areaStats, statusStats });
});

// ========== 仓库区域 ==========
app.get('/api/warehouse', (req, res) => {
  res.json([...DB.warehouse_areas].sort((a, b) => a.code.localeCompare(b.code)));
});

app.post('/api/warehouse', (req, res) => {
  const { name, code, description, manager } = req.body;
  if (!name || !code) return res.status(400).json({ error: '名称和编码必填' });
  if (DB.warehouse_areas.find(a => a.code === code)) return res.status(400).json({ error: '编码已存在' });
  const area = { id: nextId.area++, name, code, description: description || '', manager: manager || '', status: 'active', created_at: now(), updated_at: now() };
  DB.warehouse_areas.push(area);
  res.status(201).json(area);
});

app.put('/api/warehouse/:id', (req, res) => {
  const a = DB.warehouse_areas.find(w => w.id === Number(req.params.id));
  if (!a) return res.status(404).json({ error: '不存在' });
  ['name','code','description','manager','status'].forEach(k => { if (req.body[k] !== undefined) a[k] = req.body[k]; });
  a.updated_at = now();
  res.json(a);
});

app.delete('/api/warehouse/:id', (req, res) => {
  if (DB.springs.some(s => s.warehouse_area_id === Number(req.params.id)))
    return res.status(400).json({ error: '该区域下有物料，无法删除' });
  DB.warehouse_areas = DB.warehouse_areas.filter(w => w.id !== Number(req.params.id));
  res.json({ success: true });
});

// ========== 弹簧物料 ==========
app.get('/api/springs', (req, res) => {
  let springs = [...DB.springs];
  const { search, area_id, status, low_stock } = req.query;
  if (search) { const kw = search.toLowerCase(); springs = springs.filter(s => (s.material_code + s.name + s.specification + s.supplier).toLowerCase().includes(kw)); }
  if (area_id) springs = springs.filter(s => s.warehouse_area_id === Number(area_id));
  if (status) springs = springs.filter(s => s.status === status);
  if (low_stock === '1') springs = springs.filter(s => s.quantity <= s.min_stock && s.min_stock > 0);
  springs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(springs.map(s => ({ ...s, area_name: DB.warehouse_areas.find(w => w.id === s.warehouse_area_id)?.name || null, area_code: DB.warehouse_areas.find(w => w.id === s.warehouse_area_id)?.code || null })));
});

app.get('/api/springs/:id', (req, res) => {
  const s = DB.springs.find(sp => sp.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: '不存在' });
  res.json({ ...s, area_name: DB.warehouse_areas.find(w => w.id === s.warehouse_area_id)?.name || null, area_code: DB.warehouse_areas.find(w => w.id === s.warehouse_area_id)?.code || null });
});

app.post('/api/springs', (req, res) => {
  const { material_code, name } = req.body;
  if (!material_code || !name) return res.status(400).json({ error: '编码和名称必填' });
  if (DB.springs.find(s => s.material_code === material_code)) return res.status(400).json({ error: '编码已存在' });
  const s = {
    id: nextId.spring++, material_code, name,
    specification: '', material_type: '', wire_diameter: 0, outer_diameter: 0,
    free_length: 0, total_coils: 0, winding_direction: 'right',
    quantity: 0, unit: '个', status: 'normal',
    warehouse_area_id: null, min_stock: 0, max_stock: 0,
    unit_price: 0, supplier: '', remark: '',
    created_at: now(), updated_at: now(),
    ...Object.fromEntries(Object.entries(req.body).filter(([,v]) => v !== undefined))
  };
  DB.springs.push(s);
  res.status(201).json({ ...s, area_name: null, area_code: null });
});

app.put('/api/springs/:id', (req, res) => {
  const s = DB.springs.find(sp => sp.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: '不存在' });
  ['material_code','name','specification','material_type','wire_diameter','outer_diameter','free_length','total_coils','winding_direction','quantity','unit','status','warehouse_area_id','min_stock','max_stock','unit_price','supplier','remark'].forEach(k => { if (req.body[k] !== undefined) s[k] = req.body[k]; });
  s.updated_at = now();
  res.json(s);
});

app.delete('/api/springs/:id', (req, res) => {
  DB.springs = DB.springs.filter(s => s.id !== Number(req.params.id));
  res.json({ success: true });
});

// ========== 入库 ==========
app.get('/api/inbound', (req, res) => {
  let records = [...DB.inbound_records];
  const { spring_id, start_date, end_date, page = 1, limit = 50 } = req.query;
  if (spring_id) records = records.filter(r => r.spring_id === Number(spring_id));
  if (start_date) records = records.filter(r => r.created_at >= start_date);
  if (end_date) records = records.filter(r => r.created_at <= end_date + 'T23:59:59');
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = records.length;
  const paged = records.slice((page - 1) * limit, page * limit);
  res.json({ data: paged.map(r => enrichRecord(r)), total, page: +page, limit: +limit });
});

app.post('/api/inbound', (req, res) => {
  const { spring_id, quantity } = req.body;
  if (!spring_id || !quantity || quantity <= 0) return res.status(400).json({ error: '参数错误' });
  const sIdx = DB.springs.findIndex(s => s.id === +spring_id);
  if (sIdx === -1) return res.status(404).json({ error: '物料不存在' });
  const areaId = req.body.warehouse_area_id || DB.springs[sIdx].warehouse_area_id;
  const r = { id: nextId.inbound++, spring_id: +spring_id, quantity: +quantity, batch_no: req.body.batch_no || '', operator: req.body.operator || '', supplier: req.body.supplier || '', warehouse_area_id: areaId, remark: req.body.remark || '', created_at: now() };
  DB.inbound_records.push(r);
  DB.springs[sIdx].quantity += +quantity;
  if (areaId) DB.springs[sIdx].warehouse_area_id = areaId;
  DB.springs[sIdx].updated_at = now();
  res.status(201).json(enrichRecord(r));
});

app.delete('/api/inbound/:id', (req, res) => {
  const idx = DB.inbound_records.findIndex(r => r.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: '不存在' });
  const r = DB.inbound_records[idx];
  const s = DB.springs.find(s => s.id === r.spring_id);
  if (s && s.quantity >= r.quantity) { s.quantity -= r.quantity; s.updated_at = now(); }
  DB.inbound_records.splice(idx, 1);
  res.json({ success: true });
});

// ========== 出库 ==========
app.get('/api/outbound', (req, res) => {
  let records = [...DB.outbound_records];
  const { spring_id, start_date, end_date, page = 1, limit = 50 } = req.query;
  if (spring_id) records = records.filter(r => r.spring_id === Number(spring_id));
  if (start_date) records = records.filter(r => r.created_at >= start_date);
  if (end_date) records = records.filter(r => r.created_at <= end_date + 'T23:59:59');
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = records.length;
  const paged = records.slice((page - 1) * limit, page * limit);
  res.json({ data: paged.map(r => enrichRecord(r)), total, page: +page, limit: +limit });
});

app.post('/api/outbound', (req, res) => {
  const { spring_id, quantity } = req.body;
  if (!spring_id || !quantity || quantity <= 0) return res.status(400).json({ error: '参数错误' });
  const sIdx = DB.springs.findIndex(s => s.id === +spring_id);
  if (sIdx === -1) return res.status(404).json({ error: '物料不存在' });
  if (DB.springs[sIdx].quantity < +quantity) return res.status(400).json({ error: `库存不足，当前: ${DB.springs[sIdx].quantity}` });
  const areaId = req.body.warehouse_area_id || DB.springs[sIdx].warehouse_area_id;
  const r = { id: nextId.outbound++, spring_id: +spring_id, quantity: +quantity, operator: req.body.operator || '', recipient: req.body.recipient || '', purpose: req.body.purpose || '', order_no: req.body.order_no || '', warehouse_area_id: areaId, remark: req.body.remark || '', created_at: now() };
  DB.outbound_records.push(r);
  DB.springs[sIdx].quantity -= +quantity;
  DB.springs[sIdx].updated_at = now();
  res.status(201).json(enrichRecord(r));
});

app.delete('/api/outbound/:id', (req, res) => {
  const idx = DB.outbound_records.findIndex(r => r.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: '不存在' });
  const r = DB.outbound_records[idx];
  const s = DB.springs.find(s => s.id === r.spring_id);
  if (s) { s.quantity += r.quantity; s.updated_at = now(); }
  DB.outbound_records.splice(idx, 1);
  res.json({ success: true });
});

// 兜底
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 辅助
function enrichRecord(r) {
  const s = DB.springs.find(sp => sp.id === r.spring_id);
  return { ...r, material_code: s?.material_code || '', spring_name: s?.name || '', specification: s?.specification || '', unit: s?.unit || '', area_name: DB.warehouse_areas.find(w => w.id === r.warehouse_area_id)?.name || '' };
}

export default app;
