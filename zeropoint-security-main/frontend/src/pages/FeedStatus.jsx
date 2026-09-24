import { useEffect, useState } from 'react';
import { Database, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

export default function FeedStatus() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cveQuery, setCveQuery] = useState('');
  const [cveResult, setCveResult] = useState(null);
  const [cveError, setCveError] = useState('');

  async function reload() {
    setLoading(true);
    const f = await api.getFeedsStatus().catch(() => []);
    setFeeds(f || []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function searchCve(e) {
    e.preventDefault();
    setCveError('');
    setCveResult(null);
    const q = cveQuery.trim().toUpperCase();
    if (!q) return;
    try {
      const r = await api.getCve(q);
      setCveResult(r);
    } catch (err) {
      setCveError(err.message || 'Lookup failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Feed Status &amp; SecInfo</h2>
        <button className="btn-secondary btn" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Feed</th>
                  <th>Name</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feeds.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty">
                    <Database size={32} /><div>No feed metadata available.</div>
                  </div></td></tr>
                ) : feeds.map((f) => (
                  <tr key={f.type}>
                    <td><strong>{f.type}</strong></td>
                    <td>{f.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{f.version || '—'}</td>
                    <td>
                      {f.currently_syncing ? (
                        <span className="badge badge-running">Syncing</span>
                      ) : f.sync_not_available ? (
                        <span className="badge" style={{ background: 'rgba(214,48,49,0.15)', color: 'var(--critical)' }}>
                          <AlertTriangle size={10} /> Unavailable
                        </span>
                      ) : (
                        <span className="badge badge-done">Synced</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 className="card-title">CVE Lookup</h3>
            <form onSubmit={searchCve} className="flex" style={{ gap: 8 }}>
              <input
                value={cveQuery}
                onChange={(e) => setCveQuery(e.target.value)}
                placeholder="e.g. CVE-2024-12345"
                style={{
                  flex: 1, padding: '8px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 4,
                  color: 'var(--text)', fontFamily: 'inherit',
                }}
              />
              <button className="btn" type="submit">
                <Search size={14} /> Look up
              </button>
            </form>

            {cveError && (
              <div style={{ marginTop: 12, color: 'var(--critical)', fontSize: 13 }}>
                {cveError}
              </div>
            )}
            {cveResult && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 4 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 12 }}>
                  <strong style={{ fontSize: 16 }}>{cveResult.name}</strong>
                  {cveResult.cvss_score && (
                    <span className="badge badge-done">CVSS {cveResult.cvss_score}</span>
                  )}
                  {cveResult.published && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      Published: {cveResult.published}
                    </span>
                  )}
                </div>
                {cveResult.cvss_vector && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    <code>{cveResult.cvss_vector}</code>
                  </div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {cveResult.description || '(no description)'}
                </div>
                <div style={{ marginTop: 12 }}>
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${cveResult.name}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    View on NVD →
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
