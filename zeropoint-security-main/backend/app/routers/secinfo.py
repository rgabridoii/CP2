from fastapi import APIRouter, HTTPException, Query
from ..services import gvm_client

router = APIRouter(prefix="/api/secinfo", tags=["secinfo"])


@router.get("/feeds")
def get_feeds_status():
    """Status of NVT, SCAP, CERT, GVMD_DATA feeds (when last synced, version, etc.)."""
    try:
        return gvm_client.get_feeds_status()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/counts")
def get_secinfo_counts():
    """Total counts of CVEs, NVTs, and CERT advisories in the local feed."""
    try:
        return gvm_client.get_secinfo_counts()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/cve/{cve_id}")
def get_cve(cve_id: str):
    """Look up a CVE by identifier (e.g., CVE-2024-12345)."""
    try:
        result = gvm_client.search_cve(cve_id)
        if not result:
            raise HTTPException(status_code=404, detail="CVE not found in local feed")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
