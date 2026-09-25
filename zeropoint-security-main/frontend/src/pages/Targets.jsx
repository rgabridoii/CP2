import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Target as TargetIcon, Upload } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Targets() {
  const [targets, setTargets] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', hosts: '', comment: '', port_list_id: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [portLists, setPortLists] = useState([]);

  async function reload() {
    setTargets(await api.listTargets().catch(() => []));
  }
  useEffect(() => { reload(); }, []);

  async function openModal() {
    const pls = await api.listPortLists().catch(() => []);
    setPortLists(pls);
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.port_list_id) delete payload.port_list_id;
      await api.createTarget(payload);
      setOpen(false);
      setForm({ name: '', hosts: '', comment: '', port_list_id: '' });
      await reload();
    } catch (err) {
      setError(err.message || 'Failed to create target');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this target?')) return;
    try { await api.deleteTarget(id); reload(); }
    catch (err) { alert(`Failed to delete: ${err.message}`); }
  }

  // ---- CSV Import ----
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      let startIdx = 0;
      const header = lines[0]?.toLowerCase() || '';
      if (header.includes('name') && header.includes('host')) startIdx = 1;
      const successes = [];
      const failures = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length < 2) continue;
        const [name, hosts, comment] = parts;
        try {
          await api.createTarget({ name, hosts, comment: comment || null });
          successes.push(name);
        } catch (err) {
          failures.push({ name, error: err.message });
        }
      }
      setImportResult({ successes, failures, total: successes.length + failures.length });
      reload();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Devices to Scan</h2><p className="page-subtitle">Add computers, servers, hostnames, or authorized IP ranges that you want ZeroPoint to assess.</p></div>
        <div className="flex" style={{ gap: 8 }}>
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            onChange={handleCsvFile}
            style={{ display: 'none' }}
          />
          <button className="btn-secondary btn" onClick={triggerImport} disabled={importing}>
            <Upload size={14} /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button className="btn" onClick={openModal}>
            <Plus size={14} /> Add device / target
          </button>
        </div>
      </div>

      {importResult && (
        <div className="card" style={{ marginBottom: 16,
          background: importResult.error ? 'rgba(214,48,49,0.1)' : 'rgba(0,212,170,0.1)' }}>
          {importResult.error ? (
            <div style={{ color: 'var(--critical)' }}>Import failed: {importResult.error}</div>
          ) : (
            <div style={{ fontSize: 13 }}>
              <strong>Import complete:</strong> {importResult.successes.length} of {importResult.total} targets created.
              {importResult.failures.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary>{importResult.failures.length} failed</summary>
                  <ul style={{ fontSize: 12, marginTop: 6 }}>
                    {importResult.failures.map((f, i) => (
                      <li key={i}><strong>{f.name}:</strong> {f.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Tip: CSV format is <code>name,hosts,comment</code> (one target per line). First row can be a header.
      </div>

      <div className="table-wrapper">
        {targets.length === 0 ? (
          <div className="empty">
            <TargetIcon size={32} />
            <div>No devices added yet. Add a device or authorized IP range to start scanning.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>IP / Host</th>
                <th>Comment</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td><code style={{ color: 'var(--text-muted)' }}>{t.hosts}</code></td>
                  <td>{t.comment || ''}</td>
                  <td>
                    <button className="btn-icon" onClick={() => remove(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal title="Add device / target" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Friendly name</label>
              <div className="form-help">Use a name you will recognize later, such as “Front Desk PC” or “Test Server”.</div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Front Desk PC"
                required
              />
            </div>
            <div className="form-group">
              <label>IP address, hostname, or IP range</label>
              <div className="form-help">Examples: 192.168.1.25, server01.local, or 192.168.1.0/24. Only enter systems you are authorized to scan.</div>
              <input
                value={form.hosts}
                onChange={(e) => setForm({ ...form, hosts: e.target.value })}
                placeholder="10.0.0.0/24, server01.local"
                required
              />
            </div>
            <div className="form-group">
              <label>Ports to check</label>
              <div className="form-help">If you are unsure, keep the default. Advanced users can choose a custom port list.</div>
              <select
                value={form.port_list_id}
                onChange={(e) => setForm({ ...form, port_list_id: e.target.value })}
              >
                <option value="">Recommended default (common TCP ports)</option>
                {portLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}  ({pl.total_count ?? '?'} ports)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Comment</label>
              <input
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(214,48,49,0.15)', color: 'var(--critical)',
                padding: '10px 12px', borderRadius: 4, fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add device'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
