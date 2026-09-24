import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Target, ScanLine, FileText,
         Server, ListOrdered, SlidersHorizontal, Database,
         TrendingUp, Bell, Bug } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/targets', label: 'Targets', icon: Target },
  { to: '/scans', label: 'Scans', icon: ScanLine },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/assets', label: 'Assets', icon: Server },
  { to: '/port-lists', label: 'Port Lists', icon: ListOrdered },
  { to: '/scan-configs', label: 'Scan Configs', icon: SlidersHorizontal },
  { to: '/cve-browser', label: 'CVE Browser', icon: Bug },
  { to: '/feed-status', label: 'Feed Status', icon: Database },
];

export default function Layout() {
  const location = useLocation();
  const current = navItems.find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={22} />
          <span>ZeroPoint Security</span>
        </div>
        <nav>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>{current?.label ?? 'ZeroPoint Security'}</h1>
          <div className="flex">
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Connected to gvmd
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
