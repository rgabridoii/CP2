import { useEffect, useState } from 'react';
import { Plus, Trash2, Key } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Credentials() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', login: '', password: '', credential_type: 'up',
  });

  async function reload() {
    setItems(await api.listCredentials().catch(() => []));
  }
  useEffect(() => { reload(); }, []);

  async function submit(e) {
    e.preventDefault();
    await api.createCredential(form);
    setOpen(false);
    setForm({ name: '', login: '', password: '', credential_type: 'up' });
    reload();
  }

  async function remove(id) {
    if (!confirm('Delete this credential?')) return;
    await api.deleteCredential(id);
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Credentials</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          <Plus size={14} /> New credential
        </button>
      </div>

      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty">
            <Key size={32} />
            <div>No credentials stored. Add SSH or SMB credentials for authenticated scans.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Login</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{c.login}</td>
                  <td>
                    <button className="btn-icon" onClick={() => remove(c.id)}>
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
        <Modal title="New credential" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={form.credential_type}
                onChange={(e) => setForm({ ...form, credential_type: e.target.value })}
              >
                <option value="up">Username + Password</option>
                <option value="usk">Username + SSH Key</option>
              </select>
            </div>
            <div className="form-group">
              <label>Login</label>
              <input
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password / Key</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
