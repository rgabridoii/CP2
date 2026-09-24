from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..services import gvm_client

router = APIRouter(prefix="/api/reports", tags=["reports"])

FORMAT_MAP = {
    "pdf": (gvm_client.REPORT_FORMAT_PDF, "application/pdf", "pdf"),
    "csv": (gvm_client.REPORT_FORMAT_CSV, "text/csv", "csv"),
    "xml": (gvm_client.REPORT_FORMAT_XML, "application/xml", "xml"),
    "html": (gvm_client.REPORT_FORMAT_HTML, "text/html", "html"),
}


@router.get("")
def list_reports():
    try:
        return gvm_client.list_reports()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/_formats")
def list_report_formats():
    """List all available report formats in gvmd (for debugging exports)."""
    try:
        return gvm_client.list_report_formats()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{report_id}")
def get_report(report_id: str):
    try:
        return gvm_client.get_report(report_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{report_id}/export")
def export_report(report_id: str, format: str = "pdf"):
    """Download a report in PDF/CSV/XML/HTML format."""
    fmt = format.lower()
    if fmt not in FORMAT_MAP:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
    format_id, mime, ext = FORMAT_MAP[fmt]
    try:
        data = gvm_client.export_report(report_id, format_id=format_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return Response(
        content=data,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="report-{report_id}.{ext}"'
        },
    )
