import { useState } from 'react';
import { Lock, Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function TlsScan() {
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
      const result = await api.createTlsScan({
        name: form.name,
        hosts: form.hosts,
        comment: form.comment || null,
      });
      setSuccess(result);
      setForm({ name: '', hosts: '', comment: '' });
    } catch (err) {
      setError(err.message || 'Failed to create TLS scan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2><Lock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />TLS Certificate Scan</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Info size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <strong>What this checks:</strong> Expired or soon-to-expire certificates,
            weak cipher suites (RC4, DES, 3DES), insecure protocol versions
            (SSLv2, SSLv3, TLS 1.0/1.1), and certificate hostname mismatches.
            <br /><br />
            <strong>Ports scanned:</strong> 443 (HTTPS), 8443 (alt HTTPS), 993 (IMAPS),
            995 (POP3S), 465 (SMTPS), 587 (SMTP-TLS), 636 (LDAPS).
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Quick TLS scan setup</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Scan name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="example.com TLS check"
              required
            />
          </div>
          <div className="form-group">
            <label>Hosts (comma-separated IPs or hostnames)</label>
            <input
              value={form.hosts}
              onChange={(e) => setForm({ ...form, hosts: e.target.value })}
              placeholder="example.com, 192.168.1.10, www.mysite.ph"
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
              <strong>TLS scan task created!</strong>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text)' }}>
                {success.message}
              </div>
              <button
                type="button"
                className="btn"
                style={{ marginTop: 10 }}
                onClick={() => navigate('/scans')}
              >
                <Play size={14} /> Go to Scans to start
              </button>
            </div>
          )}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create TLS scan task'}
          </button>
        </form>
      </div>
    </div>
  );
}
