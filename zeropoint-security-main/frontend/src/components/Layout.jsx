import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Target, ScanLine, FileText, Server,
  ListOrdered, SlidersHorizontal, Database, TrendingUp, Bell,
  Bug, CircleHelp
} from 'lucide-react';

const navGroups = [
  {
    label: 'START HERE',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/scans', label: 'Scan Devices', icon: ScanLine },
      { to: '/targets', label: 'Devices to Scan', icon: Target },
    ],
  },
  {
    label: 'UNDERSTAND RESULTS',
    items: [
      { to: '/reports', label: 'Scan Results', icon: FileText },
      { to: '/trends', label: 'Security Trends', icon: TrendingUp },
      { to: '/assets', label: 'Discovered Devices', icon: Server },
      { to: '/cve-browser', label: 'Vulnerability Library', icon: Bug },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { to: '/alerts', label: 'Email Alerts', icon: Bell },
      { to: '/help', label: 'Help & Terms', icon: CircleHelp },
    ],
  },
  {
    label: 'ADVANCED',
    items: [
      { to: '/port-lists', label: 'Port Settings', icon: ListOrdered },
      { to: '/scan-configs', label: 'Scanner Settings', icon: SlidersHorizontal },
      { to: '/feed-status', label: 'Scanner Updates', icon: Database },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

export default function Layout() {
  const location = useLocation();
  const current = allItems.find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={22} />
          <span>ZeroPoint Security</span>
        </div>
        <div className="sidebar-tagline">Vulnerability checks made easier to understand</div>
        <nav>
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(({ to, label, icon: Icon, end }) => (
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
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{current?.label ?? 'ZeroPoint Security'}</h1>
            <div className="topbar-subtitle">Only scan systems you own or are authorized to assess.</div>
          </div>
          <div className="flex">
            <span className="status-dot" />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Scanner connected
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
