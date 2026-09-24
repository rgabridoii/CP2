"""Email notification service for scan completion alerts.

Uses Gmail SMTP (or any SMTP provider) to send scan result summaries
when a scan completes. All processing stays local; only the notification
email leaves the network.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from ..config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Check if SMTP credentials are set."""
    return bool(settings.smtp_email and settings.smtp_password)


def send_scan_complete_email(
    recipient: str,
    task_name: str,
    severity_summary: dict,
    scan_start: str = "",
    scan_end: str = "",
    report_id: str = "",
) -> bool:
    """Send a scan completion notification email.

    Args:
        recipient: Email address to send to
        task_name: Name of the completed scan task
        severity_summary: Dict with keys critical, high, medium, low, info
        scan_start: Scan start timestamp
        scan_end: Scan end timestamp
        report_id: Report ID for linking

    Returns:
        True if sent successfully, False otherwise
    """
    if not is_configured():
        logger.warning("SMTP not configured, skipping email to %s", recipient)
        return False

    critical = severity_summary.get("critical", 0)
    high = severity_summary.get("high", 0)
    medium = severity_summary.get("medium", 0)
    low = severity_summary.get("low", 0)
    info = severity_summary.get("info", 0)
    total = critical + high + medium + low + info

    # Determine urgency
    if critical > 0:
        urgency = "CRITICAL"
        urgency_color = "#d63031"
    elif high > 0:
        urgency = "HIGH"
        urgency_color = "#e17055"
    elif medium > 0:
        urgency = "MEDIUM"
        urgency_color = "#fdcb6e"
    else:
        urgency = "LOW"
        urgency_color = "#00b894"

    subject = f"[ZeroPoint Security] Scan Complete: {task_name} ({total} findings)"

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 24px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">ZeroPoint Security</h1>
            <p style="color: #8b95a4; margin: 4px 0 0;">Scan Completion Report</p>
        </div>

        <div style="background: #161b22; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #e6edf3;">{task_name}</h2>
            <table style="width: 100%; color: #8b95a4; font-size: 14px;">
                <tr><td style="padding: 4px 0;">Status</td><td style="text-align: right; color: #00d4aa; font-weight: bold;">Completed</td></tr>
                <tr><td style="padding: 4px 0;">Started</td><td style="text-align: right;">{scan_start or 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;">Ended</td><td style="text-align: right;">{scan_end or 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;">Total Findings</td><td style="text-align: right; color: #e6edf3; font-weight: bold;">{total}</td></tr>
            </table>
        </div>

        <div style="background: #161b22; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #e6edf3;">Severity Breakdown</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d;"><span style="display: inline-block; width: 12px; height: 12px; background: #d63031; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>Critical</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d; text-align: right; font-weight: bold; color: {'#d63031' if critical > 0 else '#8b95a4'};">{critical}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d;"><span style="display: inline-block; width: 12px; height: 12px; background: #e17055; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>High</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d; text-align: right; font-weight: bold; color: {'#e17055' if high > 0 else '#8b95a4'};">{high}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d;"><span style="display: inline-block; width: 12px; height: 12px; background: #fdcb6e; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>Medium</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d; text-align: right; font-weight: bold; color: {'#fdcb6e' if medium > 0 else '#8b95a4'};">{medium}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d;"><span style="display: inline-block; width: 12px; height: 12px; background: #74b9ff; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>Low</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #21262d; text-align: right; font-weight: bold; color: {'#74b9ff' if low > 0 else '#8b95a4'};">{low}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><span style="display: inline-block; width: 12px; height: 12px; background: #a29bfe; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>Info</td>
                    <td style="padding: 8px 0; text-align: right; color: #8b95a4;">{info}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; padding: 16px; background: {urgency_color}22; border: 1px solid {urgency_color}44; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 14px; color: {urgency_color}; font-weight: bold;">
                Highest Severity: {urgency}
            </p>
        </div>

        <div style="text-align: center; color: #8b95a4; font-size: 12px; margin-top: 24px;">
            <p style="margin: 0;">This notification was sent by ZeroPoint Security</p>
            <p style="margin: 4px 0 0;">All scan data remains on your local machine. Only this summary was emailed.</p>
        </div>
    </div>
    """

    # Plain-text fallback
    text_body = f"""ZeroPoint Security - Scan Complete

Scan: {task_name}
Status: Completed
Started: {scan_start or 'N/A'}
Ended: {scan_end or 'N/A'}

Severity Breakdown:
  Critical: {critical}
  High:     {high}
  Medium:   {medium}
  Low:      {low}
  Info:     {info}
  Total:    {total}

Highest Severity: {urgency}

This notification was sent by ZeroPoint Security.
All scan data remains on your local machine.
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ZeroPoint Security <{settings.smtp_email}>"
    msg["To"] = recipient
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.smtp_email, settings.smtp_password)
            server.sendmail(settings.smtp_email, recipient, msg.as_string())
        logger.info("Email sent to %s for scan '%s'", recipient, task_name)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient, e)
        return False
