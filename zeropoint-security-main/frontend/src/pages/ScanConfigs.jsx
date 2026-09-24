import { useEffect, useState } from 'react';
import { Copy, Lock, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

export default function ScanConfigs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const data = await api.listScanConfigsDetailed();
      setItems(data || []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function clone(id, name) {
    if (!confirm(`Clone "${name}" so you can customize it?`)) return;
    try {
      await api.cloneScanConfig(id);
      reload();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  async function remove(id, name) {
    if (!confirm(`Delete custom config "${name}"?`)) return;
    try {
      await api.deleteScanConfig(id);
      reload();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Scan Configs</h2>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Scan configs define which vulnerability tests (NVTs) are run. Clone a
        built-in config to create a custom version with disabled or tuned NVTs.
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty"><SlidersHorizontal size={32} /><div>No scan configs loaded.</div></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Families</th>
                <th>NVTs</th>
                <th>Usage</th>
                <th>Source</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.comment && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.comment}</div>}
                  </td>
                  <td>{c.family_count ?? '—'}</td>
                  <td>{c.nvt_count_total ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.usage_type || 'scan'}</td>
                  <td>
                    {c.predefined ? (
                      <span className="badge badge-done"><Lock size={10} /> Built-in</span>
                    ) : (
                      <span className="badge badge-new">Custom</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-icon"
                      title="Clone this config"
                      onClick={() => clone(c.id, c.name)}
                    >
                      <Copy size={14} />
                      <span style={{ marginLeft: 4, fontSize: 11 }}>Clone</span>
                    </button>
                    {!c.predefined && (
                      <button
                        className="btn-icon"
                        title="Delete this custom config"
                        onClick={() => remove(c.id, c.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
