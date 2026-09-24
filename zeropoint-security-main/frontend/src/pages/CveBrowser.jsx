import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Bug, ExternalLink } from 'lucide-react';
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

export default function CveBrowser() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  useEffect(() => {
    setLoading(true);
    api.listCves(page, pageSize, search)
      .then((d) => { setData(d || { items: [], total: 0 }); setLoading(false); })
      .catch(() => { setData({ items: [], total: 0 }); setLoading(false); });
  }, [page, search]);

  function submitSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const totalPages = data.total ? Math.ceil(data.total / pageSize) : null;

  return (
    <div>
      <div className="page-header">
        <h2>CVE Database Browser</h2>
        {data.total != null && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {data.total.toLocaleString()} CVEs in local feed
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Search and browse the CVE database synchronized from the Greenbone
        Community Feed. Useful for verifying coverage of CVEs you read about
        (Log4Shell, Heartbleed, etc.).
      </div>

      <form onSubmit={submitSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by CVE name (e.g., CVE-2021, log4j, openssl)"
          style={{
            flex: 1, padding: '8px 12px', background: 'var(--bg-elev)',
            border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', fontFamily: 'inherit',
          }}
        />
        <button className="btn" type="submit">
          <Search size={14} /> Search
        </button>
        {search && (
          <button
            type="button"
            className="btn-secondary btn"
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </form>

      <div className="table-wrapper">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="empty">
            <Bug size={32} />
            <div>No CVEs found{search ? ` for "${search}"` : ''}.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>CVE</th>
                <th style={{ width: 100 }}>CVSS</th>
                <th>Description</th>
                <th style={{ width: 120 }}>Published</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <strong style={{ color: severityColor(c.severity) }}>
                      {c.severity ? parseFloat(c.severity).toFixed(1) : '—'}
                    </strong>
                  </td>
                  <td style={{ fontSize: 12 }}>{c.description}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.published?.slice(0, 10) || '—'}</td>
                  <td>
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${c.name}`}
                      target="_blank" rel="noreferrer"
                      className="btn-icon"
                      title="View on NVD"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && data.items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Page {page}{totalPages ? ` of ${totalPages}` : ''}
          </div>
          <div className="flex" style={{ gap: 8 }}>
            <button
              className="btn-secondary btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="btn-secondary btn"
              disabled={data.items.length < pageSize}
              onClick={() => setPage(page + 1)}
              style={{ opacity: data.items.length < pageSize ? 0.4 : 1 }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
