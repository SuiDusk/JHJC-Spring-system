import { useState } from 'react';
import { api } from '../api';

const defaultForm = {
  material_code: '', name: '', specification: '', material_type: '',
  wire_diameter: '', outer_diameter: '', free_length: '', total_coils: '',
  winding_direction: 'right', quantity: 0, unit: '个', status: 'normal',
  warehouse_area_id: '', min_stock: 0, max_stock: 0,
  unit_price: '', supplier: '', location: '无', color: '无', detail: '', remark: ''
};

export default function SpringForm({ spring, areas, onClose, onSave }) {
  const [form, setForm] = useState(spring ? { ...defaultForm, ...spring } : defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_code || !form.name) { setError('物料编码和名称为必填'); return; }
    setSaving(true);
    setError('');
    try {
      const data = { ...form };
      if (data.warehouse_area_id === '') data.warehouse_area_id = null;
      if (spring) {
        await api.updateSpring(spring.id, data);
      } else {
        await api.createSpring(data);
      }
      onSave();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>{spring ? '编辑弹簧物料' : '新增弹簧物料'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="required">物料编码</label>
                <input className="form-input" name="material_code" value={form.material_code} onChange={handleChange} placeholder="如 SP-001" />
              </div>
              <div className="form-group">
                <label className="required">名称</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="如 压缩弹簧" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>规格型号</label>
                <input className="form-input" name="specification" value={form.specification} onChange={handleChange} placeholder="如 Φ20×50" />
              </div>
              <div className="form-group">
                <label>材质</label>
                <input className="form-input" name="material_type" value={form.material_type} onChange={handleChange} placeholder="如 65Mn/304不锈钢" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>线径 (mm)</label>
                <input className="form-input" name="wire_diameter" type="number" step="0.01" value={form.wire_diameter} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>外径 (mm)</label>
                <input className="form-input" name="outer_diameter" type="number" step="0.01" value={form.outer_diameter} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>自由长度 (mm)</label>
                <input className="form-input" name="free_length" type="number" step="0.01" value={form.free_length} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>总圈数</label>
                <input className="form-input" name="total_coils" type="number" step="0.5" value={form.total_coils} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>旋向</label>
                <select className="form-input" name="winding_direction" value={form.winding_direction} onChange={handleChange}>
                  <option value="right">右旋</option>
                  <option value="left">左旋</option>
                </select>
              </div>
              <div className="form-group">
                <label>供应商</label>
                <input className="form-input" name="supplier" value={form.supplier} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>当前库存数量</label>
                <input className="form-input" name="quantity" type="number" value={form.quantity} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>单位</label>
                <select className="form-input" name="unit" value={form.unit} onChange={handleChange}>
                  <option value="个">个</option>
                  <option value="箱">箱</option>
                  <option value="公斤">公斤</option>
                  <option value="吨">吨</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>仓库区域</label>
                <select className="form-input" name="warehouse_area_id" value={form.warehouse_area_id} onChange={handleChange}>
                  <option value="">未分配</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>状态</label>
                <select className="form-input" name="status" value={form.status} onChange={handleChange}>
                  <option value="normal">正常</option>
                  <option value="locked">锁定</option>
                  <option value="defective">次品</option>
                  <option value="reserved">预留</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>最低库存警戒</label>
                <input className="form-input" name="min_stock" type="number" value={form.min_stock} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>最高库存</label>
                <input className="form-input" name="max_stock" type="number" value={form.max_stock} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>单价 (元)</label>
                <input className="form-input" name="unit_price" type="number" step="0.01" value={form.unit_price} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>库位</label>
                <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="如 A-01-03" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>颜色</label>
                <input className="form-input" name="color" value={form.color} onChange={handleChange} placeholder="如 本色/黑色/镀锌" />
              </div>
              <div className="form-group">
                <label>备注</label>
                <input className="form-input" name="remark" value={form.remark} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>详情</label>
              <textarea
                className="form-textarea"
                name="detail"
                value={form.detail}
                onChange={handleChange}
                rows={3}
                placeholder="物料的详细说明，如用途、工艺要求、适配机型等（支持出入库模糊检索）"
              />
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8 }}>{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中...' : spring ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
