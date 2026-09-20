import { useState, useEffect } from 'react';
import { api } from '../api';

export default function InOutForm({ type, onClose, onSave }) {
  const [springs, setSprings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    spring_id: '', quantity: '', batch_no: '', operator: '',
    supplier: '', recipient: '', purpose: '', order_no: '',
    warehouse_area_id: '', remark: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchSpring, setSearchSpring] = useState('');

  const isIn = type === 'in';

  useEffect(() => {
    api.getSprings().then(setSprings).catch(() => {});
    api.getAreas().then(setAreas).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectedSpring = springs.find(s => s.id === Number(form.spring_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.spring_id || !form.quantity || Number(form.quantity) <= 0) {
      setError('请选择物料并输入有效数量');
      return;
    }
    if (!isIn && selectedSpring && Number(form.quantity) > selectedSpring.quantity) {
      setError(`库存不足！当前库存: ${selectedSpring.quantity}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = { ...form, quantity: Number(form.quantity), spring_id: Number(form.spring_id) };
      if (!data.warehouse_area_id) data.warehouse_area_id = null;
      if (isIn) {
        await api.createInbound(data);
      } else {
        await api.createOutbound(data);
      }
      onSave();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 关键字（忽略大小写与首尾空格）：支持物料编码 / 名称 / 详情 模糊匹配
  const kw = searchSpring.trim().toLowerCase();
  const matchedSprings = kw
    ? springs.filter(s =>
        (s.material_code || '').toLowerCase().includes(kw) ||
        (s.name || '').toLowerCase().includes(kw) ||
        (s.detail || '').toLowerCase().includes(kw))
    : springs;
  // 已选中的物料始终保留在候选项中，避免筛选后选中项从列表中"消失"
  const filteredSprings =
    selectedSpring && !matchedSprings.some(s => s.id === selectedSpring.id)
      ? [selectedSpring, ...matchedSprings]
      : matchedSprings;

  // 候选项中附带详情摘要，便于确认命中的内容
  const detailBrief = (s) => {
    const text = (s.detail || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return ' | ' + (text.length > 24 ? text.slice(0, 24) + '…' : text);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isIn ? '新增入库' : '新增出库'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="required">选择物料</label>
              <input
                className="form-input"
                placeholder="搜索物料编码 / 名称 / 详情..."
                value={searchSpring}
                onChange={e => setSearchSpring(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              {kw && (
                <div style={{ fontSize: 12, marginBottom: 8, color: matchedSprings.length ? 'var(--gray-500)' : 'var(--danger)' }}>
                  {matchedSprings.length > 0
                    ? `匹配到 ${matchedSprings.length} 项，见下方"请选择物料"列表`
                    : (selectedSpring ? '未找到匹配物料，下方保留当前已选物料' : '未找到匹配的物料')}
                </div>
              )}
              <select
                className="form-input"
                name="spring_id"
                value={form.spring_id}
                onChange={handleChange}
                size={Math.min(filteredSprings.length + 1, 7)}
                style={{ height: 'auto' }}
              >
                <option value="">请选择物料</option>
                {filteredSprings.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.material_code}] {s.name} - 库存: {s.quantity}{s.unit}{detailBrief(s)}
                  </option>
                ))}
              </select>
              {selectedSpring && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-500)' }}>
                  当前库存: <strong>{selectedSpring.quantity}{selectedSpring.unit}</strong> | 区域: {selectedSpring.area_name || '未分配'}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="required">{isIn ? '入库' : '出库'}数量</label>
                <input
                  className="form-input"
                  name="quantity" type="number" min="1"
                  value={form.quantity} onChange={handleChange}
                  placeholder="输入数量"
                />
              </div>
              <div className="form-group">
                <label>仓库区域</label>
                <select className="form-input" name="warehouse_area_id" value={form.warehouse_area_id} onChange={handleChange}>
                  <option value="">默认</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>操作人</label>
                <input className="form-input" name="operator" value={form.operator} onChange={handleChange} />
              </div>
              {isIn ? (
                <>
                  <div className="form-group">
                    <label>供应商</label>
                    <input className="form-input" name="supplier" value={form.supplier} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>领用人</label>
                    <input className="form-input" name="recipient" value={form.recipient} onChange={handleChange} />
                  </div>
                </>
              )}
            </div>

            <div className="form-row">
              {isIn ? (
                <div className="form-group">
                  <label>批号</label>
                  <input className="form-input" name="batch_no" value={form.batch_no} onChange={handleChange} />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>用途</label>
                    <input className="form-input" name="purpose" value={form.purpose} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>订单号</label>
                    <input className="form-input" name="order_no" value={form.order_no} onChange={handleChange} />
                  </div>
                </>
              )}
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea className="form-textarea" name="remark" value={form.remark} onChange={handleChange} />
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
              <button type="submit" className={`btn ${isIn ? 'btn-success' : 'btn-danger'}`} disabled={saving}>
                {saving ? '提交中...' : `确认${isIn ? '入库' : '出库'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
