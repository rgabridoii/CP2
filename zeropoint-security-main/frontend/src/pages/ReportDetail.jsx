import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Sparkles, Loader2, CircleHelp } from 'lucide-react';
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

function severityLabel(score) {
  const s = parseFloat(score);
  if (Number.isNaN(s)) return 'Unknown';
  if (s >= 9) return 'Critical';
  if (s >= 7) return 'High';
  if (s >= 4) return 'Medium';
  if (s > 0) return 'Low';
  return 'Info';
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function AiRemediation({ finding }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  async function generate() {
    setLoading(true);
    setError('');
    setElapsed(0);
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    try {
      const r = await api.getRemediation(finding);
      setResult(r);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('504') || msg.includes('timeout')) {
        setError(
          'Gateway timeout. The AI model may be loading into memory for the first time. ' +
          'This usually takes 30-60 seconds. Please wait a moment and try again - subsequent ' +
          'requests will be much faster.'
        );
      } else {
        setError(msg || 'Failed to generate recommendation');
      }
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div style={{ marginTop: 16, padding: 14, background: 'rgba(0,212,170,0.08)',
        borderRadius: 4, border: '1px solid rgba(0,212,170,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13 }}>
            <Sparkles size={14} style={{ verticalAlign: 'middle', color: 'var(--accent)', marginRight: 6 }} />
            <strong>Suggested Remediation Guidance</strong>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Get a plain-language starting point for addressing this finding. Review the guidance before making system changes.
              {loading && elapsed > 5 && (
                <span> First call loads the model (~30-60s). Subsequent calls are fast.</span>
              )}
            </div>
          </div>
          <button className="btn" onClick={generate} disabled={loading}>
            {loading ? <><Loader2 size={14} /> Generating ({elapsed}s)...</> : 'Explain how to fix'}
          </button>
        </div>
        {error && (
          <div style={{ color: 'var(--critical)', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 14, background: 'rgba(0,212,170,0.08)',
      borderRadius: 4, border: '1px solid rgba(0,212,170,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Sparkles size={14} style={{ color: 'var(--accent)' }} />
        <strong>Suggested Remediation Guidance</strong>
        <span className="badge badge-new" style={{ marginLeft: 'auto' }}>
          {result.severity_band}
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
        {result.remediation}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        Model: {result.model}  ·  Pattern: {result.matched_pattern || 'generic'}
        <br />
        {result.note}
      </div>
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getReport(id)
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => { setReport(null); setLoading(false); });
  }, [id]);

  if (loading) return <div className="empty">Loading report…</div>;
  if (!report) return <div className="empty">Report not found.</div>;

  const results = report.results || [];
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const r of results) {
    const s = parseFloat(r.severity);
    if (s >= 9) counts.critical++;
    else if (s >= 7) counts.high++;
    else if (s >= 4) counts.medium++;
    else if (s > 0) counts.low++;
    else counts.info++;
  }

  const filtered = filter === 'all'
    ? results
    : results.filter((r) => severityLabel(r.severity).toLowerCase() === filter);

  return (
    <div>
      <div className="page-header">
        <div className="flex">
          <Link to="/reports" className="btn-icon"><ArrowLeft size={16} /></Link>
          <h2>{report.task_name || 'Report'}</h2>
        </div>
        <div className="flex">
          <a className="btn" href={api.exportReportUrl(report.id, 'pdf')}>
            <Download size={14} /> PDF
          </a>
          <a className="btn-secondary btn" href={api.exportReportUrl(report.id, 'csv')}>
            <Download size={14} /> CSV
          </a>
          <a className="btn-secondary btn" href={api.exportReportUrl(report.id, 'xml')}>
            <Download size={14} /> XML
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Scan window</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div><strong>Start:</strong> {formatDate(report.scan_start)}</div>
            <div><strong>End:</strong> {formatDate(report.scan_end)}</div>
            <div><strong>Status:</strong> {report.scan_status || '—'}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Overall severity</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: severityColor(report.severity) }}>
            {report.severity != null ? parseFloat(report.severity).toFixed(1) : '—'}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>{severityLabel(report.severity)}</div>
        </div>
        <div className="card">
          <div className="card-title">Total findings</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{results.length}</div>
        </div>
      </div>

      <div className="info-callout" style={{ marginBottom: 18 }}>
        <CircleHelp size={18} />
        <div>
          <strong>How to read this report:</strong> Start with Critical and High findings. Click a finding to see the affected device, port, CVE references, description, and suggested remediation. Scanner findings should be validated before changes are made.
        </div>
      </div>

      <div className="severity-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <FilterCard label="Critical" count={counts.critical} cls="sev-critical" active={filter === 'critical'} onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')} />
        <FilterCard label="High" count={counts.high} cls="sev-high" active={filter === 'high'} onClick={() => setFilter(filter === 'high' ? 'all' : 'high')} />
        <FilterCard label="Medium" count={counts.medium} cls="sev-medium" active={filter === 'medium'} onClick={() => setFilter(filter === 'medium' ? 'all' : 'medium')} />
        <FilterCard label="Low" count={counts.low} cls="sev-low" active={filter === 'low'} onClick={() => setFilter(filter === 'low' ? 'all' : 'low')} />
        <FilterCard label="Info" count={counts.info} cls="sev-info" active={filter === 'info'} onClick={() => setFilter(filter === 'info' ? 'all' : 'info')} />
      </div>

      <div className="table-wrapper" style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="empty">
            <FileText size={32} />
            <div>{results.length === 0 ? 'No findings in this scan.' : 'No findings match the current filter.'}</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Severity score</th>
                <th>What was found</th>
                <th style={{ width: 140 }}>Affected device</th>
                <th style={{ width: 100 }}>Port</th>
                <th style={{ width: 140 }} title="Common Vulnerabilities and Exposures identifier">CVE ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    <strong style={{ color: severityColor(r.severity) }}>
                      {r.severity != null ? parseFloat(r.severity).toFixed(1) : '—'}
                    </strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.threat}</div>
                  </td>
                  <td>{r.name || r.nvt_name || '—'}</td>
                  <td><code style={{ color: 'var(--text-muted)' }}>{r.host || '—'}</code></td>
                  <td><code style={{ color: 'var(--text-muted)' }}>{r.port || '—'}</code></td>
                  <td style={{ fontSize: 12 }}>
                    {r.cves && r.cves.length > 0 ? r.cves.slice(0, 2).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ color: severityColor(selected.severity) }}>
              {selected.name || selected.nvt_name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, fontSize: 13 }}>
              <div><div className="card-title">Severity</div><strong style={{ color: severityColor(selected.severity) }}>{selected.severity} ({selected.threat})</strong></div>
              <div><div className="card-title">Host</div>{selected.host}</div>
              <div><div className="card-title">Port</div>{selected.port}</div>
            </div>
            {selected.cves && selected.cves.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="card-title">CVE references <span title="CVE is a standard identifier for a publicly known vulnerability" style={{ textTransform: 'none', letterSpacing: 0 }}>ⓘ</span></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.cves.map((c) => (
                    <a key={c} href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noreferrer" className="badge badge-new">{c}</a>
                  ))}
                </div>
              </div>
            )}
            <div className="card-title">What this finding means</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>
              {selected.description || '(no description)'}
            </pre>
            <AiRemediation finding={selected} />
            <div className="modal-actions">
              <button className="btn-secondary btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterCard({ label, count, cls, active, onClick }) {
  return (
    <div
      className={`sev-card ${cls}`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        opacity: active || count > 0 ? 1 : 0.5,
        outline: active ? '2px solid var(--accent)' : 'none',
      }}
    >
      <div className="label">{label}</div>
      <div className="count">{count}</div>
    </div>
  );
}
