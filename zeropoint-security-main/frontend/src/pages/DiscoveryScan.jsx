import { useState } from 'react';
import { Radar, Play, Info, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function DiscoveryScan() {
  const [form, setForm] = useState({ name: '', hosts: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await api.createDiscoveryScan({
        name: form.name,
        hosts: form.hosts,
        comment: form.comment || null,
      });
      setSuccess(result);
      setForm({ name: '', hosts: '', comment: '' });
    } catch (err) {
      setError(err.message || 'Failed to create discovery scan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2><Radar size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Discovery Scan</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Info size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <strong>What this does:</strong> Scans a subnet or host range to discover
            live devices on the network. It identifies open ports, running services,
            and operating systems. Discovered hosts will appear on the Assets page.
            <br /><br />
            <strong>Example targets:</strong> A single IP like <code>192.168.1.1</code>,
            a range like <code>192.168.1.1-50</code>, or a full subnet like <code>192.168.1.0/24</code>.
            You can also enter multiple values separated by commas.
            <br /><br />
            <strong>Note:</strong> The scan starts automatically after creation.
            Only scan networks you own or have permission to scan.
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Network discovery setup</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Scan name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Office LAN discovery"
              required
            />
          </div>
          <div className="form-group">
            <label>Target hosts (IP, range, or subnet)</label>
            <input
              value={form.hosts}
              onChange={(e) => setForm({ ...form, hosts: e.target.value })}
              placeholder="192.168.1.0/24"
              required
            />
          </div>
          <div className="form-group">
            <label>Comment</label>
            <input
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Optional"
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(214,48,49,0.15)', color: 'var(--critical)',
              padding: '10px 12px', borderRadius: 4, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--accent)',
              padding: '14px 16px', borderRadius: 4, marginBottom: 12 }}>
              <strong>Discovery scan created and started!</strong>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text)' }}>
                {success.message}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate(`/scans/${success.task_id}`)}
                >
                  <Play size={14} /> View live progress
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/assets')}
                >
                  <Server size={14} /> View Assets
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn" disabled={submitting}>
            <Radar size={14} />
            {submitting ? 'Starting discovery...' : 'Start discovery scan'}
          </button>
        </form>
      </div>
    </div>
  );
}
