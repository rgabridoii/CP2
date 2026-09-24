from fastapi import APIRouter, HTTPException
from ..models import TaskCreate
from ..services import gvm_client

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks():
    try:
        return gvm_client.list_tasks()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# Helper endpoints for the UI when creating tasks
# (must be above /{task_id} to avoid path conflicts)
@router.get("/_helpers/scan-configs")
def list_scan_configs():
    return gvm_client.list_scan_configs()


@router.get("/_helpers/scanners")
def list_scanners():
    return gvm_client.list_scanners()


@router.get("/{task_id}")
def get_task(task_id: str):
    """Get a single task with its current status and progress."""
    try:
        task = gvm_client.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("", status_code=201)
def create_task(payload: TaskCreate):
    try:
        tid = gvm_client.create_task(
            name=payload.name,
            target_id=payload.target_id,
            config_id=payload.config_id,
            scanner_id=payload.scanner_id,
            schedule_id=payload.schedule_id,
            comment=payload.comment,
        )
        return {"id": tid}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/start")
def start_task(task_id: str):
    try:
        report_id = gvm_client.start_task(task_id)
        return {"report_id": report_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/stop")
def stop_task(task_id: str):
    try:
        gvm_client.stop_task(task_id)
        return {"status": "stopped"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str):
    try:
        gvm_client.delete_task(task_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
