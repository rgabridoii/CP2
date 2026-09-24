import { useEffect, useState } from 'react';
import { Plus, Trash2, ListOrdered, Lock } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

const PRESETS = [
  { label: 'Web only (80, 443, 8080, 8443)', value: 'T:80,443,8080,8443' },
  { label: 'TCP 1-1024 (well-known)', value: 'T:1-1024' },
  { label: 'TCP 1-65535 (all)', value: 'T:1-65535' },
  { label: 'TCP + UDP 1-1024', value: 'T:1-1024,U:1-1024' },
  { label: 'Custom...', value: '' },
];

export default function PortLists() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', port_range: 'T:1-1024', comment: '', preset: 'T:1-1024' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setItems(await api.listPortLists().catch(() => []));
  }
  useEffect(() => { reload(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        port_range: form.port_range,
        comment: form.comment || null,
      };
      await api.createPortList(payload);
      setOpen(false);
      setForm({ name: '', port_range: 'T:1-1024', comment: '', preset: 'T:1-1024' });
      reload();
    } catch (err) {
      setError(err.message || 'Failed to create port list');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id, predefined) {
    if (predefined) {
      alert('Built-in port lists cannot be deleted.');
      return;
    }
    if (!confirm('Delete this port list?')) return;
    try {
      await api.deletePortList(id);
      reload();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Port Lists</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          <Plus size={14} /> New port list
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Port lists define which TCP/UDP ports a scan will probe. Built-in lists
        (locked icon) cannot be modified; create your own for custom scopes.
      </div>

      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty"><ListOrdered size={32} /><div>No port lists loaded.</div></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>TCP</th>
                <th>UDP</th>
                <th>Total</th>
                <th>Source</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.comment && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.comment}</div>}
                  </td>
                  <td>{p.tcp_count ?? '—'}</td>
                  <td>{p.udp_count ?? '—'}</td>
                  <td>{p.total_count ?? '—'}</td>
                  <td>
                    {p.predefined ? (
                      <span className="badge badge-done"><Lock size={10} /> Built-in</span>
                    ) : (
                      <span className="badge badge-new">Custom</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => remove(p.id, p.predefined)}
                      disabled={p.predefined}
                      style={{ opacity: p.predefined ? 0.3 : 1 }}
                    >
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
        <Modal title="New port list" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My web ports"
                required
              />
            </div>
            <div className="form-group">
              <label>Preset</label>
              <select
                value={form.preset}
                onChange={(e) => setForm({ ...form, preset: e.target.value, port_range: e.target.value || form.port_range })}
              >
                {PRESETS.map((p, i) => (
                  <option key={i} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Port range  (format: T:1-1024,U:53 - T=TCP, U=UDP)</label>
              <input
                value={form.port_range}
                onChange={(e) => setForm({ ...form, port_range: e.target.value })}
                required
              />
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
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
