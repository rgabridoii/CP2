import { useEffect, useState } from 'react';
import { Server, Cpu } from 'lucide-react';
import { api } from '../lib/api';

function severityColor(score) {
  const s = parseFloat(score);
  if (Number.isNaN(s)) return 'var(--text-muted)';
  if (s >= 9) return 'var(--critical)';
  if (s >= 7) return 'var(--high)';
  if (s >= 4) return 'var(--medium)';
  if (s > 0) return 'var(--low)';
  return 'var(--info)';
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function Assets() {
  const [type, setType] = useState('host');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listAssets(type)
      .then((d) => { setItems(d || []); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); });
  }, [type]);

  return (
    <div>
      <div className="page-header">
        <h2>Assets</h2>
        <div className="flex" style={{ gap: 4 }}>
          <button
            className={`btn ${type === 'host' ? '' : 'btn-secondary'}`}
            onClick={() => setType('host')}
          >
            <Server size={14} /> Hosts
          </button>
          <button
            className={`btn ${type === 'os' ? '' : 'btn-secondary'}`}
            onClick={() => setType('os')}
          >
            <Cpu size={14} /> Operating Systems
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Assets are automatically discovered during scans. They represent what was
        actually found on the network, not just what was scanned.
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <Server size={32} />
            <div>No {type === 'host' ? 'hosts' : 'operating systems'} discovered yet.</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              Run a scan against a real network target to populate the asset inventory.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{type === 'host' ? 'Host' : 'OS'}</th>
                {type === 'host' && <th>Detected OS</th>}
                <th>Severity</th>
                <th>First seen</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name || '—'}</strong>
                    {a.hostname && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.hostname}</div>}
                  </td>
                  {type === 'host' && (
                    <td style={{ color: 'var(--text-muted)' }}>{a.best_os_txt || '—'}</td>
                  )}
                  <td>
                    <strong style={{ color: severityColor(a.severity) }}>
                      {a.severity != null ? parseFloat(a.severity).toFixed(1) : '—'}
                    </strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(a.creation_time)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(a.modification_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
