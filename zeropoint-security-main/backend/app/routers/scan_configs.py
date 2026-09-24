from fastapi import APIRouter, HTTPException
from ..services import gvm_client

router = APIRouter(prefix="/api/scan-configs", tags=["scan-configs"])


@router.get("")
def list_scan_configs():
    try:
        return gvm_client.list_scan_configs_detailed()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/_debug/raw")
def debug_raw(config_id: str | None = None):
    """Debug: return the raw XML gvmd returns for scan configs."""
    from fastapi.responses import PlainTextResponse
    try:
        xml = gvm_client.debug_get_config_xml(config_id)
        return PlainTextResponse(xml)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/{config_id}/clone", status_code=201)
def clone_scan_config(config_id: str):
    """Clone a built-in scan config so it can be customized."""
    try:
        new_id = gvm_client.clone_scan_config(config_id)
        return {"id": new_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{config_id}", status_code=204)
def delete_scan_config(config_id: str):
    """Delete a custom (non-predefined) scan config."""
    try:
        gvm_client.delete_scan_config(config_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
