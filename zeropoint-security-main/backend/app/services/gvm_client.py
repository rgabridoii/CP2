"""Thin wrapper around python-gvm. Connects to gvmd over a Unix socket
and authenticates with credentials from env vars."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator
from xml.etree import ElementTree as ET

from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeTransform

from ..config import settings


@contextmanager
def gmp_session() -> Iterator[Gmp]:
    connection = UnixSocketConnection(path=settings.gvm_socket)
    with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
        gmp.authenticate(settings.gvm_user, settings.gvm_password)
        yield gmp


def _xml_to_dict(element: ET.Element) -> dict:
    out = {**element.attrib}
    for child in element:
        if len(child) == 0 and not child.attrib:
            out[child.tag] = child.text
        else:
            out[child.tag] = _xml_to_dict(child)
    return out


def _is_predefined(element) -> bool:
    """Detect built-in/predefined gvmd resources.

    Note: in GMP 22.7, gvmd often sets <predefined>0</predefined> on
    built-in objects (because the admin user technically 'owns' them
    after initial bootstrap). The most reliable indicator is
    <writable>0</writable> - true built-ins are not user-writable."""
    # Explicit predefined=1 always wins
    if element.findtext("predefined") in ("1", "true", "True"):
        return True
    if element.get("predefined") in ("1", "true", "True"):
        return True
    # writable=0 means built-in (predefined=0 is unreliable in 22.7)
    if element.findtext("writable") == "0":
        return True
    return False


# ----- Targets ------------------------------------------------------

def list_targets() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_targets()
        return [_xml_to_dict(t) for t in response.findall("target")]


def _default_port_list_id(gmp) -> str:
    DEFAULT_PORT_LIST_UUID = "33d0cd82-57c6-11e1-8ed1-406186ea4fc5"
    try:
        response = gmp.get_port_lists()
        port_lists = response.findall("port_list")
        for pl in port_lists:
            if pl.get("id") == DEFAULT_PORT_LIST_UUID:
                return DEFAULT_PORT_LIST_UUID
        if port_lists:
            return port_lists[0].get("id")
    except Exception:
        pass
    return DEFAULT_PORT_LIST_UUID


def create_target(name: str, hosts: str, port_list_id: str | None = None,
                  comment: str | None = None,
                  ssh_credential_id: str | None = None,
                  smb_credential_id: str | None = None) -> str:
    from datetime import datetime, timezone
    # Append short timestamp to avoid duplicate-name errors on re-runs
    ts = datetime.now(timezone.utc).strftime("%m%d-%H%M%S")
    unique_name = f"{name} [{ts}]"
    with gmp_session() as gmp:
        if not port_list_id:
            port_list_id = _default_port_list_id(gmp)
        kwargs = dict(
            name=unique_name,
            hosts=[h.strip() for h in hosts.split(",") if h.strip()],
            port_list_id=port_list_id,
            comment=comment,
        )
        if ssh_credential_id:
            kwargs["ssh_credential_id"] = ssh_credential_id
        if smb_credential_id:
            kwargs["smb_credential_id"] = smb_credential_id
        response = gmp.create_target(**kwargs)
        target_id = response.get("id", "")
        if not target_id:
            status = response.get("status", "")
            status_text = response.get("status_text", "unknown error")
            raise RuntimeError(f"Target creation failed ({status}): {status_text}")
        return target_id


def delete_target(target_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_target(target_id=target_id)


# ----- Credentials --------------------------------------------------

def list_credentials() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_credentials()
        return [_xml_to_dict(c) for c in response.findall("credential")]


def create_credential_password(name: str, login: str, password: str,
                               credential_type: str = "up") -> str:
    CredentialType = None
    for mod_path in [
        "gvm.protocols.gmp.requests.v227",
        "gvm.protocols.gmp.requests.v226",
        "gvm.protocols.gmp.requests.v225",
    ]:
        try:
            mod = __import__(mod_path, fromlist=["CredentialType"])
            CredentialType = mod.CredentialType
            break
        except (ImportError, AttributeError):
            continue
    if CredentialType is None:
        raise RuntimeError("Could not locate CredentialType in python-gvm")

    type_map = {"up": CredentialType.USERNAME_PASSWORD,
                "usk": CredentialType.USERNAME_SSH_KEY}
    with gmp_session() as gmp:
        response = gmp.create_credential(
            name=name,
            credential_type=type_map.get(credential_type, CredentialType.USERNAME_PASSWORD),
            login=login,
            password=password,
        )
        return response.get("id", "")


def delete_credential(credential_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_credential(credential_id=credential_id)


# ----- Scan configs / scanners --------------------------------------

def list_scan_configs() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_scan_configs()
        return [_xml_to_dict(c) for c in response.findall("config")]


def list_scanners() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_scanners()
        return [_xml_to_dict(s) for s in response.findall("scanner")]


# ----- Tasks --------------------------------------------------------

def list_tasks() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_tasks()
        return [_xml_to_dict(t) for t in response.findall("task")]


def get_task(task_id: str) -> dict:
    """Return a single task with its current status, progress, and last report id."""
    with gmp_session() as gmp:
        response = gmp.get_task(task_id=task_id)
        task_el = response.find("task")
        if task_el is None:
            return {}
        result = _xml_to_dict(task_el)

        # Explicitly extract progress as an integer.
        # GMP may return <progress>50</progress> (simple text) or
        # <progress><host_progress>...</host_progress></progress> (with children).
        # _xml_to_dict loses the direct text when children exist.
        progress_el = task_el.find("progress")
        if progress_el is not None:
            # Direct text on <progress> is the overall percentage
            raw = (progress_el.text or "").strip()
            try:
                result["progress"] = int(raw) if raw else -1
            except ValueError:
                result["progress"] = -1
            # Also collect per-host progress for detailed display
            host_prog = {}
            for hp in progress_el.findall("host_progress"):
                host_el = hp.find("host")
                if host_el is not None and host_el.text:
                    # The progress value is in host_el.tail (text after </host>)
                    pval = (host_el.tail or "").strip()
                    try:
                        host_prog[host_el.text.strip()] = int(pval)
                    except ValueError:
                        host_prog[host_el.text.strip()] = 0
            if host_prog:
                result["host_progress"] = host_prog
        else:
            result["progress"] = -1

        return result


def create_task(name: str, target_id: str, config_id: str,
                scanner_id: str, schedule_id: str | None = None,
                comment: str | None = None,
                alert_ids: list[str] | None = None,
                preferences: dict | None = None) -> str:
    with gmp_session() as gmp:
        kwargs = dict(
            name=name, config_id=config_id, target_id=target_id,
            scanner_id=scanner_id, comment=comment,
        )
        if schedule_id:
            kwargs["schedule_id"] = schedule_id
        if alert_ids:
            kwargs["alert_ids"] = alert_ids
        if preferences:
            kwargs["preferences"] = preferences
        response = gmp.create_task(**kwargs)
        return response.get("id", "")


def start_task(task_id: str) -> str:
    with gmp_session() as gmp:
        response = gmp.start_task(task_id=task_id)
        report_id = response.find("report_id")
        return report_id.text if report_id is not None else ""


def stop_task(task_id: str) -> None:
    with gmp_session() as gmp:
        gmp.stop_task(task_id=task_id)


def delete_task(task_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_task(task_id=task_id)


# ----- Schedules ----------------------------------------------------

def list_schedules() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_schedules()
        return [_xml_to_dict(s) for s in response.findall("schedule")]


def create_schedule(name: str, icalendar: str, timezone: str = "UTC",
                    comment: str | None = None) -> str:
    with gmp_session() as gmp:
        response = gmp.create_schedule(
            name=name, icalendar=icalendar, timezone=timezone, comment=comment,
        )
        return response.get("id", "")


def delete_schedule(schedule_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_schedule(schedule_id=schedule_id)


# ----- Reports / results --------------------------------------------

REPORT_FORMAT_PDF = "c402cc3e-b531-11e1-9163-406186ea4fc5"
REPORT_FORMAT_CSV = "c1645568-627a-11e3-a660-406186ea4fc5"
REPORT_FORMAT_XML = "a994b278-1f62-11e1-96ac-406186ea4fc5"
REPORT_FORMAT_HTML = "6c248850-1f62-11e1-b082-406186ea4fc5"


def _flatten_report(outer: ET.Element) -> dict:
    inner = outer.find("report") or outer
    task = outer.find("task")

    def text(parent, tag, default=None):
        el = parent.find(tag) if parent is not None else None
        return el.text if el is not None and el.text else default

    severity = inner.find("severity")
    result_count = inner.find("result_count")

    return {
        "id": outer.get("id"),
        "name": text(outer, "name") or text(task, "name"),
        "task_id": task.get("id") if task is not None else None,
        "task_name": text(task, "name"),
        "task_comment": text(task, "comment"),
        "creation_time": text(outer, "creation_time") or text(inner, "scan_start"),
        "modification_time": text(outer, "modification_time"),
        "scan_start": text(inner, "scan_start"),
        "scan_end": text(inner, "scan_end"),
        "scan_status": text(inner, "scan_run_status"),
        "severity": text(severity, "full") or text(inner, "severity"),
        "result_count_full": text(result_count, "full"),
        "result_count_filtered": text(result_count, "filtered"),
    }


def list_reports() -> list[dict]:
    """Return all completed reports, newest first.
    gvmd defaults to ~10 rows; we override with a higher limit and sort."""
    with gmp_session() as gmp:
        # rows=200 should be enough for SME use; sort by date descending
        response = gmp.get_reports(
            filter_string="rows=200 sort-reverse=date"
        )
        return [_flatten_report(r) for r in response.findall("report")]


def get_report(report_id: str) -> dict:
    with gmp_session() as gmp:
        try:
            response = gmp.get_report(report_id=report_id, details=True, ignore_pagination=True)
        except TypeError:
            response = gmp.get_report(report_id=report_id)

        outer = response.find("report")
        if outer is None:
            return {}

        flat = _flatten_report(outer)
        inner = outer.find("report") or outer

        results = []
        for res in inner.findall("results/result"):
            nvt = res.find("nvt")
            host = res.find("host")
            results.append({
                "id": res.get("id"),
                "name": (res.findtext("name") or "").strip(),
                "host": (host.findtext("asset") if host is not None else None)
                        or (host.text.strip() if host is not None and host.text else None),
                "port": res.findtext("port"),
                "severity": res.findtext("severity"),
                "threat": res.findtext("threat"),
                "description": (res.findtext("description") or "").strip(),
                "cves": [c.text for c in (nvt.findall("refs/ref[@type='cve']") if nvt is not None else []) if c.text]
                        or [nvt.findtext("cve") for nvt in [nvt] if nvt is not None and nvt.findtext("cve") and nvt.findtext("cve") != "NOCVE"],
                "nvt_name": nvt.findtext("name") if nvt is not None else None,
                "nvt_oid": nvt.get("oid") if nvt is not None else None,
            })

        flat["results"] = results
        return flat


def _find_base64_content(element) -> str | None:
    candidates = []
    if element.text and element.text.strip():
        candidates.append(element.text.strip())
    for child in element.iter():
        if child.text and child.text.strip():
            t = child.text.strip()
            if len(t) > 100:
                candidates.append(t)
        if child.tail and child.tail.strip():
            t = child.tail.strip()
            if len(t) > 100:
                candidates.append(t)
    return max(candidates, key=len) if candidates else None


def list_report_formats() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_report_formats()
        return [
            {"id": rf.get("id"),
             "name": rf.findtext("name"),
             "extension": rf.findtext("extension"),
             "content_type": rf.findtext("content_type")}
            for rf in response.findall("report_format")
        ]


def export_report(report_id: str, format_id: str = REPORT_FORMAT_XML) -> bytes:
    import base64
    with gmp_session() as gmp:
        response = gmp.get_report(report_id=report_id, report_format_id=format_id)

        status = response.get("status")
        if status and not status.startswith("2"):
            raise RuntimeError(f"gvmd returned {status}: {response.get('status_text', 'error')}")

        outer = response.find("report")
        if outer is None:
            raise RuntimeError("No <report> element in response")

        content = _find_base64_content(outer)
        if not content:
            raise RuntimeError("Report content empty. Try HTML/CSV/XML format.")

        try:
            return base64.b64decode(content, validate=False)
        except Exception:
            return content.encode("utf-8")


# ----- Dashboard Summary (real per-finding severity counts) ----------

def get_dashboard_summary() -> dict:
    """Aggregate actual finding counts by severity across all reports."""
    with gmp_session() as gmp:
        # get_results returns all individual findings from all reports
        response = gmp.get_results(
            filter_string="rows=-1 sort-reverse=severity"
        )
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for result in response.findall("result"):
            sev_text = result.findtext("severity")
            try:
                sev = float(sev_text) if sev_text else 0.0
            except ValueError:
                sev = 0.0
            if sev >= 9.0:
                counts["critical"] += 1
            elif sev >= 7.0:
                counts["high"] += 1
            elif sev >= 4.0:
                counts["medium"] += 1
            elif sev > 0.0:
                counts["low"] += 1
            else:
                counts["info"] += 1
        return counts


# ----- Assets (auto-discovered hosts) -------------------------------

def list_assets(asset_type: str = "host") -> list[dict]:
    with gmp_session() as gmp:
        if asset_type == "host":
            response = gmp.get_hosts()
        else:
            response = gmp.get_operating_systems()

        assets = []
        for a in response.findall("asset"):
            details = {}
            for d in a.findall("host/detail") + a.findall("os/detail"):
                name = d.findtext("name")
                value = d.findtext("value")
                if name and value:
                    details[name] = value

            sev_el = a.find("host/severity/value") or a.find("os/severity/value")
            assets.append({
                "id": a.get("id"),
                "name": a.findtext("name"),
                "comment": a.findtext("comment"),
                "creation_time": a.findtext("creation_time"),
                "modification_time": a.findtext("modification_time"),
                "owner": a.findtext("owner/name"),
                "severity": sev_el.text if sev_el is not None else None,
                "best_os_txt": details.get("best_os_txt"),
                "best_os_cpe": details.get("best_os_cpe"),
                "hostname": details.get("hostname"),
                "details": details,
            })
        return assets


# ----- Port Lists ---------------------------------------------------

def list_port_lists() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_port_lists()
        out = []
        for pl in response.findall("port_list"):
            out.append({
                "id": pl.get("id"),
                "name": pl.findtext("name"),
                "comment": pl.findtext("comment"),
                "predefined": _is_predefined(pl),
                "owner": pl.findtext("owner/name"),
                "in_use": pl.findtext("in_use") == "1",
                "tcp_count": pl.findtext("port_count/tcp"),
                "udp_count": pl.findtext("port_count/udp"),
                "total_count": pl.findtext("port_count/all"),
            })
        return out


def create_port_list(name: str, port_range: str, comment: str | None = None) -> str:
    with gmp_session() as gmp:
        response = gmp.create_port_list(name=name, port_range=port_range, comment=comment)
        return response.get("id", "")


def delete_port_list(port_list_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_port_list(port_list_id=port_list_id)


# ----- Scan Configs (extended) --------------------------------------

def list_scan_configs_detailed() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_scan_configs()
        out = []
        for c in response.findall("config"):
            out.append({
                "id": c.get("id"),
                "name": c.findtext("name"),
                "comment": c.findtext("comment"),
                "predefined": _is_predefined(c),
                "owner": c.findtext("owner/name"),
                "family_count": c.findtext("family_count"),
                "nvt_count_total": c.findtext("nvt_count"),
                "usage_type": c.findtext("usage_type"),
                "creation_time": c.findtext("creation_time"),
                "in_use": c.findtext("in_use") == "1",
            })
        return out


def clone_scan_config(config_id: str) -> str:
    """Clone a scan config via raw GMP. Works across python-gvm versions."""
    with gmp_session() as gmp:
        xml_cmd = f"<create_config><copy>{config_id}</copy></create_config>"
        response = gmp.send_command(xml_cmd)

        if isinstance(response, str):
            response = ET.fromstring(response)
        elif isinstance(response, bytes):
            response = ET.fromstring(response.decode("utf-8"))

        new_id = response.get("id") if hasattr(response, "get") else None
        if not new_id:
            raw = ET.tostring(response, encoding="unicode") if hasattr(response, "tag") else str(response)
            raise RuntimeError(f"Clone sent but no ID returned. Response: {raw[:300]}")
        return new_id


def delete_scan_config(config_id: str) -> None:
    """Delete a custom scan config."""
    with gmp_session() as gmp:
        gmp.delete_scan_config(config_id=config_id)


def debug_get_config_xml(config_id: str | None = None) -> str:
    """Return raw XML for get_configs (for debugging)."""
    with gmp_session() as gmp:
        if config_id:
            response = gmp.get_scan_config(config_id=config_id)
        else:
            response = gmp.get_scan_configs()
        if isinstance(response, str):
            return response[:5000]
        if isinstance(response, bytes):
            return response.decode("utf-8")[:5000]
        return ET.tostring(response, encoding="unicode")[:5000]


# ----- Feeds & SecInfo ----------------------------------------------

def get_feeds_status() -> list[dict]:
    with gmp_session() as gmp:
        response = gmp.get_feeds()
        out = []
        for f in response.findall("feed"):
            out.append({
                "type": f.findtext("type"),
                "name": f.findtext("name"),
                "version": f.findtext("version"),
                "description": f.findtext("description"),
                "currently_syncing": f.find("currently_syncing") is not None
                    and f.findtext("currently_syncing/timestamp") is not None,
                "sync_not_available": f.find("sync_not_available") is not None,
            })
        return out


def _extract_total_count(response) -> int | None:
    """Extract the total/filtered count from a GMP get_xxx response.
    GMP returns counts in different element shapes depending on version:
      - <info_count><filtered>N</filtered><full>N</full></info_count>
      - <info_count>N</info_count>  (with text value directly)
      - <cve_count><filtered>N</filtered>...</cve_count>
      - <nvt_count>N</nvt_count>
      - count as attribute on the count element
    """
    # Try every plausible path
    paths = [
        "info_count/filtered", "info_count/full", "info_count",
        "filtered", "full",
        "cve_count/filtered", "cve_count",
        "nvt_count/filtered", "nvt_count",
        "cert_bund_adv_count", "dfn_cert_adv_count",
    ]
    for path in paths:
        el = response.find(path)
        if el is not None:
            # try text content
            if el.text:
                try:
                    return int(el.text.strip())
                except ValueError:
                    pass
            # try attribute
            for attr in ("filtered", "full", "count", "total"):
                v = el.get(attr)
                if v:
                    try:
                        return int(v)
                    except ValueError:
                        pass
    # Last resort: count direct children matching info/nvt/cve patterns
    for tag in ("info", "nvt", "cve"):
        items = response.findall(tag)
        if items:
            # If only 1 returned but we filtered to 1 row, it's not the total.
            # But for now, return what's there.
            return len(items)
    return None


def get_secinfo_counts() -> dict:
    counts = {}
    info_types = [
        ("cve", "get_cves"),
        ("nvt", "get_nvts"),
        ("cert_bund_adv", "get_cert_bund_advisories"),
        ("dfn_cert_adv", "get_dfn_cert_advisories"),
    ]
    with gmp_session() as gmp:
        for key, method_name in info_types:
            try:
                method = getattr(gmp, method_name, None)
                if method is None:
                    counts[key] = None
                    continue
                response = method(filter_string="rows=0")
                counts[key] = _extract_total_count(response)
            except Exception:
                counts[key] = None
        return counts


def debug_get_cves_raw() -> str:
    """Return raw XML from get_cves(filter_string='rows=0') for debugging counts."""
    with gmp_session() as gmp:
        response = gmp.get_cves(filter_string="rows=0")
        if isinstance(response, str):
            return response[:3000]
        if isinstance(response, bytes):
            return response.decode("utf-8")[:3000]
        return ET.tostring(response, encoding="unicode")[:3000]


def search_cve(cve_id: str) -> dict:
    with gmp_session() as gmp:
        try:
            response = gmp.get_cves(filter_string=f"name={cve_id} rows=1")
        except Exception as exc:
            raise RuntimeError(f"CVE lookup failed: {exc}") from exc
        info = response.find("info")
        if info is None:
            return {}
        cve_el = info.find("cve")
        if cve_el is None:
            return _xml_to_dict(info)

        cvss = cve_el.find("cvss_vector")
        return {
            "id": info.get("id"),
            "name": info.findtext("name"),
            "creation_time": info.findtext("creation_time"),
            "modification_time": info.findtext("modification_time"),
            "cvss_score": cve_el.findtext("severity"),
            "cvss_vector": cvss.text if cvss is not None else None,
            "description": cve_el.findtext("description"),
            "published": cve_el.findtext("published"),
            "last_modified": cve_el.findtext("last_modified"),
        }


# ====================================================================
# Round 3 features: alerts, CVE pagination, trends, AI, TLS helpers
# ====================================================================


# ----- Alerts (email notifications on scan events) ------------------

def list_alerts() -> list[dict]:
    """List configured alerts."""
    with gmp_session() as gmp:
        response = gmp.get_alerts()
        out = []
        for a in response.findall("alert"):
            method = a.find("method")
            event = a.find("event")
            condition = a.find("condition")
            out.append({
                "id": a.get("id"),
                "name": a.findtext("name"),
                "comment": a.findtext("comment"),
                "event": event.text if event is not None else None,
                "condition": condition.text if condition is not None else None,
                "method": method.text if method is not None else None,
                "in_use": a.findtext("in_use") == "1",
                "active": a.findtext("active") == "1",
            })
        return out


def create_email_alert(name: str, recipient: str,
                       on_severity_at_least: float = 7.0,
                       comment: str | None = None) -> str:
    """Create an email alert that fires when a scan completes with
    findings at or above the given severity threshold."""
    xml_parts = [
        f"<create_alert><name>{name}</name>"
    ]
    if comment:
        xml_parts.append(f"<comment>{comment}</comment>")
    xml_parts.extend([
        "<event>Task run status changed",
        "<data>Done<name>status</name></data></event>",
        f"<condition>Severity at least<data>{on_severity_at_least}<name>severity</name></data></condition>",
        "<method>Email",
        f"<data>{recipient}<name>to_address</name></data>",
        "<data>zeropoint@security.local<name>from_address</name></data>",
        "<data>2<name>notice</name></data>",  # 2 = include report summary
        "</method>",
        "</create_alert>",
    ])
    xml_cmd = "".join(xml_parts)
    with gmp_session() as gmp:
        response = gmp.send_command(xml_cmd)
        if isinstance(response, str):
            response = ET.fromstring(response)
        elif isinstance(response, bytes):
            response = ET.fromstring(response.decode("utf-8"))
        new_id = response.get("id") if hasattr(response, "get") else None
        if not new_id:
            raise RuntimeError(f"Alert creation failed: {ET.tostring(response, encoding='unicode')[:300]}")
        return new_id


def delete_alert(alert_id: str) -> None:
    with gmp_session() as gmp:
        gmp.delete_alert(alert_id=alert_id)


# ----- CVE Browser (paginated) --------------------------------------

def list_cves_paginated(page: int = 1, page_size: int = 50,
                        search: str = "") -> dict:
    """Return a page of CVEs from the local SecInfo feed.
    Each CVE has name, severity, published date, and short description."""
    first = (page - 1) * page_size + 1
    filter_parts = [f"first={first}", f"rows={page_size}"]
    if search:
        # GMP CVE query only indexes the `name` (CVE ID) column reliably;
        # `description` is not a filterable field so mixing it in returns
        # unfiltered results. To let users search by keyword like "log4j"
        # or by CVE ID like "CVE-2021-44228" from one input:
        #   - if the term looks like a CVE ID, do a name~ filter (fast, indexed)
        #   - otherwise, fetch a page and do a Python-side description scan
        # This function handles the CVE-ID branch; keyword branch is below.
        escaped = search.replace('"', '\\"')
        term = search.strip().upper()
        if term.startswith("CVE-") or term.replace("-", "").isdigit():
            filter_parts.append(f'name~"{escaped}"')
        else:
            # Bare keyword: let gvmd's default text search handle it
            # (matches all indexed text columns, including description).
            filter_parts.append(f'"{escaped}"')
    filter_string = " ".join(filter_parts)

    with gmp_session() as gmp:
        response = gmp.get_cves(filter_string=filter_string)

        cves = []
        for info in response.findall("info"):
            cve_el = info.find("cve")
            if cve_el is None:
                continue
            cves.append({
                "id": info.get("id"),
                "name": info.findtext("name"),
                "creation_time": info.findtext("creation_time"),
                "modification_time": info.findtext("modification_time"),
                "severity": cve_el.findtext("severity"),
                "description": (cve_el.findtext("description") or "")[:300],
                "published": cve_el.findtext("published"),
            })

        # Try to extract total count
        total = None
        for path in ["info_count/filtered", "info_count/full", "info_count"]:
            el = response.find(path)
            if el is not None and el.text:
                try:
                    total = int(el.text.strip())
                    break
                except ValueError:
                    pass

        return {"items": cves, "page": page, "page_size": page_size, "total": total}


# ----- Trend Analysis (severity over time) --------------------------

def get_trend_data(days: int = 30) -> list[dict]:
    """Aggregate actual finding severity counts by day for the last N days.
    days=0 means all time. Returns a list of {date, critical, high, medium,
    low, info, scans}."""
    from datetime import datetime, timedelta, timezone

    all_time = days == 0
    cutoff = (datetime.min.replace(tzinfo=timezone.utc) if all_time
              else datetime.now(timezone.utc) - timedelta(days=days))
    buckets = {}  # date string -> counts
    earliest_date = None

    with gmp_session() as gmp:
        # Count scans (reports) per day
        response = gmp.get_reports(
            filter_string="rows=200 sort-reverse=date"
        )
        for r in response.findall("report"):
            ct = r.findtext("creation_time")
            if not ct:
                continue
            try:
                dt = datetime.fromisoformat(ct.replace("Z", "+00:00"))
            except ValueError:
                continue
            if dt < cutoff:
                continue
            day_key = dt.strftime("%Y-%m-%d")
            bucket = buckets.setdefault(day_key, {
                "date": day_key,
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0,
                "scans": 0,
            })
            bucket["scans"] += 1
            if earliest_date is None or dt.date() < earliest_date:
                earliest_date = dt.date()

        # Count actual findings per day by severity
        results_response = gmp.get_results(
            filter_string="rows=-1 sort-reverse=severity"
        )
        for result in results_response.findall("result"):
            ct = result.findtext("creation_time")
            if not ct:
                continue
            try:
                dt = datetime.fromisoformat(ct.replace("Z", "+00:00"))
            except ValueError:
                continue
            if dt < cutoff:
                continue
            day_key = dt.strftime("%Y-%m-%d")
            bucket = buckets.setdefault(day_key, {
                "date": day_key,
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0,
                "scans": 0,
            })
            sev_text = result.findtext("severity")
            try:
                sev = float(sev_text) if sev_text else 0.0
            except ValueError:
                sev = 0.0
            if sev >= 9.0:
                bucket["critical"] += 1
            elif sev >= 7.0:
                bucket["high"] += 1
            elif sev >= 4.0:
                bucket["medium"] += 1
            elif sev > 0.0:
                bucket["low"] += 1
            else:
                bucket["info"] += 1

    # Fill in missing days with zeros
    out = []
    today = datetime.now(timezone.utc).date()
    start_days = (today - earliest_date).days if (all_time and earliest_date) else days
    for i in range(start_days, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        out.append(buckets.get(key, {
            "date": key,
            "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "scans": 0,
        }))
    return out


# ----- AI Remediation (sanitization + stub generator) --------------

import re as _re

_IP_RE = _re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_HOSTNAME_RE = _re.compile(r"\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b")


def sanitize_text(text: str) -> str:
    """Strip internal IPs and hostnames before sending to AI inference."""
    if not text:
        return text
    sanitized = _IP_RE.sub("[INTERNAL_IP]", text)
    # Only redact hostnames that look internal (contain .local or .lan or short TLDs)
    def _maybe_redact(m):
        host = m.group(0)
        if host.endswith(".local") or host.endswith(".lan") or host.endswith(".internal"):
            return "[INTERNAL_HOSTNAME]"
        return host
    sanitized = _HOSTNAME_RE.sub(_maybe_redact, sanitized)
    return sanitized


def _call_ollama(prompt: str) -> str | None:
    """Call the local Ollama LLM. Returns the generated text or None on error."""
    import json as _json
    import urllib.request
    import urllib.error

    if not settings.ollama_enabled:
        return None

    payload = _json.dumps({
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,  # lower = more deterministic remediation advice
            "num_predict": 800,   # allow longer step-by-step responses
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{settings.ollama_url.rstrip('/')}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=settings.ollama_timeout_seconds) as resp:
            body = _json.loads(resp.read().decode("utf-8"))
            return (body.get("response") or "").strip()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, Exception):
        return None


def _build_remediation_prompt(finding: dict) -> str:
    """Construct an LLM prompt from sanitized finding fields."""
    name = sanitize_text(finding.get("name") or finding.get("nvt_name") or "")
    desc = sanitize_text(finding.get("description") or "")[:1200]
    severity = finding.get("severity") or "unknown"
    threat = finding.get("threat") or ""
    port = sanitize_text(finding.get("port") or "")
    cves = finding.get("cves") or []
    cves_str = ", ".join(cves[:5]) if cves else "none referenced"

    return (
        "You are a cybersecurity remediation advisor helping IT staff fix "
        "vulnerabilities found by OpenVAS. Your audience is an IT generalist "
        "who needs exact, click-by-click instructions they can follow without "
        "specialized security training.\n\n"
        f"VULNERABILITY:\n"
        f"  Name: {name}\n"
        f"  Severity (CVSS): {severity} ({threat})\n"
        f"  Port/Service: {port}\n"
        f"  CVE references: {cves_str}\n"
        f"  Description: {desc}\n\n"
        "RESPOND IN THIS EXACT FORMAT:\n\n"
        "## Risk Summary\n"
        "One or two sentences: what the vulnerability is, what an attacker "
        "could do if it is not fixed, and how urgent it is.\n\n"
        "## Step-by-Step Remediation\n"
        "Give 3 to 5 numbered steps. Each step must be specific and "
        "actionable. Include:\n"
        "- Exact commands to run (with the full command line)\n"
        "- Exact menus, buttons, or settings to click in a GUI\n"
        "- File paths and config values to change\n"
        "- For Windows: use PowerShell or Settings path (e.g., "
        "Settings > Network & Internet > ...)\n"
        "- For Linux: use terminal commands (apt, systemctl, nano, etc.)\n"
        "- For network devices: use the device admin panel path\n"
        "If the fix depends on the OS or device, give instructions for "
        "the most common platforms (Windows, Ubuntu/Debian, CentOS/RHEL).\n\n"
        "## Verify the Fix\n"
        "One or two concrete steps to confirm the vulnerability is resolved. "
        "Include a command or test the user can run.\n\n"
        "## Quick Tip\n"
        "One sentence of preventive advice to avoid this issue in the future.\n\n"
        "RULES:\n"
        "- Be specific: say 'Run: sudo apt update && sudo apt upgrade openssl' "
        "not 'update the software'.\n"
        "- Never invent CVE IDs or patch version numbers you are unsure about.\n"
        "- Keep total response under 500 words.\n"
        "/no_think"
    )


def generate_remediation(finding: dict) -> dict:
    """Generate a plain-language remediation recommendation for a finding.

    Two-tier strategy:
      1. If Ollama is enabled and reachable, query the local LLM.
      2. Otherwise (or if the call fails), fall back to the rule-based
         template engine below.

    All finding content is sanitized (internal IPs / hostnames masked)
    before being sent to the LLM.

    Old docstring continuation below for reference. To swap in another
    inference backend (OpenAI, vLLM, etc.), edit _call_ollama or replace
    the body of this function using the sanitized
    inputs prepared below.
    """
    # ----- Tier 1: Ollama LLM ------------------------------------
    if settings.ollama_enabled:
        prompt = _build_remediation_prompt(finding)
        llm_response = _call_ollama(prompt)
        if llm_response:
            sev_str = finding.get("severity") or "0"
            try:
                sev = float(sev_str)
            except ValueError:
                sev = 0.0
            severity_band = (
                "critical" if sev >= 9.0 else "high" if sev >= 7.0
                else "medium" if sev >= 4.0 else "low" if sev > 0.0 else "info"
            )
            return {
                "remediation": llm_response,
                "model": f"ollama/{settings.ollama_model}",
                "sanitized_inputs": {
                    "name": sanitize_text(finding.get("name") or ""),
                    "description": sanitize_text(finding.get("description") or "")[:200],
                    "port": sanitize_text(finding.get("port") or ""),
                },
                "matched_pattern": "llm-generated",
                "severity_band": severity_band,
                "note": (
                    "Generated by a self-hosted LLM running inside the deployment "
                    "environment. No data was sent to any external service."
                ),
            }

    # ----- Tier 2: Rule-based template fallback ------------------
    name = (finding.get("name") or finding.get("nvt_name") or "").lower()
    sev_str = finding.get("severity") or "0"
    try:
        sev = float(sev_str)
    except ValueError:
        sev = 0.0
    cves = finding.get("cves") or []
    port = finding.get("port") or ""

    # Sanitize all user-supplied content before any AI processing
    san_name = sanitize_text(finding.get("name") or "")
    san_desc = sanitize_text(finding.get("description") or "")
    san_port = sanitize_text(port)

    # Rule-based recommendations keyed on common NVT patterns
    rules = [
        ("ssl", "tls"), ("certificate", "ssl_cert"), ("cipher", "weak_cipher"),
        ("outdated", "version_outdated"), ("version", "version_outdated"),
        ("default credential", "default_creds"), ("default password", "default_creds"),
        ("smb", "smb"), ("openssh", "ssh"), ("ssh ", "ssh"),
        ("apache", "web_server"), ("nginx", "web_server"), ("iis", "web_server"),
        ("php", "web_app"), ("wordpress", "web_app"),
        ("log4", "log4shell"),
        ("kernel", "patch_os"), ("os update", "patch_os"),
        ("smb signing", "smb_signing"),
        ("snmp", "snmp"),
        ("ftp", "ftp"),
        ("telnet", "telnet"),
    ]

    matched = None
    for keyword, tag in rules:
        if keyword in name:
            matched = tag
            break

    templates = {
        "tls": (
            "Upgrade the affected service to use TLS 1.2 or TLS 1.3 only. "
            "Disable SSLv2, SSLv3, and TLS 1.0/1.1 on the host's web server "
            "or application configuration."
        ),
        "ssl_cert": (
            "Renew the SSL/TLS certificate before its expiry. Consider using "
            "Let's Encrypt for free, automated certificate renewal. Verify the "
            "certificate is issued to the correct hostname and signed by a "
            "trusted CA."
        ),
        "weak_cipher": (
            "Reconfigure the server to disable weak cipher suites (RC4, DES, 3DES, "
            "MD5-based ciphers). Use the Mozilla SSL Configuration Generator to "
            "produce a strong, modern cipher list compatible with your server."
        ),
        "version_outdated": (
            "Update the affected software to the latest stable release from the "
            "vendor. Subscribe to the vendor's security advisories so future "
            "updates are applied within the organization's patching SLA."
        ),
        "default_creds": (
            "Change the default credentials immediately. Use a long, random "
            "password (16+ characters), enable multi-factor authentication if "
            "the service supports it, and document the new credentials in a "
            "secure password manager."
        ),
        "smb": (
            "Disable SMBv1 entirely (it is deprecated and exploited by "
            "EternalBlue / WannaCry). Enable SMB signing and require SMBv3 "
            "with encryption. Restrict SMB access to authenticated users on "
            "trusted network segments only."
        ),
        "ssh": (
            "Update OpenSSH to the latest version. Disable root login over SSH, "
            "disable password authentication in favor of key-based authentication, "
            "and restrict SSH access using firewall rules to known administrative "
            "subnets."
        ),
        "web_server": (
            "Apply the latest security patches for the web server. Remove "
            "default sample applications and documentation. Configure security "
            "headers (HSTS, X-Frame-Options, CSP) and disable unused HTTP "
            "methods. Review access logs for suspicious activity."
        ),
        "web_app": (
            "Update the web application and its plugins/themes to the latest "
            "versions. Remove unused plugins. Review the OWASP Top 10 "
            "categories that apply to this application and validate input "
            "handling, authentication, and access control."
        ),
        "log4shell": (
            "Update Log4j to version 2.17.1 or later. If you cannot patch "
            "immediately, set the system property log4j2.formatMsgNoLookups "
            "to true and remove the JndiLookup class from the classpath as a "
            "temporary mitigation."
        ),
        "patch_os": (
            "Apply the missing operating-system security updates. On Linux, "
            "use the package manager (apt, dnf, yum) to install pending "
            "updates. On Windows, run Windows Update and reboot."
        ),
        "smb_signing": (
            "Enable SMB signing on both client and server. On Windows, set the "
            "'Microsoft network server: Digitally sign communications (always)' "
            "policy to Enabled."
        ),
        "snmp": (
            "Disable SNMPv1 and SNMPv2c in favor of SNMPv3 with authentication "
            "and encryption. Change the default community strings ('public', "
            "'private') if SNMPv1/v2 cannot be disabled."
        ),
        "ftp": (
            "Replace plain FTP with SFTP or FTPS. Plain FTP transmits "
            "credentials and data in cleartext and is unsafe for production use."
        ),
        "telnet": (
            "Disable Telnet entirely. Replace with SSH for command-line access "
            "and HTTPS for web administration. Telnet transmits credentials in "
            "cleartext and should never be used over untrusted networks."
        ),
    }

    if matched:
        guidance = templates[matched]
    elif sev >= 9.0:
        guidance = (
            "Critical severity finding. Treat as urgent. Investigate the affected "
            "service, isolate it from the internet if possible, and apply vendor "
            "patches or compensating controls within 24-48 hours."
        )
    elif sev >= 7.0:
        guidance = (
            "High severity finding. Plan remediation within the next sprint. "
            "Review the CVE details, identify affected hosts, and schedule "
            "patching during the next maintenance window."
        )
    elif sev >= 4.0:
        guidance = (
            "Medium severity finding. Include in the next monthly patching "
            "cycle. Verify that the affected service is actually in use, "
            "and remove or harden it if not required."
        )
    else:
        guidance = (
            "Low severity / informational finding. Useful for documentation "
            "and asset inventory."
        )

    cve_ref = ""
    if cves:
        cve_ref = f" Refer to {', '.join(cves[:3])} for upstream details."

    return {
        "remediation": guidance + cve_ref,
        "model": "zeropoint-rule-based-v1",
        "sanitized_inputs": {
            "name": san_name,
            "description": san_desc[:200],
            "port": san_port,
        },
        "matched_pattern": matched,
        "severity_band": (
            "critical" if sev >= 9.0 else "high" if sev >= 7.0
            else "medium" if sev >= 4.0 else "low" if sev > 0.0 else "info"
        ),
        "note": (
            "This recommendation is generated by ZeroPoint's rule-based "
            "advisor (Ollama LLM was unavailable or disabled)."
        ),
    }


# ----- Ping-Only helpers ----------------------------------------------

PING_PORTS = "T:22,80,443"


def get_or_create_ping_port_list() -> str:
    """Find or create a minimal port list for ping-only scans.
    Only 3 ports (22, 80, 443) used for TCP alive-detection, not service enumeration."""
    name = "ZeroPoint Ping Only"
    with gmp_session() as gmp:
        response = gmp.get_port_lists()
        for pl in response.findall("port_list"):
            if pl.findtext("name") == name:
                return pl.get("id")
        new = gmp.create_port_list(
            name=name,
            port_range=PING_PORTS,
            comment="Minimal ports for ping-only host alive detection (22, 80, 443)",
        )
        return new.get("id", "")


# ----- TLS Scan helpers ---------------------------------------------

TLS_PORT_LIST_DEFAULT = "443,8443,993,995,465,587,636"


def get_or_create_tls_port_list(custom_ports: str | None = None) -> str:
    """Find or create a port list containing TLS-protected ports.
    If custom_ports is provided (e.g. '443,8443,993'), create a uniquely
    named port list for that combination. Otherwise use the default."""
    ports = custom_ports or TLS_PORT_LIST_DEFAULT
    if ports == TLS_PORT_LIST_DEFAULT:
        name = "ZeroPoint TLS ports"
    else:
        name = f"ZeroPoint TLS ({ports[:30]})"
    with gmp_session() as gmp:
        response = gmp.get_port_lists()
        for pl in response.findall("port_list"):
            if pl.findtext("name") == name:
                return pl.get("id")
        new = gmp.create_port_list(
            name=name,
            port_range=f"T:{ports}",
            comment="Auto-created by ZeroPoint Security for TLS certificate scans",
        )
        return new.get("id", "")


def get_or_create_all_tcp_port_list() -> str:
    """Find or create a port list with all 65535 TCP ports."""
    name = "ZeroPoint All TCP"
    with gmp_session() as gmp:
        response = gmp.get_port_lists()
        for pl in response.findall("port_list"):
            if pl.findtext("name") == name:
                return pl.get("id")
        new = gmp.create_port_list(
            name=name,
            port_range="T:1-65535",
            comment="All TCP ports (1-65535) for full port scanning",
        )
        return new.get("id", "")


def find_scan_config(pattern: str) -> str | None:
    """Find a scan config whose name contains the given pattern (case-insensitive).
    Returns the config ID or None."""
    pattern_lower = pattern.lower()
    with gmp_session() as gmp:
        response = gmp.get_scan_configs()
        for c in response.findall("config"):
            name = c.findtext("name") or ""
            if pattern_lower in name.lower():
                return c.get("id")
    return None
