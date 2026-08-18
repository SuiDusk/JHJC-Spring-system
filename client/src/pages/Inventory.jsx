import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api';
import SpringForm from '../components/SpringForm';

const statusMap = { normal: '正常', locked: '锁定', defective: '次品', reserved: '预留' };

export default function Inventory() {
  const [springs, setSprings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filterArea) params.area_id = filterArea;
    if (filterStatus) params.status = filterStatus;
    if (filterLowStock) params.low_stock = '1';

    Promise.all([api.getSprings(params), api.getAreas()])
      .then(([s, a]) => { setSprings(s); setAreas(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterArea, filterStatus, filterLowStock]);

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
      备注: s.remark || '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '弹簧库存');
    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `弹簧库存_${ts}.xlsx`);
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
            placeholder="搜索物料编码/名称/规格..."
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
        </div>

        {/* 选择与导出工具栏 */}
        <div className="export-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>已选 {selectedSprings.length} 项</span>
          <button className="btn btn-outline btn-sm" onClick={selectAll} disabled={springs.length === 0}>全选</button>
          <button className="btn btn-outline btn-sm" onClick={invertSelect} disabled={springs.length === 0}>反选</button>
          <button className="btn btn-outline btn-sm" onClick={clearSelect} disabled={selectedIds.size === 0}>清空</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn-success btn-sm" onClick={handleExport} disabled={selectedSprings.length === 0}>
            ⬇ 导出 Excel ({selectedSprings.length})
          </button>
        </div>

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
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--primary)' }}>{s.material_code}</td>
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
                    <td><span className={`tag tag-${s.status}`}>{statusMap[s.status] || s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
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
