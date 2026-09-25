import { Link } from 'react-router-dom';
import { CircleHelp, ScanLine, FileText, Sparkles, ShieldCheck } from 'lucide-react';

const terms = [
  ['Target / Device to Scan', 'The computer, server, hostname, or authorized IP range you want ZeroPoint to check.'],
  ['Port', 'A numbered network entry point used by services such as websites, remote access, or file sharing.'],
  ['Vulnerability', 'A security weakness that may be exploitable. A scanner finding should still be reviewed and validated.'],
  ['CVE', 'A standard identifier for a publicly known vulnerability, for example CVE-2021-44228.'],
  ['CVSS', 'A severity score from 0.0 to 10.0. Higher scores generally indicate more severe vulnerabilities.'],
  ['Authenticated Scan', 'A deeper scan that uses authorized login credentials to inspect installed software, patches, and settings.'],
  ['OpenVAS', 'The vulnerability-scanning engine that performs the security checks.'],
  ['Greenbone / gvmd', 'The management layer that controls scan targets, tasks, configurations, and reports.'],
  ['Feed', 'The vulnerability-test and security-data updates used by the scanner. Outdated feeds can reduce detection coverage.'],
  ['AI Remediation', 'Local AI-generated guidance that helps explain possible fixes. It should be reviewed before applying changes.'],
];

export default function HelpCenter() {
  return (
    <div className="help-page">
      <div className="page-header">
        <div>
          <h2>Help & Terms</h2>
          <p className="page-subtitle">A plain-language guide for users who are new to vulnerability scanning.</p>
        </div>
      </div>

      <div className="guide-hero">
        <div>
          <div className="eyebrow">START HERE</div>
          <h3>You do not need to be a cybersecurity specialist to run a basic scan.</h3>
          <p>For most first-time users, follow the three-step workflow below and keep the recommended defaults.</p>
        </div>
        <CircleHelp size={42} />
      </div>

      <div className="workflow-grid">
        <div className="workflow-card">
          <div className="step-number">1</div>
          <ScanLine size={22} />
          <h3>Scan a device</h3>
          <p>Choose <strong>Recommended Security Scan</strong>, enter an authorized IP address, then launch the scan.</p>
          <Link to="/scans/new" className="btn">Start a scan</Link>
        </div>
        <div className="workflow-card">
          <div className="step-number">2</div>
          <FileText size={22} />
          <h3>Review findings</h3>
          <p>Start with Critical and High findings. Click any finding to read what was detected and which device is affected.</p>
          <Link to="/reports" className="btn btn-secondary">View results</Link>
        </div>
        <div className="workflow-card">
          <div className="step-number">3</div>
          <Sparkles size={22} />
          <h3>Fix and verify</h3>
          <p>Use the remediation guidance as a starting point, validate the fix, then scan again to confirm the finding is gone.</p>
        </div>
      </div>

      <div className="info-callout safe">
        <ShieldCheck size={20} />
        <div>
          <strong>Safe-use reminder</strong>
          <div>Only scan systems you own or have explicit permission to assess. Avoid aggressive scans on fragile or production systems unless the impact is understood.</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Common terms</h3>
        <div className="glossary-grid">
          {terms.map(([term, meaning]) => (
            <div className="glossary-item" key={term}>
              <strong>{term}</strong>
              <p>{meaning}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>How to read severity</h3>
        <div className="severity-explainer">
          <div><span className="sev-pill critical">Critical</span><p>Highest priority. Review as soon as possible.</p></div>
          <div><span className="sev-pill high">High</span><p>Serious weakness. Prioritize for investigation and remediation.</p></div>
          <div><span className="sev-pill medium">Medium</span><p>Important, but urgency depends on exposure and business context.</p></div>
          <div><span className="sev-pill low">Low</span><p>Lower-severity issue that may still be worth addressing.</p></div>
          <div><span className="sev-pill info">Info</span><p>Useful system or service information; not necessarily a vulnerability.</p></div>
        </div>
        <p className="help-note">Severity helps with prioritization, but it is not the same as business risk. Consider whether the device is exposed, important, and actually affected.</p>
      </div>
    </div>
  );
}
