from fastapi import APIRouter, HTTPException, Query
from ..services import gvm_client

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("")
def list_assets(asset_type: str = Query("host", regex="^(host|os)$")):
    """List auto-discovered hosts (default) or operating systems."""
    try:
        return gvm_client.list_assets(asset_type=asset_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
