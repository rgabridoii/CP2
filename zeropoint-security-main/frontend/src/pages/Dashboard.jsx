import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ScanLine, FileText, Sparkles, ArrowRight, CircleHelp } from 'lucide-react';
import { api } from '../lib/api';

const severityLevels = [
  { key: 'critical', label: 'Critical', cls: 'sev-critical', help: 'Review immediately' },
  { key: 'high', label: 'High', cls: 'sev-high', help: 'Prioritize soon' },
  { key: 'medium', label: 'Medium', cls: 'sev-medium', help: 'Review in context' },
  { key: 'low', label: 'Low', cls: 'sev-low', help: 'Lower priority' },
  { key: 'info', label: 'Info', cls: 'sev-info', help: 'Informational' },
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
  const urgent = (counts.critical || 0) + (counts.high || 0);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Security Overview</h2>
          <p className="page-subtitle">See what needs attention, then follow the recommended next step.</p>
        </div>
        <Link to="/help" className="btn btn-secondary"><CircleHelp size={14} /> How does this work?</Link>
      </div>

      <div className="action-banner">
        <div>
          <div className="eyebrow">RECOMMENDED NEXT STEP</div>
          <h3>{taskCount === 0 ? 'Run your first security scan' : urgent > 0 ? `Review ${urgent} urgent finding${urgent === 1 ? '' : 's'}` : 'Review your latest scan results'}</h3>
          <p>
            {taskCount === 0
              ? 'Start with the recommended Basic Network Scan. You only need a name and an authorized device IP address.'
              : urgent > 0
                ? 'Critical and High findings deserve attention first. Open the results to understand which devices are affected.'
                : 'No Critical or High findings are currently shown. Review the latest results and keep scanning regularly.'}
          </p>
        </div>
        <Link to={taskCount === 0 ? '/scans/new' : '/reports'} className="btn">
          {taskCount === 0 ? 'Start a scan' : 'Open scan results'} <ArrowRight size={14} />
        </Link>
      </div>

      <div className="workflow-grid compact">
        <Workflow icon={ScanLine} step="1" title="Scan" text="Choose a scan type and enter an authorized device or IP range." />
        <Workflow icon={FileText} step="2" title="Understand" text="Start with Critical and High findings, then open a finding for details." />
        <Workflow icon={Sparkles} step="3" title="Fix & verify" text="Use remediation guidance, validate the change, then scan again." />
      </div>

      <div className="severity-grid">
        {severityLevels.map((s) => (
          <div key={s.key} className={`sev-card ${s.cls}`} title={`${s.label}: ${s.help}`}>
            <div className="label">{s.label}</div>
            <div className="count">{counts[s.key]}</div>
            <div className="severity-help">{s.help}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 className="card-title">Findings by severity</h3>
          <p className="card-explainer">Higher-severity findings should usually be reviewed first, but severity is not the same as business risk.</p>
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
            <Stat label="Scans created" value={taskCount} />
            <Stat label="Devices / targets" value={targetCount} />
            <Stat label="Total findings" value={total} />
            <Stat label="Needs priority review" value={urgent} />
          </div>
          <div className="help-note" style={{ marginTop: 18 }}>
            A finding is a potential issue reported by the scanner. It should be reviewed before being treated as a confirmed security problem.
          </div>
        </div>
      </div>
    </div>
  );
}

function Workflow({ icon: Icon, step, title, text }) {
  return (
    <div className="workflow-card">
      <div className="step-number">{step}</div>
      <Icon size={20} />
      <h3>{title}</h3>
      <p>{text}</p>
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
