from fastapi import APIRouter, HTTPException
from ..models import TargetCreate
from ..services import gvm_client

router = APIRouter(prefix="/api/targets", tags=["targets"])


@router.get("")
def list_targets():
    try:
        return gvm_client.list_targets()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GVM error: {exc}") from exc


@router.post("", status_code=201)
def create_target(payload: TargetCreate):
    try:
        target_id = gvm_client.create_target(
            name=payload.name,
            hosts=payload.hosts,
            port_list_id=payload.port_list_id,
            comment=payload.comment,
        )
        return {"id": target_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{target_id}", status_code=204)
def delete_target(target_id: str):
    try:
        gvm_client.delete_target(target_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
