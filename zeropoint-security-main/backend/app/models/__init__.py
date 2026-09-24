"""Pydantic request / response models."""
from pydantic import BaseModel
from typing import Optional


class TargetCreate(BaseModel):
    name: str
    hosts: str  # comma-separated list of IPs/hostnames/CIDRs
    port_list_id: Optional[str] = None
    comment: Optional[str] = None


class CredentialCreate(BaseModel):
    name: str
    login: str
    password: str
    credential_type: str = "up"  # 'up' = username+password, 'usk' = SSH key


class TaskCreate(BaseModel):
    name: str
    target_id: str
    config_id: str
    scanner_id: str
    schedule_id: Optional[str] = None
    comment: Optional[str] = None


class ScheduleCreate(BaseModel):
    name: str
    # iCalendar VEVENT body, e.g.
    # BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260601T020000Z\nRRULE:FREQ=DAILY\nEND:VEVENT\nEND:VCALENDAR
    icalendar: str
    timezone: str = "UTC"
    comment: Optional[str] = None
