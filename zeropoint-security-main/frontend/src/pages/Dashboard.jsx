import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';

const severityLevels = [
  { key: 'critical', label: 'Critical', cls: 'sev-critical' },
  { key: 'high', label: 'High', cls: 'sev-high' },
  { key: 'medium', label: 'Medium', cls: 'sev-medium' },
  { key: 'low', label: 'Low', cls: 'sev-low' },
  { key: 'info', label: 'Info', cls: 'sev-info' },
];

export default function Dashboard() {
  const [counts, setCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  const [taskCount, setTaskCount] = useState(0);
  const [targetCount, setTargetCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [tasks, targets, summary] = await Promise.all([
          api.listTasks().catch(() => []),
          api.listTargets().catch(() => []),
          api.getDashboardSummary().catch(() => ({ critical: 0, high: 0, medium: 0, low: 0, info: 0 })),
        ]);
        setTaskCount(tasks.length);
        setTargetCount(targets.length);
        setCounts(summary);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const chartData = severityLevels.map((s) => ({ name: s.label, value: counts[s.key] }));

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="severity-grid">
        {severityLevels.map((s) => (
          <div key={s.key} className={`sev-card ${s.cls}`}>
            <div className="label">{s.label}</div>
            <div className="count">{counts[s.key]}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 className="card-title">Findings by severity</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#2d3744" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8b95a4', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8b95a4', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a2028', border: '1px solid #2d3744' }} />
                <Bar dataKey="value" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">At a glance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <Stat label="Scan tasks" value={taskCount} />
            <Stat label="Targets" value={targetCount} />
            <Stat
              label="Total findings"
              value={Object.values(counts).reduce((a, b) => a + b, 0)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
