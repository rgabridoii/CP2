import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

// Build a simple iCalendar string from a user choice
function buildIcal(startIso, freq) {
  // YYYYMMDDTHHMMSSZ
  const stamp = new Date(startIso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZeroPoint Security//EN',
    'BEGIN:VEVENT',
    `DTSTART:${stamp}`,
    `RRULE:FREQ=${freq}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
}

export default function Schedules() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', start: new Date().toISOString().slice(0, 16), freq: 'DAILY', timezone: 'UTC',
  });

  async function reload() {
    setItems(await api.listSchedules().catch(() => []));
  }
  useEffect(() => { reload(); }, []);

  async function submit(e) {
    e.preventDefault();
    await api.createSchedule({
      name: form.name,
      icalendar: buildIcal(form.start, form.freq),
      timezone: form.timezone,
    });
    setOpen(false);
    reload();
  }

  async function remove(id) {
    if (!confirm('Delete this schedule?')) return;
    await api.deleteSchedule(id);
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Schedules</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          <Plus size={14} /> New schedule
        </button>
      </div>

      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty">
            <Calendar size={32} />
            <div>No schedules yet. Add one to run recurring scans automatically.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Timezone</th>
                <th>Next run</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.timezone}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.next_time || '—'}</td>
                  <td>
                    <button className="btn-icon" onClick={() => remove(s.id)}>
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
        <Modal title="New schedule" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Start at</label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Repeat</label>
              <select value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })}>
                <option value="HOURLY">Hourly</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
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
