from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services import gvm_client

router = APIRouter(prefix="/api/port-lists", tags=["port-lists"])


class PortListCreate(BaseModel):
    name: str
    port_range: str  # e.g. "T:22,80,443" or "T:1-1024,U:53"
    comment: Optional[str] = None


@router.get("")
def list_port_lists():
    try:
        return gvm_client.list_port_lists()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("", status_code=201)
def create_port_list(payload: PortListCreate):
    try:
        pl_id = gvm_client.create_port_list(
            name=payload.name,
            port_range=payload.port_range,
            comment=payload.comment,
        )
        return {"id": pl_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{port_list_id}", status_code=204)
def delete_port_list(port_list_id: str):
    try:
        gvm_client.delete_port_list(port_list_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
