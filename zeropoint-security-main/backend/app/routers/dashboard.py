"""Dashboard summary endpoint - real per-finding severity counts."""
from fastapi import APIRouter
from ..services import gvm_client

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary():
    return gvm_client.get_dashboard_summary()
