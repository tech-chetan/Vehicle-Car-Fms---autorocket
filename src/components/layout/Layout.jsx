// components/layout/Layout.jsx
import { useState, Suspense } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`layout-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          onMenuToggle={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />
        <main className="page-content">
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
