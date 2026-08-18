import { useState, useEffect, useRef } from 'react';

// 在 Electron 桌面环境中由 preload.js 暴露；浏览器/纯前端模式下为空对象
const desktopAPI = window.desktopAPI || {};

export default function Settings() {
  const [appInfo, setAppInfo] = useState({ version: '1.0.0', name: '弹簧厂出入库管理系统', source: '本地版' });
  const [state, setState] = useState('idle'); // idle | checking | available | downloading | downloaded | latest | error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (typeof desktopAPI.getAppInfo === 'function') {
      desktopAPI.getAppInfo().then(info => {
        if (mounted.current && info) setAppInfo(prev => ({ ...prev, ...info }));
      }).catch(() => {});
    }
    if (typeof desktopAPI.onUpdateEvent === 'function') {
      const unsubscribe = desktopAPI.onUpdateEvent((event) => {
        if (!mounted.current) return;
        const { type, data } = event;
        switch (type) {
          case 'checking-for-update':
            setState('checking'); setMessage('正在检查更新...'); setProgress(0);
            break;
          case 'update-available':
            setState('available');
            setUpdateInfo(data || null);
            setMessage(`发现新版本 ${data?.version || ''}，点击"下载更新"获取。`);
            break;
          case 'update-not-available':
            setState('latest'); setMessage('当前已是最新版本。');
            break;
          case 'download-progress':
            setState('downloading');
            setProgress(data?.percent || 0);
            setMessage(`正在下载更新... ${(data?.percent || 0).toFixed(1)}%`);
            break;
          case 'update-downloaded':
            setState('downloaded');
            setMessage('更新下载完成，点击"立即重启安装"完成升级。');
            break;
          case 'error':
            setState('error'); setMessage(`更新出错：${data?.message || '未知错误'}`);
            break;
          default: break;
        }
      });
      return () => { mounted.current = false; if (typeof unsubscribe === 'function') unsubscribe(); };
    }
    return () => { mounted.current = false; };
  }, []);

  const isElectron = typeof desktopAPI.checkForUpdates === 'function';

  const handleCheck = async () => {
    setState('checking'); setMessage('正在检查更新...'); setProgress(0);
    try {
      await desktopAPI.checkForUpdates();
    } catch (e) {
      setState('error'); setMessage(`检查更新失败：${e.message}`);
    }
  };

  const handleDownload = async () => {
    setState('downloading'); setMessage('开始下载更新...'); setProgress(0);
    try {
      await desktopAPI.downloadUpdate();
    } catch (e) {
      setState('error'); setMessage(`下载失败：${e.message}`);
    }
  };

  const handleInstall = async () => {
    try {
      await desktopAPI.quitAndInstall();
    } catch (e) {
      setState('error'); setMessage(`安装失败：${e.message}`);
    }
  };

  const renderAction = () => {
    if (!isElectron) {
      return <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>当前为浏览器/开发模式，更新功能仅在桌面版可用。</p>;
    }
    switch (state) {
      case 'available':
        return <button className="btn btn-primary" onClick={handleDownload}>下载更新</button>;
      case 'downloading':
        return <div className="update-progress"><div className="bar" style={{ width: `${progress}%` }} /></div>;
      case 'downloaded':
        return <button className="btn btn-success" onClick={handleInstall}>立即重启安装</button>;
      case 'checking':
        return <button className="btn btn-outline" disabled>检查中...</button>;
      default:
        return <button className="btn btn-primary" onClick={handleCheck}>检查更新</button>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header"><h3>系统设置</h3></div>
        <div className="settings-info">
          <div className="info-row"><span className="label">应用名称</span><span>{appInfo.name}</span></div>
          <div className="info-row"><span className="label">当前版本</span><span className="version">v{appInfo.version}</span></div>
          <div className="info-row"><span className="label">更新来源</span><span>{appInfo.source || 'GitHub Releases'}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>软件更新</h3></div>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
          点击"检查更新"手动检测是否有新版本可用（不会自动检查）。
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {renderAction()}
          {message && <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{message}</span>}
        </div>
        {updateInfo && (
          <div className="update-info" style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-600)' }}>
            <div>新版本号：{updateInfo.version}</div>
            {updateInfo.releaseNotes && <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{updateInfo.releaseNotes}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
