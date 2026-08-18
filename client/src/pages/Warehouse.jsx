import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function Warehouse() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', manager: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [areaStats, setAreaStats] = useState({});

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([api.getAreas(), api.getDashboard()])
      .then(([a, d]) => {
        setAreas(a);
        const stats = {};
        d.areaStats.forEach(s => { stats[s.id] = s; });
        setAreaStats(stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) { setError('名称和编码必填'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateArea(editing.id, form);
      } else {
        await api.createArea(form);
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', code: '', description: '', manager: '', status: 'active' });
      loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (area) => {
    if (!confirm(`确定删除区域 "${area.name}" 吗？`)) return;
    try {
      await api.deleteArea(area.id);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleEdit = (area) => {
    setEditing(area);
    setForm({ name: area.name, code: area.code, description: area.description, manager: area.manager, status: area.status });
    setModalOpen(true);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>仓库区域管理</h3>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', code: '', description: '', manager: '', status: 'active' }); setModalOpen(true); }}>
            + 新增区域
          </button>
        </div>

        {loading ? <div className="empty"><p>加载中...</p></div> :
          areas.length === 0 ? <div className="empty"><div className="icon">🏭</div><p>暂无仓库区域</p></div> :
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>区域编码</th>
                  <th>名称</th>
                  <th>描述</th>
                  <th>负责人</th>
                  <th>物料种类</th>
                  <th>库存总量</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {areas.map(a => {
                  const stats = areaStats[a.id];
                  return (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-500)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description || '-'}</td>
                      <td>{a.manager || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{stats ? stats.spring_count : 0}</td>
                      <td style={{ fontWeight: 600, fontSize: 16, color: 'var(--primary)' }}>{stats ? stats.total_qty : 0}</td>
                      <td><span className={`tag tag-${a.status}`}>{a.status === 'active' ? '启用' : '停用'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleEdit(a)}>编辑</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); setEditing(null); } }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editing ? '编辑区域' : '新增区域'}</h3>
              <button className="modal-close" onClick={() => { setModalOpen(false); setEditing(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="required">区域名称</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 A区-原材料仓" />
                </div>
                <div className="form-group">
                  <label className="required">区域编码</label>
                  <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="如 AREA-A" />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>负责人</label>
                    <input className="form-input" value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>状态</label>
                    <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">启用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8 }}>
                    {error}
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => { setModalOpen(false); setEditing(null); }}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? '保存中...' : editing ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
