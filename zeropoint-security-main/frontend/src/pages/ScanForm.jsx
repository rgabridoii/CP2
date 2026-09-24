import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronDown, X, Save } from 'lucide-react';
import { api } from '../lib/api';

/* Template metadata (maps URL param to display info and backend config) */
const TEMPLATE_META = {
  'host-discovery': {
    title: 'Host Discovery',
    configType: 'discovery',
    defaultDesc: 'Discover live hosts and open ports on the network.',
    targetHint: 'Example: 192.168.1.0/24, 10.0.0.1-10.0.0.50',
  },
  'ping-discovery': {
    title: 'Ping-Only Discovery',
    configType: 'discovery',
    defaultDesc: 'Discover live hosts with minimal network traffic.',
    targetHint: 'Example: 192.168.1.0/24, 10.0.0.1-10.0.0.50',
  },
  'basic-network': {
    title: 'Basic Network Scan',
    configType: 'vulnerability',
    defaultDesc: 'Full system vulnerability scan suitable for any host.',
    targetHint: 'Example: 192.168.1.1-192.168.1.5, 192.168.2.0/24',
  },
  'advanced-scan': {
    title: 'Advanced Scan',
    configType: 'vulnerability',
    defaultDesc: 'Deep scan with all ports, full web app testing, and aggressive settings.',
    targetHint: 'Example: 192.168.1.1, 10.0.0.0/24, server.local',
  },
};

/* Sections per template - each template only shows relevant settings */
function getSections(template) {
  const basic = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
  ];

  if (template === 'ping-discovery') {
    return [
      { group: 'BASIC', items: basic },
      { group: 'DISCOVERY', items: [{ id: 'ping', label: 'Ping Settings' }] },
      { group: 'ADVANCED', items: [{ id: 'advanced', label: 'Advanced' }] },
    ];
  }
  if (template === 'host-discovery') {
    return [
      { group: 'BASIC', items: basic },
      { group: 'DISCOVERY', items: [{ id: 'discovery', label: 'Host Discovery' }] },
      { group: 'ADVANCED', items: [{ id: 'advanced', label: 'Advanced' }] },
    ];
  }
  // basic-network, advanced-scan (vulnerability templates)
  return [
    { group: 'BASIC', items: basic },
    { group: 'DISCOVERY', items: [{ id: 'discovery', label: 'Discovery' }] },
    { group: 'ASSESSMENT', items: [{ id: 'assessment', label: 'Assessment' }] },
    { group: 'REPORT', items: [{ id: 'report', label: 'Report' }] },
    { group: 'ADVANCED', items: [{ id: 'advanced', label: 'Advanced' }] },
  ];
}

export default function ScanForm() {
  const { template } = useParams();
  const navigate = useNavigate();
  const meta = TEMPLATE_META[template] || TEMPLATE_META['basic-network'];
  const sections = getSections(template);

  const [activeTab, setActiveTab] = useState('settings');
  const [activeSection, setActiveSection] = useState('general');
  const [expandedGroups, setExpandedGroups] = useState({ BASIC: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    targets: '',
    // Schedule
    scheduleEnabled: false,
    schedule_id: '',
    // Notifications
    emailRecipients: '',
    // Discovery
    discoveryType: template === 'ping-discovery' ? 'ping-only'
      : template === 'advanced-scan' ? 'port-all' : 'port-common',
    // Assessment
    assessmentType: template === 'advanced-scan' ? 'all-web-complex' : 'default',
    // Advanced
    maxHosts: template === 'advanced-scan' ? '50' : '30',
    maxChecks: template === 'advanced-scan' ? '8' : '4',
    networkTimeout: template === 'advanced-scan' ? '10' : '5',
    // Credentials
    sshEnabled: false,
    sshUser: '',
    sshPassword: '',
    sshAuthMethod: 'password',
    windowsEnabled: false,
    windowsUser: '',
    windowsPassword: '',
    windowsDomain: '',
  });

  const [schedules, setSchedules] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.listSchedules().then(setSchedules).catch(() => {});
    api.listAlerts().then(setAlerts).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGroup(group) {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function buildCredentials() {
    const creds = {};
    if (form.sshEnabled && form.sshUser && form.sshPassword) {
      creds.ssh_user = form.sshUser;
      creds.ssh_password = form.sshPassword;
      creds.ssh_auth_method = form.sshAuthMethod;
    }
    if (form.windowsEnabled && form.windowsUser && form.windowsPassword) {
      creds.windows_user = form.windowsUser;
      creds.windows_password = form.windowsPassword;
      creds.windows_domain = form.windowsDomain || null;
    }
    return Object.keys(creds).length > 0 ? creds : null;
  }

  function buildOptions() {
    const opts = {};
    if (form.scheduleEnabled && form.schedule_id) {
      opts.schedule_id = form.schedule_id;
    }
    if (form.emailRecipients && form.emailRecipients.trim()) {
      opts.email_recipients = form.emailRecipients.trim();
    }
    if (form.discoveryType) {
      opts.port_scan_type = form.discoveryType;
    }
    if (form.assessmentType) {
      opts.assessment_type = form.assessmentType;
    }
    opts.max_hosts = parseInt(form.maxHosts) || 30;
    opts.max_checks = parseInt(form.maxChecks) || 4;
    opts.network_timeout = parseInt(form.networkTimeout) || 5;
    return Object.keys(opts).length > 0 ? opts : null;
  }

  async function handleSave() {
    if (!form.name || !form.targets) {
      setError('Name and Targets are required.');
      setActiveTab('settings');
      setActiveSection('general');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      let result;
      const credentials = buildCredentials();
      const options = buildOptions();

      if (meta.configType === 'discovery') {
        result = await api.createDiscoveryScan({
          name: form.name,
          hosts: form.targets,
          comment: form.description || null,
          credentials,
          options,
          template: template,
        });
      } else {
        result = await api.createVulnScan({
          host: form.targets,
          name: form.name,
          credentials,
          options,
          template: template,
        });
      }

      const taskId = result.task_id || result.id;
      navigate(`/scans/${taskId}`);
    } catch (err) {
      setError(err.message || 'Failed to create scan');
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Render sections ---- */
  function renderGeneral() {
    return (
      <div>
        <h3>General Settings</h3>
        <div className="form-row">
          <label>Name</label>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder=""
                style={{ width: '100%' }}
              />
              <span className="required-tag" style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 9, textTransform: 'uppercase', background: 'var(--bg-elev-2)',
                color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 3,
              }}>REQUIRED</span>
            </div>
          </div>
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            placeholder=""
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-row">
          <label>Targets</label>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={form.targets}
                onChange={(e) => update('targets', e.target.value)}
                rows={4}
                placeholder={meta.targetHint}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <span className="required-tag" style={{
                position: 'absolute', right: 8, top: 8,
                fontSize: 9, textTransform: 'uppercase', background: 'var(--bg-elev-2)',
                color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 3,
              }}>REQUIRED</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>Post-Processing</h3>
          <div className="checkbox-row">
            <input type="checkbox" id="liveResults" />
            <div>
              <label htmlFor="liveResults" className="checkbox-label">Live Results</label>
              <div className="checkbox-hint">
                Enabling this option will identify potential issues discovered by plugins added during updates
                without actively scanning targets. Note that this requires the KB to be included in the scan result.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSchedule() {
    return (
      <div>
        <h3>Schedule</h3>
        <div className="form-row">
          <label>Enabled</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`toggle-switch ${form.scheduleEnabled ? 'on' : ''}`}
              onClick={() => update('scheduleEnabled', !form.scheduleEnabled)}
            >
              <div className="toggle-knob" />
            </div>
            <span className="toggle-label">{form.scheduleEnabled ? 'ON' : 'OFF'}</span>
          </div>
        </div>
        {form.scheduleEnabled && (
          <div className="form-row">
            <label>Schedule</label>
            <select
              value={form.schedule_id}
              onChange={(e) => update('schedule_id', e.target.value)}
            >
              <option value="">-- select schedule --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div>
        <h3>Notifications</h3>
        <div className="form-row">
          <label>Email Recipient(s)</label>
          <textarea
            value={form.emailRecipients}
            onChange={(e) => update('emailRecipients', e.target.value)}
            rows={4}
            placeholder="Example: me@example.com, you@example.com"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
          An email alert will be created for each recipient. Notifications fire when the scan
          completes with findings at severity 4.0 (medium) or above.
        </div>
      </div>
    );
  }

  function renderDiscovery() {
    return (
      <div>
        <h3>{template === 'host-discovery' ? 'Host Discovery Settings' : 'Discovery Settings'}</h3>
        <div className="form-row">
          <label>Scan Type</label>
          <select
            value={form.discoveryType}
            onChange={(e) => update('discoveryType', e.target.value)}
          >
            <option value="port-common">Port scan (common ports)</option>
            <option value="port-all">Port scan (all ports)</option>
          </select>
        </div>

        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 4, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>General Settings:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Use fast network discovery<br />
            Test local scanner host connectivity
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Port Scanner Settings:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {form.discoveryType === 'port-all'
              ? 'Scan all 65,535 TCP ports'
              : 'Scan common IANA-assigned TCP ports (~5,000)'}<br />
            Use netstat if credentials are provided<br />
            Use SYN scanner if necessary
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Ping hosts using:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            TCP<br />
            ARP<br />
            ICMP (2 retries)
          </div>
        </div>
      </div>
    );
  }

  function renderPing() {
    return (
      <div>
        <h3>Ping Settings</h3>
        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ping Methods:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            ARP ping (local network, most reliable)<br />
            ICMP echo request (2 retries)<br />
            TCP ping on common ports (80, 443, 22)
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Behavior:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Minimal port scanning (host alive detection only)<br />
            Fast network discovery enabled<br />
            No vulnerability assessment performed
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Output:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Alive / unreachable host status<br />
            IP and MAC address mapping<br />
            Basic OS fingerprinting (when possible)
          </div>
        </div>
      </div>
    );
  }

  function renderAssessment() {
    return (
      <div>
        <h3>Assessment Settings</h3>
        <div className="form-row">
          <label>Scan Type</label>
          <select
            value={form.assessmentType}
            onChange={(e) => update('assessmentType', e.target.value)}
          >
            <option value="default">Default</option>
            <option value="known-web">Scan for known web vulnerabilities</option>
            <option value="all-web-quick">Scan for all web vulnerabilities (quick)</option>
            <option value="all-web-complex">Scan for all web vulnerabilities (complex)</option>
          </select>
        </div>

        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 4, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {form.assessmentType === 'all-web-complex' ? 'Full and Deep Scan:' : 'General Settings:'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {form.assessmentType === 'all-web-complex' ? (
              <>
                Thorough scanning with all NVT families enabled<br />
                Deep web application analysis<br />
                Slower but more comprehensive detection
              </>
            ) : (
              <>
                Avoid potential false alarms<br />
                {form.assessmentType === 'default' ? 'Disable CGI scanning' : 'Enable CGI scanning'}
              </>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Web Applications:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {form.assessmentType === 'default'
              ? 'Disable web application scanning'
              : form.assessmentType === 'all-web-complex'
                ? 'Full web application scanning with complex methods'
                : 'Scan for known web application vulnerabilities'}
          </div>
        </div>
      </div>
    );
  }

  function renderReport() {
    return (
      <div>
        <h3>Report Settings</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Reports are generated automatically when the scan completes.
          You can export reports in PDF, HTML, CSV, or XML format from the Reports page.
        </div>
      </div>
    );
  }

  function renderAdvanced() {
    return (
      <div>
        <h3>Advanced Settings</h3>
        <div className="form-row">
          <label>Max Hosts</label>
          <input
            type="number"
            value={form.maxHosts}
            onChange={(e) => update('maxHosts', e.target.value)}
            min="1"
            max="100"
            style={{ maxWidth: 100 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            simultaneous hosts
          </span>
        </div>
        <div className="form-row">
          <label>Max Checks</label>
          <input
            type="number"
            value={form.maxChecks}
            onChange={(e) => update('maxChecks', e.target.value)}
            min="1"
            max="20"
            style={{ maxWidth: 100 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            checks per host
          </span>
        </div>
        <div className="form-row">
          <label>Network Timeout</label>
          <input
            type="number"
            value={form.networkTimeout}
            onChange={(e) => update('networkTimeout', e.target.value)}
            min="1"
            max="30"
            style={{ maxWidth: 100 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            seconds
          </span>
        </div>

        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 4, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Performance summary:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {form.maxHosts} simultaneous hosts (max)<br />
            {form.maxChecks} simultaneous checks per host (max)<br />
            {form.networkTimeout} second network read timeout
          </div>
        </div>
      </div>
    );
  }

  function renderCredentials() {
    return (
      <div className="cred-layout">
        <div className="cred-sidebar">
          <div className="cred-cat-label">Categories</div>
          <select defaultValue="host">
            <option value="host">Host</option>
            <option value="all">All</option>
          </select>
          <div
            className={`cred-item ${form.sshEnabled ? 'active' : ''}`}
            onClick={() => update('sshEnabled', !form.sshEnabled)}
          >
            SSH
          </div>
          <div
            className={`cred-item ${form.windowsEnabled ? 'active' : ''}`}
            onClick={() => update('windowsEnabled', !form.windowsEnabled)}
          >
            Windows
          </div>
        </div>
        <div className="cred-content">
          {/* SSH section */}
          <div className="cred-section">
            <div className="cred-section-header" onClick={() => update('sshEnabled', !form.sshEnabled)}>
              <h4>
                {form.sshEnabled ? <ChevronDown size={14} style={{ marginRight: 4 }} />
                  : <ChevronRight size={14} style={{ marginRight: 4 }} />}
                SSH
              </h4>
              <button className="close-btn"><X size={14} /></button>
            </div>
            {form.sshEnabled && (
              <div>
                <div className="form-row">
                  <label>Authentication method</label>
                  <select
                    value={form.sshAuthMethod}
                    onChange={(e) => update('sshAuthMethod', e.target.value)}
                  >
                    <option value="password">password</option>
                    <option value="public-key">public key</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Username</label>
                  <input
                    value={form.sshUser}
                    onChange={(e) => update('sshUser', e.target.value)}
                    placeholder="root"
                  />
                </div>
                {form.sshAuthMethod === 'password' && (
                  <div className="form-row">
                    <label>Password</label>
                    <input
                      type="password"
                      value={form.sshPassword}
                      onChange={(e) => update('sshPassword', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Windows section */}
          <div className="cred-section">
            <div className="cred-section-header" onClick={() => update('windowsEnabled', !form.windowsEnabled)}>
              <h4>
                {form.windowsEnabled ? <ChevronDown size={14} style={{ marginRight: 4 }} />
                  : <ChevronRight size={14} style={{ marginRight: 4 }} />}
                Windows
              </h4>
              <button className="close-btn"><X size={14} /></button>
            </div>
            {form.windowsEnabled && (
              <div>
                <div className="form-row">
                  <label>Authentication method</label>
                  <select defaultValue="password">
                    <option value="password">Password</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Username</label>
                  <input
                    value={form.windowsUser}
                    onChange={(e) => update('windowsUser', e.target.value)}
                    placeholder="administrator"
                  />
                </div>
                <div className="form-row">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.windowsPassword}
                    onChange={(e) => update('windowsPassword', e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Domain</label>
                  <input
                    value={form.windowsDomain}
                    onChange={(e) => update('windowsDomain', e.target.value)}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Global Credential Settings</div>
                  <div className="checkbox-row">
                    <input type="checkbox" defaultChecked id="noClear" />
                    <div>
                      <label htmlFor="noClear" className="checkbox-label">Never send credentials in the clear</label>
                      <div className="checkbox-hint">For security reasons, Windows credentials are not sent in the clear by default.</div>
                    </div>
                  </div>
                  <div className="checkbox-row">
                    <input type="checkbox" defaultChecked id="noNtlm" />
                    <div>
                      <label htmlFor="noNtlm" className="checkbox-label">Do not use NTLMv1 authentication</label>
                      <div className="checkbox-hint">
                        Force NTLMv2 only. NTLMv1 is an insecure protocol and this option is enabled by default.
                      </div>
                    </div>
                  </div>
                  <div className="checkbox-row">
                    <input type="checkbox" id="remoteReg" />
                    <div>
                      <label htmlFor="remoteReg" className="checkbox-label">Start the Remote Registry service during the scan</label>
                      <div className="checkbox-hint">
                        This service must be running in order to execute some Windows local check plugins.
                      </div>
                    </div>
                  </div>
                  <div className="checkbox-row">
                    <input type="checkbox" id="adminShares" />
                    <div>
                      <label htmlFor="adminShares" className="checkbox-label">Enable administrative shares during the scan</label>
                      <div className="checkbox-hint">
                        This will allow access to certain registry entries that can be read with administrator privileges.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const sectionRenderers = {
    general: renderGeneral,
    schedule: renderSchedule,
    notifications: renderNotifications,
    discovery: renderDiscovery,
    ping: renderPing,
    assessment: renderAssessment,
    report: renderReport,
    advanced: renderAdvanced,
  };

  return (
    <div className="scanform-page">
      <div className="scanform-header">
        <h2>New Scan / {meta.title}</h2>
        <Link to="/scans/new" className="templates-back" style={{ marginTop: 4 }}>
          <ArrowLeft size={14} /> Back to Scan Templates
        </Link>
      </div>

      {error && (
        <div style={{
          background: 'rgba(214,48,49,0.15)', color: 'var(--critical)',
          padding: '10px 16px', borderRadius: 4, fontSize: 13, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="scanform-tabs">
        <button
          className={`scanform-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`scanform-tab ${activeTab === 'credentials' ? 'active' : ''}`}
          onClick={() => setActiveTab('credentials')}
        >
          Credentials
        </button>
      </div>

      {/* Body */}
      <div className="scanform-body">
        {activeTab === 'settings' ? (
          <>
            {/* Sidebar */}
            <div className="scanform-sidebar">
              {sections.map(({ group, items }) => (
                <div className="scanform-section-group" key={group}>
                  <div
                    className="scanform-section-title"
                    onClick={() => toggleGroup(group)}
                  >
                    {expandedGroups[group]
                      ? <ChevronDown size={10} />
                      : <ChevronRight size={10} />}
                    {group}
                  </div>
                  {expandedGroups[group] && items.map((item) => (
                    <div
                      key={item.id}
                      className={`scanform-section-item ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(item.id)}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Content */}
            <div className="scanform-content">
              {sectionRenderers[activeSection]?.() || renderGeneral()}
            </div>
          </>
        ) : (
          renderCredentials()
        )}
      </div>

      {/* Footer */}
      <div className="scanform-footer">
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={submitting}
        >
          <Save size={14} />
          {submitting ? 'Creating...' : 'Save & Launch'}
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate('/scans/new')}
          style={{ marginLeft: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
