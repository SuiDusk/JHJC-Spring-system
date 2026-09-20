const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // 仓库区域
  getAreas: () => request('/warehouse'),
  createArea: (data) => request('/warehouse', { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id, data) => request(`/warehouse/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArea: (id) => request(`/warehouse/${id}`, { method: 'DELETE' }),

  // 弹簧物料
  getSprings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/springs${qs ? '?' + qs : ''}`);
  },
  getSpring: (id) => request(`/springs/${id}`),
  createSpring: (data) => request('/springs', { method: 'POST', body: JSON.stringify(data) }),
  updateSpring: (id, data) => request(`/springs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSpring: (id) => request(`/springs/${id}`, { method: 'DELETE' }),
  togglePin: (id, pinned) => request(`/springs/${id}/pin`, { method: 'PUT', body: JSON.stringify({ pinned }) }),
  importSprings: (rows) => request('/springs/import', { method: 'POST', body: JSON.stringify({ rows }) }),

  // 入库
  getInbound: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inbound${qs ? '?' + qs : ''}`);
  },
  createInbound: (data) => request('/inbound', { method: 'POST', body: JSON.stringify(data) }),
  deleteInbound: (id) => request(`/inbound/${id}`, { method: 'DELETE' }),

  // 出库
  getOutbound: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/outbound${qs ? '?' + qs : ''}`);
  },
  createOutbound: (data) => request('/outbound', { method: 'POST', body: JSON.stringify(data) }),
  deleteOutbound: (id) => request(`/outbound/${id}`, { method: 'DELETE' }),
};
