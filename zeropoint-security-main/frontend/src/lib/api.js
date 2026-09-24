// Tiny fetch wrapper around the FastAPI backend.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request('/health'),

  // Targets
  listTargets: () => request('/targets'),
  createTarget: (data) => request('/targets', { method: 'POST', body: JSON.stringify(data) }),
  deleteTarget: (id) => request(`/targets/${id}`, { method: 'DELETE' }),

  // Credentials
  listCredentials: () => request('/credentials'),
  createCredential: (data) => request('/credentials', { method: 'POST', body: JSON.stringify(data) }),
  deleteCredential: (id) => request(`/credentials/${id}`, { method: 'DELETE' }),

  // Tasks
  listTasks: () => request('/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  startTask: (id) => request(`/tasks/${id}/start`, { method: 'POST' }),
  stopTask: (id) => request(`/tasks/${id}/stop`, { method: 'POST' }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  listScanConfigs: () => request('/tasks/_helpers/scan-configs'),
  listScanners: () => request('/tasks/_helpers/scanners'),

  // Schedules
  listSchedules: () => request('/schedules'),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),

  // Reports
  listReports: () => request('/reports'),
  getReport: (id) => request(`/reports/${id}`),
  exportReportUrl: (id, format = 'pdf') => `${BASE}/reports/${id}/export?format=${format}`,

  // Assets
  listAssets: (type = 'host') => request(`/assets?asset_type=${type}`),

  // Port Lists
  listPortLists: () => request('/port-lists'),
  createPortList: (data) => request('/port-lists', { method: 'POST', body: JSON.stringify(data) }),
  deletePortList: (id) => request(`/port-lists/${id}`, { method: 'DELETE' }),

  // Scan Configs (extended)
  listScanConfigsDetailed: () => request('/scan-configs'),
  cloneScanConfig: (id) => request(`/scan-configs/${id}/clone`, { method: 'POST' }),
  deleteScanConfig: (id) => request(`/scan-configs/${id}`, { method: 'DELETE' }),

  // SecInfo
  getFeedsStatus: () => request('/secinfo/feeds'),
  getSecInfoCounts: () => request('/secinfo/counts'),
  getCve: (cveId) => request(`/secinfo/cve/${encodeURIComponent(cveId)}`),

  // Alerts
  listAlerts: () => request('/alerts'),
  createEmailAlert: (data) => request('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  deleteAlert: (id) => request(`/alerts/${id}`, { method: 'DELETE' }),
  getSmtpStatus: () => request('/alerts/smtp-status'),
  sendTestEmail: (data) => request('/alerts/test-email', { method: 'POST', body: JSON.stringify(data) }),

  // CVE Browser
  listCves: (page = 1, pageSize = 50, search = '') =>
    request(`/cves?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}`),

  // Trends
  getSeverityTrend: (days = 30) => request(`/trends/severity?days=${days}`),

  // AI Remediation
  getRemediation: (finding) => request('/ai/remediation', { method: 'POST', body: JSON.stringify(finding) }),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),

  // Quick Scans
  createTlsScan: (data) => request('/quickscans/tls-certificate', { method: 'POST', body: JSON.stringify(data) }),
  createDiscoveryScan: (data) => request('/quickscans/discovery', { method: 'POST', body: JSON.stringify(data) }),
  createVulnScan: (data) => request('/quickscans/vulnerability', { method: 'POST', body: JSON.stringify(data) }),
};
