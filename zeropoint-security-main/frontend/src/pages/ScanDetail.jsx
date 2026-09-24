import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, RefreshCw, Server, Crosshair, Monitor,
         Globe, Wifi, ChevronDown, ChevronRight } from 'lucide-react';
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

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'running' || s === 'requested') return <span className="badge badge-running">{status}</span>;
  if (s === 'done' || s === 'stopped') return <span className="badge badge-done">{status}</span>;
  if (s === 'new') return <span className="badge badge-new">{status}</span>;
  return <span className="badge badge-stopped">{status || 'Unknown'}</span>;
}

/* ---------- Host card for discovery view ---------- */
function HostCard({ ip, findings, onScan }) {
  const [expanded, setExpanded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showScanMenu, setShowScanMenu] = useState(false);

  // Extract useful info from findings
  let hostname = null;
  let os = null;
  const services = [];

  findings.forEach((f) => {
    const name = (f.nvt_name || f.name || '').toLowerCase();
    const desc = f.description || '';

    if (name.includes('hostname determination') && desc) {
      const match = desc.match(/resolves?\s+(?:as|to)\s+["']?([^\s"'.]+)/i)
        || desc.match(/hostname[:\s]+([^\s,]+)/i);
      if (match) hostname = match[1];
    }
    if (name.includes('os detection consolidation') && desc) {
      const match = desc.match(/Best matching OS:\s*(.+)/i)
        || desc.match(/Installed OS:\s*(.+)/i);
      if (match) os = match[1].trim().split('\n')[0];
    }
    if (f.port && f.port !== 'general/tcp' && f.port !== 'general/udp'
        && f.port !== 'general/icmp') {
      const svc = `${f.port}`;
      if (!services.includes(svc)) services.push(svc);
    }
  });

  async function handleScan(template) {
    setShowScanMenu(false);
    setScanning(true);
    try {
      const result = await onScan(ip, template);
      return result;
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 8, padding: 0 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        }
        <Monitor size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{ip}</span>
            {hostname && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({hostname})</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {os && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(0,212,170,0.12)', color: 'var(--accent)',
              }}>
                {os.length > 40 ? os.slice(0, 40) + '...' : os}
              </span>
            )}
            {services.map((svc) => (
              <span key={svc} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: 'var(--bg)', color: 'var(--text-muted)', fontFamily: 'monospace',
              }}>
                {svc}
              </span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            className="btn"
            style={{ fontSize: 11, padding: '6px 12px' }}
            disabled={scanning}
            onClick={(e) => { e.stopPropagation(); setShowScanMenu(!showScanMenu); }}
          >
            <Crosshair size={12} />
            {scanning ? 'Starting...' : 'Scan this host'}
          </button>
          {showScanMenu && (
            <div
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 4, zIndex: 100, minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '8px 12px', cursor: 'pointer', borderRadius: 4,
                  fontSize: 12, color: 'var(--text)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elev-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => handleScan('basic-network')}
              >
                <div style={{ fontWeight: 600 }}>Basic Network Scan</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Common ports, standard checks
                </div>
              </div>
              <div
                style={{
                  padding: '8px 12px', cursor: 'pointer', borderRadius: 4,
                  fontSize: 12, color: 'var(--text)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elev-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => handleScan('advanced-scan')}
              >
                <div style={{ fontWeight: 600, color: 'var(--critical)' }}>Advanced Scan</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  All 65k ports, deep web testing
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 12px' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Finding</th>
                <th style={{ width: 100 }}>Port</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={f.id || i}>
                  <td>
                    <div style={{ fontSize: 12 }}>{f.nvt_name || f.name}</div>
                    {f.description && (
                      <div style={{
                        fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                        maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.description.slice(0, 150)}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.port || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* ---------- Main component ---------- */
export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('hosts'); // 'hosts' | 'findings'
  const [showLogs, setShowLogs] = useState(false);
  const intervalRef = useRef(null);

  async function fetchData() {
    try {
      const t = await api.getTask(id);
      setTask(t);

      const reportId = t?.last_report?.report?.id || t?.current_report?.report?.id;
      if (reportId) {
        try {
          const r = await api.getReport(reportId);
          setReport(r);
        } catch {
          // Report may not be ready yet
        }
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load scan details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // Poll every 3 seconds for faster progress updates
    intervalRef.current = setInterval(fetchData, 3000);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  useEffect(() => {
    const s = (task?.status || '').toLowerCase();
    if (s === 'done' || s === 'stopped') {
      clearInterval(intervalRef.current);
    }
  }, [task?.status]);

  // Parse progress - backend now returns integer, but guard against string/object
  const rawProgress = task?.progress;
  const progress = typeof rawProgress === 'number' ? rawProgress
    : typeof rawProgress === 'string' ? parseInt(rawProgress, 10) || 0
    : 0;
  const hostProgress = task?.host_progress || {};
  const status = (task?.status || '').toLowerCase();
  const isRunning = status === 'running' || status === 'requested';
  const isDiscovery = (task?.name || '').toLowerCase().includes('discovery');

  const results = report?.results || [];
  const sorted = [...results].sort((a, b) => parseFloat(b.severity || 0) - parseFloat(a.severity || 0));
  // If ALL findings are info-level (e.g. discovery scans), show them by default
  const hasRealFindings = sorted.some((r) => parseFloat(r.severity || 0) > 0);
  const effectiveShowLogs = showLogs || !hasRealFindings;
  const filtered = effectiveShowLogs ? sorted : sorted.filter((r) => parseFloat(r.severity || 0) > 0);

  // Severity counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0, log: 0 };
  results.forEach((r) => {
    const s = parseFloat(r.severity || 0);
    if (s >= 9) counts.critical++;
    else if (s >= 7) counts.high++;
    else if (s >= 4) counts.medium++;
    else if (s > 0) counts.low++;
    else counts.log++;
  });

  // Group results by host IP
  const hostMap = {};
  results.forEach((r) => {
    const ip = r.host || 'Unknown';
    if (!hostMap[ip]) hostMap[ip] = [];
    hostMap[ip].push(r);
  });
  const hosts = Object.keys(hostMap).sort((a, b) => {
    // Sort IPs numerically
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 4; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
    }
    return 0;
  });

  async function scanHost(ip, template) {
    const isAdvanced = template === 'advanced-scan';
    const result = await api.createVulnScan({
      host: ip,
      name: `${isAdvanced ? 'Advanced' : 'Basic'} - ${ip}`,
      template,
      options: isAdvanced ? {
        port_scan_type: 'port-all',
        assessment_type: 'all-web-complex',
        max_hosts: 50,
        max_checks: 8,
        network_timeout: 10,
      } : {
        port_scan_type: 'port-common',
        assessment_type: 'default',
        max_hosts: 30,
        max_checks: 4,
        network_timeout: 5,
      },
    });
    navigate(`/scans/${result.task_id}`);
    return result;
  }

  // Default to hosts view for discovery scans, findings view for others
  useEffect(() => {
    if (task && !isDiscovery) setView('findings');
  }, [task?.name]);

  if (loading) return <div className="empty">Loading scan details...</div>;

  if (error) {
    return (
      <div>
        <Link to="/scans" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to Scans
        </Link>
        <div className="empty" style={{ marginTop: 20 }}>
          <div style={{ color: 'var(--critical)' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/scans" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
        <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to Scans
      </Link>

      {/* Header */}
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>{task?.name || 'Scan'}</h2>
        {task?.comment && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{task.comment}</div>
        )}
        <div className="flex" style={{ gap: 12, alignItems: 'center' }}>
          {statusBadge(task?.status)}
          {isRunning && (
            <button className="btn btn-secondary" style={{ fontSize: 12 }}
              onClick={() => api.stopTask(id).then(fetchData)}>
              <Square size={12} /> Stop
            </button>
          )}
          {!isRunning && (
            <button className="btn" style={{ fontSize: 12 }}
              onClick={() => api.startTask(id).then(fetchData)}>
              <Play size={12} /> Start
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Progress</span>
          <span style={{ fontSize: 13, color: isRunning ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {status === 'done' ? '100%'
              : progress > 0 ? `${progress}%`
              : isRunning ? 'Initializing scan...'
              : status === 'new' ? 'Not started'
              : '0%'}
            {isRunning && <RefreshCw size={12} style={{ animation: 'spin 2s linear infinite' }} />}
          </span>
        </div>
        <div style={{ height: 10, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
          {isRunning && progress <= 0 ? (
            /* Indeterminate shimmer bar when running at 0% */
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--accent) 60%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-bar 1.8s ease-in-out infinite',
              borderRadius: 5,
              opacity: 0.7,
            }} />
          ) : (
            <div style={{
              height: '100%',
              width: status === 'done' ? '100%' : `${progress}%`,
              background: status === 'done' ? 'var(--accent)' : isRunning ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: 5,
              transition: 'width 0.5s ease',
            }} />
          )}
        </div>
        {/* Per-host progress when scanning */}
        {isRunning && Object.keys(hostProgress).length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(hostProgress).map(([host, pct]) => (
              <div key={host} style={{
                fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg)', padding: '4px 10px', borderRadius: 4,
              }}>
                <span>{host}</span>
                <div style={{
                  width: 60, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${Math.max(pct, 0)}%`,
                    background: 'var(--accent)', borderRadius: 2,
                  }} />
                </div>
                <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 100px', textAlign: 'center', padding: '12px 8px', minWidth: 80 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>{hosts.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Hosts found</div>
        </div>
        {[
          { label: 'Critical', count: counts.critical, color: 'var(--critical)' },
          { label: 'High', count: counts.high, color: 'var(--high)' },
          { label: 'Medium', count: counts.medium, color: 'var(--medium)' },
          { label: 'Low', count: counts.low, color: 'var(--low)' },
          { label: 'Info', count: counts.log, color: 'var(--text-muted)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card" style={{
            flex: '1 1 100px', textAlign: 'center', padding: '12px 8px', minWidth: 80,
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color }}>{count}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button
          className={`btn ${view === 'hosts' ? '' : 'btn-secondary'}`}
          style={{ fontSize: 12 }}
          onClick={() => setView('hosts')}
        >
          <Wifi size={13} /> Discovered hosts ({hosts.length})
        </button>
        <button
          className={`btn ${view === 'findings' ? '' : 'btn-secondary'}`}
          style={{ fontSize: 12 }}
          onClick={() => setView('findings')}
        >
          <Globe size={13} /> All findings ({results.length})
        </button>
        {report?.id && (
          <Link to={`/reports/${report.id}`} className="btn btn-secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
            Full report
          </Link>
        )}
      </div>

      {/* ---- HOSTS VIEW ---- */}
      {view === 'hosts' && (
        <div>
          {hosts.length === 0 ? (
            <div className="card">
              <div className="empty" style={{ padding: 30 }}>
                <Server size={28} />
                <div>{isRunning ? 'Scanning the network. Hosts will appear as they are discovered...' : 'No hosts discovered yet.'}</div>
              </div>
            </div>
          ) : (
            <>
              {isDiscovery && hosts.length > 0 && (
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)', marginBottom: 10,
                  padding: '8px 12px', background: 'var(--bg)', borderRadius: 6,
                }}>
                  Click <strong>Scan this host</strong> to run a vulnerability scan on any discovered device. Choose Basic (common ports) or Advanced (all 65k ports, deep testing).
                </div>
              )}
              {hosts.map((ip) => (
                <HostCard key={ip} ip={ip} findings={hostMap[ip]} onScan={scanHost} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ---- FINDINGS VIEW ---- */}
      {view === 'findings' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              Findings ({filtered.length}{!effectiveShowLogs && counts.log > 0 ? ` + ${counts.log} info` : ''})
            </span>
            {hasRealFindings && (
              <label style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={showLogs} onChange={(e) => setShowLogs(e.target.checked)} />
                Show info-level
              </label>
            )}
          </div>

          <div className="table-wrapper" style={{ margin: 0 }}>
            {filtered.length === 0 ? (
              <div className="empty" style={{ padding: 30 }}>
                <Server size={28} />
                <div>{isRunning ? 'Scan is running. Findings will appear here as they are discovered...' : 'No findings yet.'}</div>
              </div>
            ) : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Severity</th>
                    <th>Finding</th>
                    <th style={{ width: 130 }}>Host</th>
                    <th style={{ width: 100 }}>Port</th>
                    <th style={{ width: 80 }}>CVE</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          fontWeight: 600, color: '#fff',
                          background: severityColor(r.severity),
                        }}>
                          {parseFloat(r.severity || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.nvt_name || r.name}</div>
                        {r.description && (
                          <div style={{
                            fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                            maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {r.description.slice(0, 120)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.host || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.port || '-'}</td>
                      <td>
                        {r.cves && r.cves.length > 0 ? (
                          <span style={{ fontSize: 11, color: 'var(--accent)' }}>{r.cves[0]}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer-bar {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
