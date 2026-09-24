from fastapi import APIRouter, HTTPException
from ..models import CredentialCreate
from ..services import gvm_client

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


@router.get("")
def list_credentials():
    try:
        return gvm_client.list_credentials()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("", status_code=201)
def create_credential(payload: CredentialCreate):
    try:
        cid = gvm_client.create_credential_password(
            name=payload.name,
            login=payload.login,
            password=payload.password,
            credential_type=payload.credential_type,
        )
        return {"id": cid}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{credential_id}", status_code=204)
def delete_credential(credential_id: str):
    try:
        gvm_client.delete_credential(credential_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
