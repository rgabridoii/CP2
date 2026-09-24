from fastapi import APIRouter, HTTPException, Query
from ..services import gvm_client

router = APIRouter(prefix="/api/cves", tags=["cves"])


@router.get("")
def list_cves(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str = Query(""),
):
    """Browse CVEs from the local SecInfo feed with pagination + search."""
    try:
        return gvm_client.list_cves_paginated(
            page=page, page_size=page_size, search=search,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
