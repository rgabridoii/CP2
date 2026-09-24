from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services import gvm_client
from ..services.email_service import is_configured, send_scan_complete_email
from ..services.scan_monitor import register_notification
from ..config import settings

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class EmailAlertCreate(BaseModel):
    name: str
    recipient: str  # email address
    on_severity_at_least: float = 7.0  # only fire if severity >= this
    comment: Optional[str] = None


class TestEmailRequest(BaseModel):
    recipient: str


@router.get("")
def list_alerts():
    try:
        return gvm_client.list_alerts()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("", status_code=201)
def create_email_alert(payload: EmailAlertCreate):
    try:
        alert_id = gvm_client.create_email_alert(
            name=payload.name,
            recipient=payload.recipient,
            on_severity_at_least=payload.on_severity_at_least,
            comment=payload.comment,
        )
        return {"id": alert_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: str):
    try:
        gvm_client.delete_alert(alert_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/smtp-status")
def smtp_status():
    """Check whether SMTP is configured and ready to send emails."""
    configured = is_configured()
    return {
        "configured": configured,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_email": settings.smtp_email if configured else "",
    }


@router.post("/test-email")
def test_email(payload: TestEmailRequest):
    """Send a test email to verify SMTP configuration works."""
    if not is_configured():
        raise HTTPException(
            status_code=400,
            detail="SMTP is not configured. Set SMTP_EMAIL and SMTP_PASSWORD in .env",
        )

    ok = send_scan_complete_email(
        recipient=payload.recipient,
        task_name="Test Scan (SMTP Verification)",
        severity_summary={
            "critical": 1,
            "high": 3,
            "medium": 7,
            "low": 12,
            "info": 25,
        },
        scan_start="2024-01-01 10:00:00",
        scan_end="2024-01-01 10:15:00",
        report_id="test-report-id",
    )

    if ok:
        return {"status": "sent", "message": f"Test email sent to {payload.recipient}"}
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Check SMTP credentials in .env",
        )
