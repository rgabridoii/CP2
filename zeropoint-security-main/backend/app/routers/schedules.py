from fastapi import APIRouter, HTTPException
from ..models import ScheduleCreate
from ..services import gvm_client

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("")
def list_schedules():
    try:
        return gvm_client.list_schedules()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("", status_code=201)
def create_schedule(payload: ScheduleCreate):
    try:
        sid = gvm_client.create_schedule(
            name=payload.name,
            icalendar=payload.icalendar,
            timezone=payload.timezone,
            comment=payload.comment,
        )
        return {"id": sid}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: str):
    try:
        gvm_client.delete_schedule(schedule_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
