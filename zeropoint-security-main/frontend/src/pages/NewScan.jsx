import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Radar, Shield, Crosshair, Settings, Search,
         Network, Fingerprint, Wifi } from 'lucide-react';

const TEMPLATES = {
  discovery: [
    {
      id: 'host-discovery',
      name: 'Host Discovery',
      desc: 'A simple scan to discover live hosts and open ports on the network.',
      icon: Radar,
      color: '#2ecc71',
    },
    {
      id: 'ping-discovery',
      name: 'Ping-Only Discovery',
      desc: 'A simple scan to discover live hosts with minimal network traffic.',
      icon: Wifi,
      color: '#e67e22',
    },
  ],
  vulnerabilities: [
    {
      id: 'basic-network',
      name: 'Basic Network Scan',
      desc: 'A full system scan suitable for any host. Checks for vulnerabilities, misconfigurations, and outdated software.',
      icon: Shield,
      color: '#27ae60',
    },
    {
      id: 'advanced-scan',
      name: 'Advanced Scan',
      desc: 'Deep, thorough scan with all 65,535 TCP ports, full web app testing, and aggressive performance settings.',
      icon: Settings,
      color: '#e74c3c',
    },
  ],
};

export default function NewScan() {
  const [tab, setTab] = useState('scanner');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function filterTemplates(templates) {
    if (!searchQuery) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const discoveryFiltered = filterTemplates(TEMPLATES.discovery);
  const vulnFiltered = filterTemplates(TEMPLATES.vulnerabilities);

  return (
    <div className="templates-page">
      <h2 className="templates-title">Scan Templates</h2>
      <Link to="/scans" className="templates-back">
        <ArrowLeft size={14} /> Back to Scans
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div className="templates-tabs">
          <button
            className={`templates-tab ${tab === 'scanner' ? 'active' : ''}`}
            onClick={() => setTab('scanner')}
          >
            Scanner
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            placeholder="Search Library"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 30, padding: '6px 12px 6px 30px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', fontSize: 13, width: 200,
            }}
          />
        </div>
      </div>

      {/* Discovery section */}
      {discoveryFiltered.length > 0 && (
        <>
          <div className="templates-category">Discovery</div>
          <div className="templates-grid">
            {discoveryFiltered.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="template-card"
                  onClick={() => navigate(`/scans/new/${tpl.id}`)}
                >
                  <div className="template-icon" style={{
                    background: `${tpl.color}20`,
                  }}>
                    <Icon size={24} style={{ color: tpl.color }} />
                  </div>
                  <div className="template-name">{tpl.name}</div>
                  <div className="template-desc">{tpl.desc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Vulnerabilities section */}
      {vulnFiltered.length > 0 && (
        <>
          <div className="templates-category">Vulnerabilities</div>
          <div className="templates-grid">
            {vulnFiltered.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="template-card"
                  onClick={() => navigate(`/scans/new/${tpl.id}`)}
                >
                  <div className="template-icon" style={{
                    background: `${tpl.color}20`,
                  }}>
                    <Icon size={24} style={{ color: tpl.color }} />
                  </div>
                  <div className="template-name">{tpl.name}</div>
                  <div className="template-desc">{tpl.desc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {discoveryFiltered.length === 0 && vulnFiltered.length === 0 && (
        <div className="empty" style={{ padding: 40 }}>
          No templates match your search.
        </div>
      )}
    </div>
  );
}
