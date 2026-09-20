import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api';
import SpringForm from '../components/SpringForm';

const statusMap = { normal: '正常', locked: '锁定', defective: '次品', reserved: '预留' };

// 导入/导出一致的列定义（顺序与后端映射一致）
const IMPORT_HEADERS = [
  '物料编码', '名称', '规格', '材质', '线径mm', '外径mm', '自由长度mm', '总圈数',
  '旋向', '库存数量', '单位', '仓库区域', '状态', '最低库存', '最高库存', '单价', '供应商',
  '库位', '颜色', '详情', '备注',
];

export default function Inventory() {
  const [springs, setSprings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sort, setSort] = useState('updated');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filterArea) params.area_id = filterArea;
    if (filterStatus) params.status = filterStatus;
    if (filterLowStock) params.low_stock = '1';
    if (sort) params.sort = sort;

    Promise.all([api.getSprings(params), api.getAreas()])
      .then(([s, a]) => { setSprings(s); setAreas(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterArea, filterStatus, filterLowStock, sort]);

  useEffect(() => { loadData(); }, [loadData]);

  // 数据变化后清理无效选中项
  useEffect(() => {
    const validIds = new Set(springs.map(s => s.id));
    setSelectedIds(prev => new Set([...prev].filter(id => validIds.has(id))));
  }, [springs]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(springs.map(s => s.id)));
  };

  const invertSelect = () => {
    setSelectedIds(prev => {
      const allIds = new Set(springs.map(s => s.id));
      const next = new Set([...allIds].filter(id => !prev.has(id)));
      return next;
    });
  };

  const clearSelect = () => setSelectedIds(new Set());

  const allSelected = springs.length > 0 && springs.every(s => selectedIds.has(s.id));
  const selectedSprings = springs.filter(s => selectedIds.has(s.id));

  const handleExport = () => {
    if (selectedSprings.length === 0) {
      alert('请先勾选需要导出的物料');
      return;
    }
    const rows = selectedSprings.map(s => ({
      物料编码: s.material_code,
      名称: s.name,
      规格: s.specification || '',
      材质: s.material_type || '',
      线径mm: s.wire_diameter || 0,
      外径mm: s.outer_diameter || 0,
      自由长度mm: s.free_length || 0,
      总圈数: s.total_coils || 0,
      旋向: s.winding_direction === 'left' ? '左旋' : '右旋',
      库存数量: s.quantity,
      单位: s.unit || '个',
      仓库区域: s.area_name || '未分配',
      状态: statusMap[s.status] || s.status,
      最低库存: s.min_stock || 0,
      最高库存: s.max_stock || 0,
      单价: s.unit_price || 0,
      供应商: s.supplier || '',
      库位: s.location || '无',
      颜色: s.color || '无',
      详情: s.detail || '',
      备注: s.remark || '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '弹簧库存');
    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `弹簧库存_${ts}.xlsx`);
  };

  // 下载导入模板（格式与导出一致，含一行示例数据，导入时请删除示例行）
  const handleDownloadTemplate = () => {
    const sampleRow = {
      物料编码: 'SP-0001',
      名称: '压缩弹簧',
      规格: 'Φ20×50',
      材质: '65Mn',
      线径mm: 2,
      外径mm: 20,
      自由长度mm: 50,
      总圈数: 8.5,
      旋向: '右旋',
      库存数量: 100,
      单位: '个',
      仓库区域: 'A区-原材料仓',
      状态: '正常',
      最低库存: 10,
      最高库存: 500,
      单价: 2.5,
      供应商: '示例供应商',
      库位: 'A-01-03',
      颜色: '本色',
      详情: '示例：用于XX机型减震，需按图纸工艺处理',
      备注: '示例数据，导入前请删除此行',
    };
    const rows = IMPORT_HEADERS.map(h => ({ [h]: sampleRow[h] !== undefined ? sampleRow[h] : '' }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = IMPORT_HEADERS.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '弹簧库存模板');
    XLSX.writeFile(wb, '弹簧库存导入模板.xlsx');
  };

  // 选择并导入 Excel 文件
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) { alert('文件中没有工作表'); return; }
      // 将表头行作为对象键（json_to_sheet 导出的表头即为中文列名）
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (rawRows.length === 0) { alert('文件中没有数据可导入'); return; }
      const result = await api.importSprings(rawRows);
      setImportResult(result);
      if (result.errors && result.errors.length > 0) {
        alert(`导入完成：新增 ${result.created} 条，更新 ${result.updated} 条。\n有 ${result.errors.length} 条失败：\n${result.errors.slice(0, 10).join('\n')}`);
      } else {
        alert(`导入成功：新增 ${result.created} 条，更新 ${result.updated} 条。`);
      }
      loadData();
    } catch (err) {
      alert(`导入失败：${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // 置顶 / 取消置顶（置顶物料始终排在列表最前）
  const handleTogglePin = async (s) => {
    try {
      await api.togglePin(s.id, s.pinned ? 0 : 1);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`确定要删除物料 "${name}" 吗？`)) return;
    try {
      await api.deleteSpring(id);
      loadData();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>弹簧物料列表 ({springs.length})</h3>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + 新增物料
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="search-box" style={{ marginBottom: 16 }}>
          <input
            className="search-input"
            placeholder="搜索物料编码/名称/规格/详情..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">全部区域</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="locked">锁定</option>
            <option value="defective">次品</option>
            <option value="reserved">预留</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={filterLowStock} onChange={e => setFilterLowStock(e.target.checked)} />
            低库存预警
          </label>
          <select value={sort} onChange={e => setSort(e.target.value)} title="排序方式">
            <option value="updated">按最近更改时间排序</option>
            <option value="code">按物料编号排序</option>
            <option value="quantity">按库存数量排序</option>
          </select>
        </div>

        {/* 选择与导出工具栏 */}
        <div className="export-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>已选 {selectedSprings.length} 项</span>
          <button className="btn btn-outline btn-sm" onClick={selectAll} disabled={springs.length === 0}>全选</button>
          <button className="btn btn-outline btn-sm" onClick={invertSelect} disabled={springs.length === 0}>反选</button>
          <button className="btn btn-outline btn-sm" onClick={clearSelect} disabled={selectedIds.size === 0}>清空</button>
          <span style={{ flex: 1 }} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate}>⬇ 下载模板</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? '导入中...' : '⬆ 导入 Excel'}
          </button>
          <button className="btn btn-success btn-sm" onClick={handleExport} disabled={selectedSprings.length === 0}>
            ⬇ 导出 Excel ({selectedSprings.length})
          </button>
        </div>

        {/* 导入结果提示 */}
        {importResult && (
          <div style={{ fontSize: 13, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--success-light, #ecfdf5)', color: 'var(--success, #059669)' }}>
            导入完成：新增 <b>{importResult.created}</b> 条，更新 <b>{importResult.updated}</b> 条。
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ color: 'var(--danger)', marginTop: 4 }}>
                有 <b>{importResult.errors.length}</b> 条失败：{importResult.errors.slice(0, 5).join('；')}
              </div>
            )}
          </div>
        )}

        {/* 表格 */}
        {loading ? <div className="empty"><p>加载中...</p></div> :
          springs.length === 0 ? <div className="empty"><div className="icon">📭</div><p>暂无物料数据</p></div> :
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => (e.target.checked ? selectAll() : clearSelect())}
                    />
                  </th>
                  <th>物料编码</th>
                  <th>名称</th>
                  <th>规格</th>
                  <th>材质</th>
                  <th>线径(mm)</th>
                  <th>外径(mm)</th>
                  <th>库存数量</th>
                  <th>仓库区域</th>
                  <th>库位</th>
                  <th>颜色</th>
                  <th>详情</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {springs.map(s => (
                  <tr key={s.id} style={s.quantity <= s.min_stock && s.min_stock > 0 ? { background: '#fffbeb' } : {}}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {s.pinned ? (
                        <span style={{ fontSize: 11, fontFamily: 'inherit', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>置顶</span>
                      ) : null}
                      {s.material_code}
                    </td>
                    <td>{s.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.specification || '-'}</td>
                    <td>{s.material_type || '-'}</td>
                    <td>{s.wire_diameter || '-'}</td>
                    <td>{s.outer_diameter || '-'}</td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: s.quantity <= s.min_stock && s.min_stock > 0 ? 'var(--danger)' : s.quantity === 0 ? 'var(--gray-400)' : 'inherit' }}>
                        {s.quantity}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 2 }}>{s.unit}</span>
                    </td>
                    <td><span style={{ fontSize: 12, background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>{s.area_name || '未分配'}</span></td>
                    <td>{s.location || '无'}</td>
                    <td>{s.color || '无'}</td>
                    <td title={s.detail || ''} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--gray-600)' }}>
                      {s.detail || '-'}
                    </td>
                    <td><span className={`tag tag-${s.status}`}>{statusMap[s.status] || s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleTogglePin(s)}>
                          {s.pinned ? '取消置顶' : '置顶'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditing(s); setModalOpen(true); }}>编辑</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      {modalOpen && (
        <SpringForm
          spring={editing}
          areas={areas}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={loadData}
        />
      )}
    </div>
  );
}
