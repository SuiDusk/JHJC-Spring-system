import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import InOutForm from '../components/InOutForm';

export default function Outbound() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const limit = 20;

  const loadData = useCallback(() => {
    setLoading(true);
    api.getOutbound({ page, limit })
      .then(res => { setRecords(res.data); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (id) => {
    if (!confirm('确定删除该出库记录？将同步恢复库存。')) return;
    try {
      await api.deleteOutbound(id);
      loadData();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>出库记录 ({total})</h3>
          <button className="btn btn-danger" onClick={() => setModalOpen(true)}>+ 新增出库</button>
        </div>

        {loading ? <div className="empty"><p>加载中...</p></div> :
          records.length === 0 ? <div className="empty"><div className="icon">📤</div><p>暂无出库记录</p></div> :
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>物料编码</th>
                  <th>弹簧名称</th>
                  <th>规格</th>
                  <th>出库数量</th>
                  <th>领用人</th>
                  <th>用途</th>
                  <th>订单号</th>
                  <th>仓库区域</th>
                  <th>操作人</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>#{r.id}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{r.material_code}</td>
                    <td>{r.spring_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{r.specification || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>-{r.quantity}</td>
                    <td>{r.recipient || '-'}</td>
                    <td>{r.purpose || '-'}</td>
                    <td>{r.order_no || '-'}</td>
                    <td><span style={{ fontSize: 12, background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>{r.area_name || '-'}</span></td>
                    <td>{r.operator || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(r.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
            <span>共 {total} 条</span>
          </div>
        )}
      </div>

      {modalOpen && (
        <InOutForm
          type="out"
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
