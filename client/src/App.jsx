import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import Warehouse from './pages/Warehouse';
import Settings from './pages/Settings';

const navItems = [
  { path: '/', label: '数据看板', icon: '📊' },
  { path: '/inventory', label: '弹簧库存', icon: '📦' },
  { path: '/inbound', label: '入库管理', icon: '📥' },
  { path: '/outbound', label: '出库管理', icon: '📤' },
  { path: '/warehouse', label: '仓库区域', icon: '🏭' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [version, setVersion] = useState('');
  const location = useLocation();

  // 从后端获取当前版本号（web/桌面端统一）
  useEffect(() => {
    fetch('/api/meta').then(r => r.json()).then(d => { if (d?.version) setVersion(d.version); }).catch(() => {});
  }, []);

  const currentNav = navItems.find(n => n.path === location.pathname) || navItems[0];

  return (
    <div className="app">
      {/* 移动端遮罩 */}
      {sidebarOpen && <div className="modal-overlay" onClick={() => setSidebarOpen(false)} style={{ zIndex: 99 }} />}

      {/* 侧边栏 */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo">🔧</span>
          <h1>弹簧厂出入库管理</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          弹簧厂仓储管理系统 {version ? `v${version}` : ''}
        </div>
      </aside>

      {/* 主内容 */}
      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <h2>{currentNav.label}</h2>
          </div>
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </header>

        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inbound" element={<Inbound />} />
            <Route path="/outbound" element={<Outbound />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
