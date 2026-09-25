import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Radar, Shield, Settings, Search, Wifi, Clock3, Gauge, CircleHelp } from 'lucide-react';

const TEMPLATES = {
  discovery: [
    {
      id: 'ping-discovery',
      name: 'Find Active Devices',
      technicalName: 'Ping-Only Discovery',
      desc: 'Quickly check which devices are online. This does not perform a vulnerability assessment.',
      icon: Wifi,
      color: '#e67e22',
      time: 'Fastest',
      level: 'Beginner',
    },
    {
      id: 'host-discovery',
      name: 'Find Devices & Services',
      technicalName: 'Host Discovery',
      desc: 'Find active devices and the network services they expose. Useful before a deeper security scan.',
      icon: Radar,
      color: '#2ecc71',
      time: 'Fast',
      level: 'Beginner',
    },
  ],
  vulnerabilities: [
    {
      id: 'basic-network',
      name: 'Recommended Security Scan',
      technicalName: 'Basic Network Scan',
      desc: 'Best starting point for routine vulnerability checks. Balanced coverage, time, and network load.',
      icon: Shield,
      color: '#27ae60',
      time: 'Moderate',
      level: 'Recommended',
      recommended: true,
    },
    {
      id: 'advanced-scan',
      name: 'Deep Security Scan',
      technicalName: 'Advanced Scan',
      desc: 'Broader and more aggressive scan for experienced users. It can take longer and create more network traffic.',
      icon: Settings,
      color: '#e74c3c',
      time: 'Longest',
      level: 'Advanced',
    },
  ],
};

export default function NewScan() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function filterTemplates(templates) {
    if (!searchQuery) return templates;
    return templates.filter((t) =>
      `${t.name} ${t.technicalName} ${t.desc}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const discoveryFiltered = filterTemplates(TEMPLATES.discovery);
  const vulnFiltered = filterTemplates(TEMPLATES.vulnerabilities);

  return (
    <div className="templates-page">
      <div className="page-header">
        <div>
          <h2 className="templates-title">What do you want to do?</h2>
          <p className="page-subtitle">Choose based on your goal. Technical names are shown underneath for reference.</p>
        </div>
        <Link to="/help" className="btn btn-secondary"><CircleHelp size={14} /> Scan guide</Link>
      </div>
      <Link to="/scans" className="templates-back">
        <ArrowLeft size={14} /> Back to Scan Devices
      </Link>

      <div className="info-callout" style={{ marginTop: 12 }}>
        <Shield size={18} />
        <div><strong>First time?</strong> Choose <strong>Recommended Security Scan</strong>. Keep the default settings and scan only a device you own or are authorized to assess.</div>
      </div>

      <div className="template-search-row">
        <div className="eyebrow">SCAN OPTIONS</div>
        <div style={{ position: 'relative' }}>
          <Search size={14} className="search-icon" />
          <input
            className="template-search"
            placeholder="Search scan options"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {discoveryFiltered.length > 0 && (
        <>
          <div className="templates-category">DISCOVER WHAT IS ON THE NETWORK</div>
          <div className="templates-grid ux-grid">
            {discoveryFiltered.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} onClick={() => navigate(`/scans/new/${tpl.id}`)} />)}
          </div>
        </>
      )}

      {vulnFiltered.length > 0 && (
        <>
          <div className="templates-category">CHECK FOR SECURITY WEAKNESSES</div>
          <div className="templates-grid ux-grid">
            {vulnFiltered.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} onClick={() => navigate(`/scans/new/${tpl.id}`)} />)}
          </div>
        </>
      )}

      {discoveryFiltered.length === 0 && vulnFiltered.length === 0 && (
        <div className="empty" style={{ padding: 40 }}>No scan options match your search.</div>
      )}
    </div>
  );
}

function TemplateCard({ tpl, onClick }) {
  const Icon = tpl.icon;
  return (
    <button type="button" className={`template-card ux-template-card ${tpl.recommended ? 'recommended' : ''}`} onClick={onClick}>
      {tpl.recommended && <div className="recommended-badge">RECOMMENDED FOR MOST USERS</div>}
      <div className="template-card-top">
        <div className="template-icon" style={{ background: `${tpl.color}20` }}>
          <Icon size={24} style={{ color: tpl.color }} />
        </div>
        <div>
          <div className="template-name">{tpl.name}</div>
          <div className="template-technical-name">{tpl.technicalName}</div>
        </div>
      </div>
      <div className="template-desc">{tpl.desc}</div>
      <div className="template-meta">
        <span><Gauge size={13} /> {tpl.level}</span>
        <span><Clock3 size={13} /> {tpl.time}</span>
      </div>
    </button>
  );
}
