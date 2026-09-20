const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  // 服务端异常（如 413 请求体过大、500）会返回 HTML 而非 JSON，
  // 这里先按文本读取再尝试解析，避免抛出 "Unexpected token '<'" 这类难懂的报错
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    if (data?.error) throw new Error(data.error);
    // 针对常见状态码给出可读提示
    const hint = {
      413: '数据量过大（HTTP 413），请减少单次导入的行数后重试',
      401: '身份验证失败（HTTP 401）',
      403: '没有权限（HTTP 403）',
      404: '接口不存在（HTTP 404）',
    }[res.status];
    throw new Error(hint || `请求失败（HTTP ${res.status}）`);
  }

  if (data === null) throw new Error('服务器返回了无法解析的内容');
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
