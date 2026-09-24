"""Background scan monitor that detects completed scans and sends email notifications.

Uses a simple JSON file to track which tasks have email recipients.
A background thread polls gvmd every 30 seconds, and when a task
transitions to 'Done', it sends completion emails via the SMTP service.
"""
import json
import logging
import os
import threading
import time
from pathlib import Path
from datetime import datetime

from . import gvm_client
from .email_service import send_scan_complete_email, is_configured

logger = logging.getLogger(__name__)

# Persistent store for email notification registrations
_STORE_PATH = Path("/tmp/zeropoint_email_registry.json")
_lock = threading.Lock()


def _load_registry() -> dict:
    """Load the notification registry from disk."""
    try:
        if _STORE_PATH.exists():
            return json.loads(_STORE_PATH.read_text())
    except Exception:
        pass
    return {}


def _save_registry(data: dict) -> None:
    """Save the notification registry to disk."""
    try:
        _STORE_PATH.write_text(json.dumps(data, indent=2))
    except Exception as e:
        logger.error("Failed to save email registry: %s", e)


def register_notification(task_id: str, recipients: list[str], task_name: str = "") -> None:
    """Register email recipients for a task. Called when a scan is created
    with email notifications enabled."""
    with _lock:
        registry = _load_registry()
        registry[task_id] = {
            "recipients": recipients,
            "task_name": task_name,
            "registered_at": datetime.now().isoformat(),
            "notified": False,
        }
        _save_registry(registry)
    logger.info("Registered email notification for task %s -> %s", task_id, recipients)


def _get_task_severity_summary(task_id: str) -> dict:
    """Get severity breakdown for a completed task's latest report."""
    try:
        task = gvm_client.get_task(task_id)
        if not task:
            return {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

        report_id = task.get("last_report_id", "")
        if not report_id:
            return {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

        # Count findings from the report's results
        from .gvm_client import gmp_session
        with gmp_session() as gmp:
            response = gmp.get_results(
                filter_string=f"report_id={report_id} rows=-1"
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
    except Exception as e:
        logger.error("Failed to get severity summary for task %s: %s", task_id, e)
        return {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}


def _check_and_notify():
    """Check for completed scans and send email notifications."""
    if not is_configured():
        return

    with _lock:
        registry = _load_registry()

    if not registry:
        return

    # Find tasks that have not been notified yet
    pending = {
        tid: info for tid, info in registry.items()
        if not info.get("notified", False)
    }

    if not pending:
        return

    # Check each pending task's status
    for task_id, info in pending.items():
        try:
            task = gvm_client.get_task(task_id)
            if not task:
                continue

            status = task.get("status", "").lower()
            if status != "done":
                continue

            # Task is done! Send emails
            task_name = info.get("task_name") or task.get("name", "Unknown Scan")
            recipients = info.get("recipients", [])
            severity = _get_task_severity_summary(task_id)

            scan_start = task.get("start_time", "")
            scan_end = task.get("end_time", "")
            report_id = task.get("last_report_id", "")

            for recipient in recipients:
                try:
                    send_scan_complete_email(
                        recipient=recipient,
                        task_name=task_name,
                        severity_summary=severity,
                        scan_start=scan_start,
                        scan_end=scan_end,
                        report_id=report_id,
                    )
                except Exception as e:
                    logger.error("Failed to email %s for task %s: %s", recipient, task_id, e)

            # Mark as notified
            with _lock:
                reg = _load_registry()
                if task_id in reg:
                    reg[task_id]["notified"] = True
                    reg[task_id]["notified_at"] = datetime.now().isoformat()
                    _save_registry(reg)

            logger.info("Sent completion emails for task %s to %s", task_id, recipients)

        except Exception as e:
            logger.error("Error checking task %s: %s", task_id, e)


def _monitor_loop(interval: int = 30):
    """Background loop that polls for completed scans."""
    logger.info("Scan monitor started (polling every %ds)", interval)
    while True:
        try:
            _check_and_notify()
        except Exception as e:
            logger.error("Scan monitor error: %s", e)
        time.sleep(interval)


_monitor_thread: threading.Thread | None = None


def start_monitor(interval: int = 30):
    """Start the background scan monitor thread."""
    global _monitor_thread
    if _monitor_thread is not None and _monitor_thread.is_alive():
        logger.info("Scan monitor already running")
        return
    _monitor_thread = threading.Thread(
        target=_monitor_loop,
        args=(interval,),
        daemon=True,
        name="scan-email-monitor",
    )
    _monitor_thread.start()
    logger.info("Scan monitor thread started")
