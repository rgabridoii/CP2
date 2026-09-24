from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services import gvm_client
from ..services.scan_monitor import register_notification

router = APIRouter(prefix="/api/quickscans", tags=["quickscans"])


# ----- Shared sub-models -----

class ScanCredentials(BaseModel):
    ssh_user: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_auth_method: Optional[str] = "password"
    windows_user: Optional[str] = None
    windows_password: Optional[str] = None
    windows_domain: Optional[str] = None


class ScanOptions(BaseModel):
    schedule_id: Optional[str] = None
    email_recipients: Optional[str] = None       # comma-separated emails
    port_scan_type: Optional[str] = "port-common" # port-common | port-all | custom
    assessment_type: Optional[str] = "default"    # default | known-web | all-web-quick | all-web-complex | custom
    max_hosts: Optional[int] = 30
    max_checks: Optional[int] = 4
    network_timeout: Optional[int] = 5


# ----- Scan create models -----

class TlsScanCreate(BaseModel):
    name: str
    hosts: str
    comment: Optional[str] = None
    credentials: Optional[ScanCredentials] = None
    options: Optional[ScanOptions] = None
    tls_ports: Optional[str] = None  # comma-separated ports, e.g. "443,8443,993"


class DiscoveryScanCreate(BaseModel):
    name: str
    hosts: str
    comment: Optional[str] = None
    credentials: Optional[ScanCredentials] = None
    options: Optional[ScanOptions] = None
    template: Optional[str] = None  # e.g. ping-discovery, host-discovery


class VulnScanCreate(BaseModel):
    host: str
    name: Optional[str] = None
    credentials: Optional[ScanCredentials] = None
    options: Optional[ScanOptions] = None
    template: Optional[str] = None  # e.g. basic-network, advanced-scan


# Known UUIDs of built-in scan configs
DISCOVERY_CONFIG_UUID = "8715c877-47a0-438d-98a3-27c7a6ab2196"
FULL_AND_FAST_CONFIG_UUID = "daba56c8-73ec-11df-a475-002264764cea"

# Assessment type -> scan config name pattern (for dynamic lookup)
ASSESSMENT_CONFIG_MAP = {
    "default": "Full and Fast$",
    "known-web": "Full and Fast$",
    "all-web-quick": "Full and Fast$",
    "all-web-complex": "Full and Deep",
    "custom": "Full and Fast$",
}


def _get_default_scanner_id() -> str:
    """Find the OpenVAS Default scanner."""
    for s in gvm_client.list_scanners():
        if s.get("name") == "OpenVAS Default":
            return s.get("id")
    scanners = gvm_client.list_scanners()
    if scanners:
        return scanners[0].get("id")
    raise RuntimeError("No scanners available")


def _create_scan_credentials(creds: ScanCredentials, scan_name: str) -> dict:
    """Create SSH and/or SMB credentials in gvmd. Returns dict with credential IDs."""
    result = {}
    if creds.ssh_user and creds.ssh_password:
        ssh_cred_id = gvm_client.create_credential_password(
            name=f"{scan_name} - SSH",
            login=creds.ssh_user,
            password=creds.ssh_password,
            credential_type="up",
        )
        result["ssh_credential_id"] = ssh_cred_id

    if creds.windows_user and creds.windows_password:
        smb_cred_id = gvm_client.create_credential_password(
            name=f"{scan_name} - SMB",
            login=creds.windows_user,
            password=creds.windows_password,
            credential_type="up",
        )
        result["smb_credential_id"] = smb_cred_id

    return result


def _create_email_alerts(email_recipients: str, scan_name: str) -> list[str]:
    """Create email alerts for each recipient. Returns list of alert IDs."""
    alert_ids = []
    recipients = [r.strip() for r in email_recipients.split(",") if r.strip()]
    for recipient in recipients:
        alert_id = gvm_client.create_email_alert(
            name=f"{scan_name} - Alert ({recipient})",
            recipient=recipient,
            on_severity_at_least=4.0,
            comment=f"Auto-created by ZeroPoint for scan: {scan_name}",
        )
        alert_ids.append(alert_id)
    return alert_ids


def _build_task_preferences(opts: ScanOptions) -> dict | None:
    """Build scanner preferences dict from options."""
    prefs = {}
    if opts.max_hosts and opts.max_hosts != 30:
        prefs["max_hosts"] = str(opts.max_hosts)
    if opts.max_checks and opts.max_checks != 4:
        prefs["max_checks"] = str(opts.max_checks)
    if opts.network_timeout and opts.network_timeout != 5:
        prefs["network_timeout"] = str(opts.network_timeout)
    return prefs if prefs else None


TEMPLATE_LABELS = {
    "ping-discovery": "Ping-Only Discovery",
    "host-discovery": "Host Discovery",
    "basic-network": "Basic Network Scan",
    "advanced-scan": "Advanced Scan",
}


def _build_comment(base: str, template: str | None) -> str:
    """Build task comment with embedded template tag for UI display."""
    tag = f"[template:{template}]" if template else ""
    return f"{base} {tag}".strip()


def _resolve_port_list(port_scan_type: str) -> str | None:
    """Resolve port scan type to a port list ID. Returns None for default."""
    if port_scan_type == "ping-only":
        return gvm_client.get_or_create_ping_port_list()
    if port_scan_type == "port-all":
        return gvm_client.get_or_create_all_tcp_port_list()
    # port-common and custom use the default port list (handled by create_target)
    return None


def _resolve_vuln_config(assessment_type: str) -> str:
    """Resolve assessment type to a scan config UUID."""
    if assessment_type == "all-web-complex":
        config_id = gvm_client.find_scan_config("Full and Deep")
        if config_id:
            return config_id
    # Default: Full and Fast
    return FULL_AND_FAST_CONFIG_UUID


def _process_options(opts: ScanOptions | None, scan_name: str) -> dict:
    """Process ScanOptions into task-creation kwargs.
    Returns dict with optional keys: schedule_id, alert_ids, preferences."""
    result = {}
    if not opts:
        return result

    if opts.schedule_id:
        result["schedule_id"] = opts.schedule_id

    if opts.email_recipients:
        try:
            alert_ids = _create_email_alerts(opts.email_recipients, scan_name)
            if alert_ids:
                result["alert_ids"] = alert_ids
        except Exception:
            pass  # alert creation failure should not block the scan

    prefs = _build_task_preferences(opts)
    if prefs:
        result["preferences"] = prefs

    return result


# =====================================================================
# Endpoints
# =====================================================================

@router.post("/tls-certificate", status_code=201)
def create_tls_scan(payload: TlsScanCreate):
    """Quick-scan preset for TLS / SSL certificate checks."""
    try:
        cred_ids = {}
        if payload.credentials:
            cred_ids = _create_scan_credentials(payload.credentials, payload.name)

        # Use custom ports if provided, otherwise default TLS ports
        if payload.tls_ports and payload.tls_ports.strip():
            custom_ports = ",".join(
                p.strip() for p in payload.tls_ports.split(",") if p.strip()
            )
            port_list_id = gvm_client.get_or_create_tls_port_list(custom_ports)
        else:
            port_list_id = gvm_client.get_or_create_tls_port_list()

        target_id = gvm_client.create_target(
            name=f"{payload.name} (TLS target)",
            hosts=payload.hosts,
            port_list_id=port_list_id,
            comment=payload.comment or "Created by ZeroPoint TLS Quick Scan",
            **cred_ids,
        )

        scanner_id = _get_default_scanner_id()
        task_kwargs = _process_options(payload.options, payload.name)

        task_id = gvm_client.create_task(
            name=f"{payload.name} (TLS scan)",
            target_id=target_id,
            config_id=FULL_AND_FAST_CONFIG_UUID,
            scanner_id=scanner_id,
            comment="TLS / SSL certificate verification scan",
            **task_kwargs,
        )

        # Auto-start only if no schedule is set
        if not task_kwargs.get("schedule_id"):
            gvm_client.start_task(task_id)

        # Register email notification for our SMTP service
        if payload.options and payload.options.email_recipients:
            recipients = [r.strip() for r in payload.options.email_recipients.split(",") if r.strip()]
            if recipients:
                register_notification(task_id, recipients, payload.name)

        return {
            "task_id": task_id,
            "target_id": target_id,
            "port_list_id": port_list_id,
            "credentials_created": list(cred_ids.keys()),
            "alerts_created": len(task_kwargs.get("alert_ids", [])),
            "scheduled": bool(task_kwargs.get("schedule_id")),
            "message": "TLS scan created and started.",
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/discovery", status_code=201)
def create_discovery_scan(payload: DiscoveryScanCreate):
    """Quick-scan preset for network discovery."""
    try:
        cred_ids = {}
        if payload.credentials:
            cred_ids = _create_scan_credentials(payload.credentials, payload.name)

        # Resolve port list based on discovery type selection
        port_list_id = None
        if payload.options and payload.options.port_scan_type:
            port_list_id = _resolve_port_list(payload.options.port_scan_type)

        target_id = gvm_client.create_target(
            name=f"{payload.name} (Discovery target)",
            hosts=payload.hosts,
            port_list_id=port_list_id,  # None = use default
            comment=payload.comment or "Created by ZeroPoint Discovery Scan",
            **cred_ids,
        )

        scanner_id = _get_default_scanner_id()
        task_kwargs = _process_options(payload.options, payload.name)

        task_id = gvm_client.create_task(
            name=f"{payload.name} (Discovery)",
            target_id=target_id,
            config_id=DISCOVERY_CONFIG_UUID,
            scanner_id=scanner_id,
            comment=_build_comment(
                "Network discovery scan to find live hosts and services",
                payload.template,
            ),
            **task_kwargs,
        )

        # Auto-start only if no schedule is set
        if not task_kwargs.get("schedule_id"):
            gvm_client.start_task(task_id)

        # Register email notification for our SMTP service
        if payload.options and payload.options.email_recipients:
            recipients = [r.strip() for r in payload.options.email_recipients.split(",") if r.strip()]
            if recipients:
                register_notification(task_id, recipients, payload.name)

        return {
            "task_id": task_id,
            "target_id": target_id,
            "credentials_created": list(cred_ids.keys()),
            "alerts_created": len(task_kwargs.get("alert_ids", [])),
            "scheduled": bool(task_kwargs.get("schedule_id")),
            "message": "Discovery scan created and started.",
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/vulnerability", status_code=201)
def create_vuln_scan(payload: VulnScanCreate):
    """Quick vulnerability scan. Creates target, task, and starts it."""
    try:
        scan_name = payload.name or f"Vuln scan - {payload.host}"

        cred_ids = {}
        if payload.credentials:
            cred_ids = _create_scan_credentials(payload.credentials, scan_name)

        # Resolve port list from options
        port_list_id = None
        if payload.options and payload.options.port_scan_type:
            port_list_id = _resolve_port_list(payload.options.port_scan_type)

        target_id = gvm_client.create_target(
            name=f"{scan_name} (target)",
            hosts=payload.host,
            port_list_id=port_list_id,
            comment="Created from ZeroPoint scan form",
            **cred_ids,
        )

        # Resolve scan config from assessment type
        config_id = FULL_AND_FAST_CONFIG_UUID
        if payload.options and payload.options.assessment_type:
            config_id = _resolve_vuln_config(payload.options.assessment_type)

        scanner_id = _get_default_scanner_id()
        task_kwargs = _process_options(payload.options, scan_name)

        task_id = gvm_client.create_task(
            name=scan_name,
            target_id=target_id,
            config_id=config_id,
            scanner_id=scanner_id,
            comment=_build_comment(
                f"Vulnerability scan for {payload.host}",
                payload.template,
            ),
            **task_kwargs,
        )

        # Auto-start only if no schedule is set
        if not task_kwargs.get("schedule_id"):
            gvm_client.start_task(task_id)

        # Register email notification for our SMTP service
        if payload.options and payload.options.email_recipients:
            recipients = [r.strip() for r in payload.options.email_recipients.split(",") if r.strip()]
            if recipients:
                register_notification(task_id, recipients, scan_name)

        return {
            "task_id": task_id,
            "target_id": target_id,
            "credentials_created": list(cred_ids.keys()),
            "alerts_created": len(task_kwargs.get("alert_ids", [])),
            "scheduled": bool(task_kwargs.get("schedule_id")),
            "message": f"Vulnerability scan started for {payload.host}.",
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
