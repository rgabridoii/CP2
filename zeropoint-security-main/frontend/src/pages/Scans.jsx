import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, X, Search, FolderClosed, CheckCircle, XCircle,
         Clock, ScanLine, Trash2, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { api } from '../lib/api';

/* Template labels */
const TEMPLATE_LABELS = {
  'ping-discovery': 'Find Active Devices',
  'host-discovery': 'Find Devices & Services',
  'basic-network': 'Recommended Security Scan',
  'advanced-scan': 'Deep Security Scan',
};

/* Extract template from comment tag [template:xxx] */
function templateName(item) {
  const comment = item.comment || '';
  const match = comment.match(/\[template:([^\]]+)\]/);
  if (match && TEMPLATE_LABELS[match[1]]) return TEMPLATE_LABELS[match[1]];
  // Fallback for older scans without tag
  const name = (item.name || '').toLowerCase();
  const cfg = (item.config?.name || item.scan_config?.name || '').toLowerCase();
  if (cfg.includes('discovery')) {
    if (name.includes('ping')) return 'Ping-Only Discovery';
    return 'Host Discovery';
  }
  if (cfg.includes('full and deep')) return 'Advanced Scan';
  if (name.includes('tls')) return 'TLS Scan';
  return 'Basic Network Scan';
}

/* Map scan config names to user-friendly types */
function scanType(task) {
  const cfg = (task.config?.name || task.scan_config?.name || '').toLowerCase();
  if (cfg.includes('discovery')) return 'Host Discovery';
  if (cfg.includes('full and fast')) return 'Vulnerability';
  if (cfg.includes('tls') || cfg.includes('ssl')) return 'TLS / SSL';
  if (cfg.includes('web')) return 'Web Application';
  return 'Vulnerability';
}

function statusIcon(status) {
  const s = (status || '').toLowerCase();
  if (s === 'done') return <CheckCircle size={16} style={{ color: 'var(--accent)' }} />;
  if (s === 'running' || s === 'requested') return (
    <span className="scan-status-icon">
      <span style={{
        display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
        border: '2px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin 1s linear infinite',
      }} />
    </span>
  );
  if (s === 'stopped') return <XCircle size={16} style={{ color: 'var(--critical)' }} />;
  if (s === 'new') return <Clock size={16} style={{ color: 'var(--text-muted)' }} />;
  return <Clock size={16} style={{ color: 'var(--text-muted)' }} />;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const hour = d.getHours();
    const minute = d.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()} at ${h12}:${minute} ${ampm}`;
  } catch {
    return dateStr;
  }
}

export default function Scans() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const navigate = useNavigate();

  async function reload() {
    try {
      const t = await api.listTasks();
      setTasks(t || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = tasks
    .filter((t) => (t.name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.last_report?.report?.timestamp || 0);
      const dateB = new Date(b.last_report?.report?.timestamp || 0);
      return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="scan-layout">
      {/* Folder sidebar */}
      <div className="scan-folders">
        <div className="folder-title">Folders</div>
        <div className="folder-item active">
          <FolderClosed size={14} />
          <span>My Scans</span>
          <span className="folder-count">{tasks.length}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="scan-main">
        {/* Top bar */}
        <div className="scan-topbar">
          <div><h2>Scan Devices</h2><div className="page-subtitle">Run a new security check or open a previous scan to review its progress and findings.</div></div>
          <div className="scan-topbar-actions">
            <button className="btn-nessus" onClick={() => navigate('/scans/new')}>
              <Plus size={14} /> Start New Scan
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="scan-search-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              placeholder="Search previous scans"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          <span className="scan-count">{filtered.length} Scan{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Scan table */}
        {loading ? (
          <div className="empty" style={{ padding: 60 }}>Loading scans...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <ScanLine size={32} />
            <div>{search ? 'No scans match your search.' : 'No scans yet. Click Start New Scan to begin with the recommended security scan.'}</div>
          </div>
        ) : (
          <table className="scan-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th className="sortable">Name</th>
                <th>Template</th>
                <th>Schedule</th>
                <th></th>
                <th
                  className="sortable"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                >
                  Last Scanned{' '}
                  {sortDir === 'desc'
                    ? <ChevronDown size={10} style={{ verticalAlign: 'middle' }} />
                    : <ChevronUp size={10} style={{ verticalAlign: 'middle' }} />}
                </th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const lastRun = t.last_report?.report?.timestamp || '';
                return (
                  <tr key={t.id}>
                    <td>
                      <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                    </td>
                    <td>
                      <Link to={`/scans/${t.id}`} className="scan-name">
                        {t.name}
                      </Link>
                    </td>
                    <td>
                      <span className="scan-type-badge">{templateName(t)}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {t.schedule?.name || 'On Demand'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {statusIcon(t.status)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {formatDate(lastRun)}
                    </td>
                    <td>
                      <div className="scan-actions">
                        <button title="Start scan" onClick={(e) => {
                          e.stopPropagation();
                          api.startTask(t.id).then(reload);
                        }}>
                          <Play size={14} />
                        </button>
                        <button title="Delete scan" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this scan?')) api.deleteTask(t.id).then(reload);
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
