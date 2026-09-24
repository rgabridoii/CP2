import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

const SEVERITIES = [
  { key: 'critical', label: 'Critical', color: '#d63031' },
  { key: 'high', label: 'High', color: '#e17055' },
  { key: 'medium', label: 'Medium', color: '#fdcb6e' },
  { key: 'low', label: 'Low', color: '#74b9ff' },
  { key: 'info', label: 'Info', color: '#a29bfe' },
];

export default function Trends() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getSeverityTrend(days)
      .then((d) => { setData(d || []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [days]);

  // Summary totals
  const totals = SEVERITIES.reduce((acc, s) => {
    acc[s.key] = data.reduce((sum, d) => sum + (d[s.key] || 0), 0);
    return acc;
  }, {});
  const totalScans = data.reduce((sum, d) => sum + (d.scans || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2>Severity Trends</h2>
        <div className="flex" style={{ gap: 4 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn ${days === d ? '' : 'btn-secondary'}`}
              onClick={() => setDays(d)}
            >
              {d} days
            </button>
          ))}
          <button
            className={`btn ${days === 0 ? '' : 'btn-secondary'}`}
            onClick={() => setDays(0)}
          >
            All
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Aggregated severity counts per day across all scan reports. A downward
        trend means findings are being remediated faster than new ones appear.
      </div>

      <div className="severity-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 16 }}>
        {SEVERITIES.map((s) => (
          <div key={s.key} className={`sev-card sev-${s.key}`}>
            <div className="label">{s.label}</div>
            <div className="count">{totals[s.key]}</div>
          </div>
        ))}
        <div className="sev-card" style={{ borderLeftColor: 'var(--accent)' }}>
          <div className="label">Scans</div>
          <div className="count">{totalScans}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Severity over time ({days === 0 ? 'all time' : `${days} days`})</h3>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : data.length === 0 ? (
          <div className="empty"><TrendingUp size={32} /><div>No trend data yet.</div></div>
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid stroke="#2d3744" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b95a4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b95a4', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a2028', border: '1px solid #2d3744' }}
                  labelStyle={{ color: '#e6edf3' }}
                />
                <Legend wrapperStyle={{ color: '#8b95a4', fontSize: 12 }} />
                {SEVERITIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={s.label}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Scans per day</h3>
        {data.length === 0 ? null : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid stroke="#2d3744" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b95a4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b95a4', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a2028', border: '1px solid #2d3744' }} />
                <Bar dataKey="scans" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
