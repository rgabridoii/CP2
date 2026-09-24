"""FastAPI entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import (
    targets, credentials, tasks, schedules, reports,
    assets, port_lists, scan_configs, secinfo,
    alerts, cves, trends, ai, quickscans, dashboard,
)
from .services.scan_monitor import start_monitor

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch the background scan email monitor
    logger.info("Starting scan email monitor...")
    start_monitor(interval=30)
    yield
    # Shutdown: daemon thread will be killed automatically


app = FastAPI(
    title="ZeroPoint Security API",
    version="0.3.0",
    description="Nessus-style UI over OpenVAS/GVM via GMP, with AI remediation guidance.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Core CRUD
app.include_router(targets.router)
app.include_router(credentials.router)
app.include_router(tasks.router)
app.include_router(schedules.router)
app.include_router(reports.router)

# Discovery & coverage
app.include_router(assets.router)
app.include_router(port_lists.router)
app.include_router(scan_configs.router)
app.include_router(secinfo.router)

# Round 3: workflow / intel / AI
app.include_router(alerts.router)
app.include_router(cves.router)
app.include_router(trends.router)
app.include_router(ai.router)
app.include_router(quickscans.router)
app.include_router(dashboard.router)
