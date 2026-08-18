import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getDashboard()
      .then(d => { setData(d); })
      .catch(e => { setData(null); setError(e.message || String(e)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><p>加载中...</p></div>;
  if (!data) return (
    <div className="empty">
      <div className="icon">⚠️</div>
      <p>数据看板加载失败</p>
      {error && <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>{error}</p>}
    </div>
  );

  const statusMap = { normal: '正常', locked: '锁定', defective: '次品', reserved: '预留' };
  const statusColors = { normal: '#059669', locked: '#d97706', defective: '#dc2626', reserved: '#0891b2' };

  return (
    <div>
      {/* 今日概况 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div className="stat-info">
            <h4>物料种类</h4>
            <div className="value">{data.totalSprings}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📊</div>
          <div className="stat-info">
            <h4>库存总量</h4>
            <div className="value">{data.totalQuantity.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⚠️</div>
          <div className="stat-info">
            <h4>低库存预警</h4>
            <div className="value" style={{ color: data.lowStockCount > 0 ? 'var(--warning)' : undefined }}>
              {data.lowStockCount}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📥</div>
          <div className="stat-info">
            <h4>今日入库</h4>
            <div className="value">{data.todayInbound}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📤</div>
          <div className="stat-info">
            <h4>今日出库</h4>
            <div className="value">{data.todayOutbound}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📅</div>
          <div className="stat-info">
            <h4>本月入库/出库</h4>
            <div className="value" style={{ fontSize: 16 }}>
              {data.monthInbound} / {data.monthOutbound}
            </div>
          </div>
        </div>
      </div>

      {/* 仓库区域 + 状态分布 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* 区域统计 */}
        <div className="card">
          <div className="card-header"><h3>仓库区域库存统计</h3></div>
          {data.areaStats.length === 0 ? (
            <div className="empty"><p>暂无数据</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.areaStats.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{a.code} · {a.spring_count}种物料</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{a.total_qty}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 状态分布 */}
        <div className="card">
          <div className="card-header"><h3>库存状态分布</h3></div>
          {data.statusStats.length === 0 ? (
            <div className="empty"><p>暂无数据</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.statusStats.map(s => {
                const maxQty = Math.max(...data.statusStats.map(x => x.total_qty), 1);
                const pct = Math.round((s.total_qty / maxQty) * 100);
                return (
                  <div key={s.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{statusMap[s.status] || s.status}</span>
                      <span style={{ fontWeight: 600 }}>{s.cnt}种 / {s.total_qty}个</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: statusColors[s.status] || '#6b7280', borderRadius: 4, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 近7天趋势 */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>近7天出入库趋势</h3></div>
        {data.trend.length === 0 ? (
          <div className="empty"><p>暂无数据</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>入库数量</th>
                  <th>出库数量</th>
                  <th>净变化</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const days = [];
                  const grouped = {};
                  data.trend.forEach(t => {
                    if (!grouped[t.day]) grouped[t.day] = { in: 0, out: 0 };
                    if (t.type === 'inbound') grouped[t.day].in += t.total;
                    else grouped[t.day].out += t.total;
                  });
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    days.push({ date: key, ...(grouped[key] || { in: 0, out: 0 }) });
                  }
                  return days.map(d => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>+{d.in}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-{d.out}</td>
                      <td style={{ fontWeight: 600, color: d.in - d.out >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {d.in - d.out >= 0 ? '+' : ''}{d.in - d.out}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
