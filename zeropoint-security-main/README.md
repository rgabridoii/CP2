# OpenVAS Scanner & Management App

A Nessus-style web UI on top of the open-source **OpenVAS / Greenbone Vulnerability Management (GVM)** stack. Targets and credentials management, scan tasks, scheduling, and a severity dashboard — all backed by FastAPI and React.

## Architecture

```
┌──────────────┐   HTTP    ┌──────────────┐   GMP/Unix sock   ┌──────────────┐
│  React (Vite)│ ────────► │   FastAPI    │ ────────────────► │     gvmd     │
│  Port 3000   │           │   Port 8000  │                   │ (GVM Manager)│
└──────────────┘           └──────────────┘                   └──────┬───────┘
                                                                     │
                                                              ┌──────▼───────┐
                                                              │ openvas-     │
                                                              │ scanner +    │
                                                              │ ospd-openvas │
                                                              └──────────────┘
```

- **frontend/** — React + Vite, dark Nessus-style UI, served by nginx (also proxies `/api`).
- **backend/** — FastAPI, uses `python-gvm` to speak GMP over the gvmd Unix socket.
- **docker-compose.yml** — Greenbone Community Containers + our backend + frontend.

## Recommendation: how to run OpenVAS

Use the **Greenbone Community Containers**. It's the officially supported way to run OpenVAS without compiling from source, takes one command to bring up the entire scanner stack (gvmd, openvas-scanner, ospd-openvas, redis, postgres, feed sync), and exposes gvmd over a Unix socket that our backend mounts.

The included `docker-compose.yml` already wires it all up.

## Quick start

```bash
# 1. Copy env defaults
cp .env.example .env
# edit .env and set strong values for GVM_PASSWORD and APP_SECRET

# 2. Bring up the full stack
docker compose up -d

# 3. First-run feed sync can take 20-40 minutes - watch progress
docker compose logs -f gvmd

# 4. Once feeds are synced, open the UI
#    http://localhost:3000
```

The first time you launch, gvmd downloads the SCAP/CERT feeds and VT (vulnerability test) data. This is normal — the scanner cannot run until feeds finish syncing.

## v1 features

- **Targets** — CRUD over `/api/targets`. Specify hosts as IPs, hostnames, or CIDR ranges.
- **Credentials** — Username+password or username+SSH key, for authenticated scans.
- **Scans** — Create tasks tying together a target, a scan config (e.g. "Full and fast"), and a scanner. Start, stop, delete.
- **Schedules** — iCalendar (RFC 5545) recurring schedules. The UI builds the iCal string from a start time and frequency picker.
- **Reports & Dashboard** — Severity counts (critical/high/medium/low/info) and per-task report listings.

## Dev mode (without docker)

Backend:
```bash
cd backend
pip install -r requirements.txt
# set env vars pointing to a running gvmd socket
export GVM_SOCKET=/run/gvmd/gvmd.sock
export GVM_USER=admin
export GVM_PASSWORD=admin
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to :8000
```

## Project layout

```
openvas-scanner-app/
├── docker-compose.yml          # full stack (Greenbone + backend + frontend)
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app + CORS + router wiring
│       ├── config.py           # env-driven settings
│       ├── services/
│       │   └── gvm_client.py   # python-gvm wrapper over GMP
│       ├── models/__init__.py  # Pydantic schemas
│       └── routers/
│           ├── targets.py
│           ├── credentials.py
│           ├── tasks.py
│           ├── schedules.py
│           └── reports.py
└── frontend/
    ├── Dockerfile              # multi-stage: vite build → nginx
    ├── nginx.conf              # SPA fallback + /api proxy to backend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css          # dark Nessus-inspired theme
        ├── lib/api.js
        ├── components/
        │   ├── Layout.jsx
        │   └── Modal.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Targets.jsx
            ├── Credentials.jsx
            ├── Scans.jsx
            ├── Schedules.jsx
            └── Reports.jsx
```

## What's NOT in v1 (deliberate)

You scoped v1 to **targets/credentials** and **scan tasks/scheduling**. These are stubbed or simplified:
- **User auth / RBAC** — backend trusts the network; gvmd does its own auth. Add JWT login + RBAC in v2.
- **Rich report drilldowns** — Reports page lists reports but doesn't yet render per-finding CVE detail pages.
- **PDF/CSV export** — GMP supports report formats; add an `/api/reports/{id}/export?format=pdf` endpoint when needed.

## Legal & ethical use

Only scan systems you own or have written authorization to test. Unauthorized vulnerability scanning is illegal in most jurisdictions.

## References

- Greenbone Community Containers: https://greenbone.github.io/docs/latest/22.4/container/
- python-gvm docs: https://greenbone.github.io/python-gvm/
- GMP protocol reference: https://docs.greenbone.net/API/GMP/gmp-22.04.html
