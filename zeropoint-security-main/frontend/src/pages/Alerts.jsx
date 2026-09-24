import { useEffect, useState } from 'react';
import { Plus, Trash2, Bell, Mail, CheckCircle, XCircle, Send } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Alerts() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', recipient: '', on_severity_at_least: 7.0, comment: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // SMTP status
  const [smtp, setSmtp] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function reload() {
    setItems(await api.listAlerts().catch(() => []));
  }

  async function loadSmtp() {
    try {
      const status = await api.getSmtpStatus();
      setSmtp(status);
    } catch {
      setSmtp(null);
    }
  }

  useEffect(() => { reload(); loadSmtp(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createEmailAlert({
        name: form.name,
        recipient: form.recipient,
        on_severity_at_least: parseFloat(form.on_severity_at_least),
        comment: form.comment || null,
      });
      setOpen(false);
      setForm({ name: '', recipient: '', on_severity_at_least: 7.0, comment: '' });
      reload();
    } catch (err) {
      setError(err.message || 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this alert?')) return;
    try { await api.deleteAlert(id); reload(); }
    catch (err) { alert(`Failed: ${err.message}`); }
  }

  async function handleTestEmail() {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      await api.sendTestEmail({ recipient: testEmail.trim() });
      setTestResult({ ok: true, msg: `Test email sent to ${testEmail}` });
    } catch (err) {
      setTestResult({ ok: false, msg: err.message || 'Failed to send test email' });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Alerts</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          <Plus size={14} /> New email alert
        </button>
      </div>

      {/* SMTP Status Card */}
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Mail size={16} />
          <strong style={{ fontSize: 14 }}>Email Configuration (SMTP)</strong>
          {smtp && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: smtp.configured ? 'var(--success, #00b894)' : 'var(--critical)',
              marginLeft: 'auto',
            }}>
              {smtp.configured
                ? <><CheckCircle size={14} /> Connected</>
                : <><XCircle size={14} /> Not configured</>
              }
            </span>
          )}
        </div>

        {smtp && smtp.configured ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <div>Server: <strong style={{ color: 'var(--text)' }}>{smtp.smtp_host}:{smtp.smtp_port}</strong></div>
            <div>Sender: <strong style={{ color: 'var(--text)' }}>{smtp.smtp_email}</strong></div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to send a test"
                style={{ flex: 1, maxWidth: 300, fontSize: 12, padding: '6px 10px' }}
              />
              <button
                className="btn"
                onClick={handleTestEmail}
                disabled={testSending || !testEmail.trim()}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                <Send size={12} />
                {testSending ? 'Sending...' : 'Send test'}
              </button>
            </div>
            {testResult && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12,
                background: testResult.ok ? 'rgba(0,184,148,0.15)' : 'rgba(214,48,49,0.15)',
                color: testResult.ok ? 'var(--success, #00b894)' : 'var(--critical)',
              }}>
                {testResult.ok ? <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : <XCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                {testResult.msg}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}>
              To enable email notifications, add your Gmail SMTP credentials to the <code>.env</code> file:
            </p>
            <div style={{
              background: 'var(--bg)',
              padding: 12,
              borderRadius: 4,
              marginTop: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.6,
            }}>
              SMTP_EMAIL=your.email@gmail.com<br />
              SMTP_PASSWORD=your-app-password
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11 }}>
              Generate an App Password at{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>
                myaccount.google.com/apppasswords
              </a>
            </p>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Email alerts fire when a scan completes with findings at or above your
        severity threshold. You can also enable email notifications per scan in the
        Notifications section of each scan template.
      </div>

      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty">
            <Bell size={32} />
            <div>No alerts configured.</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              Create one to receive email notifications when critical findings appear.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Event</th>
                <th>Condition</th>
                <th>Method</th>
                <th>Status</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                    {a.comment && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.comment}</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{a.event || '—'}</td>
                  <td style={{ fontSize: 12 }}>{a.condition || '—'}</td>
                  <td><Mail size={12} style={{ marginRight: 4 }} />{a.method || '—'}</td>
                  <td>
                    <span className={`badge ${a.active ? 'badge-done' : 'badge-stopped'}`}>
                      {a.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => remove(a.id)}>
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
        <Modal title="New email alert" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Alert name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Critical findings alert"
                required
              />
            </div>
            <div className="form-group">
              <label>Recipient email</label>
              <input
                type="email"
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                placeholder="security@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Trigger when severity is at least</label>
              <select
                value={form.on_severity_at_least}
                onChange={(e) => setForm({ ...form, on_severity_at_least: e.target.value })}
              >
                <option value="9.0">9.0+ (Critical only)</option>
                <option value="7.0">7.0+ (High and above)</option>
                <option value="4.0">4.0+ (Medium and above)</option>
                <option value="0.1">0.1+ (Any finding)</option>
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
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
