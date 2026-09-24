from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services import gvm_client

router = APIRouter(prefix="/api/ai", tags=["ai"])


class FindingPayload(BaseModel):
    name: Optional[str] = None
    nvt_name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    threat: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None
    cves: Optional[List[str]] = None


@router.post("/remediation")
def get_remediation(finding: FindingPayload):
    """Generate a plain-language remediation recommendation for a finding.

    Inputs are sanitized (internal IPs/hostnames stripped) before any AI
    processing. Current implementation uses a rule-based template engine;
    swap in a self-hosted LLM (Ollama, OpenAI, etc.) by editing
    services/gvm_client.py::generate_remediation."""
    try:
        return gvm_client.generate_remediation(finding.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
