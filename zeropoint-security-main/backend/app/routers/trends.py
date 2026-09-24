from fastapi import APIRouter, HTTPException, Query
from ..services import gvm_client

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("/severity")
def severity_trend(days: int = Query(30, ge=0, le=365)):
    """Severity counts aggregated by day for the last N days."""
    try:
        return gvm_client.get_trend_data(days=days)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
