# ZeroPoint Security – Quick Start for IT Administrators

ZeroPoint Security is an AI-driven vulnerability scanner for SMEs, schools, and local government units in the Philippines. It runs on **one server machine** and scans all the other devices on your network — you do not need to install anything on individual computers.

## Architecture in one picture

```
   [ZeroPoint Server]  <–– IT admin opens browser here
      (1 machine)
          │
          ├─► Laptops, desktops
          ├─► File servers, mail servers
          ├─► Routers, switches, firewalls
          └─► Phones, IoT devices, printers
```

## Hardware needed (one machine)

| Resource         | Minimum                  | Recommended           |
| ---------------- | ------------------------ | --------------------- |
| CPU cores        | 4                        | 8                     |
| Memory           | 8 GB                     | 16 GB                 |
| Storage          | 60 GB free               | 120 GB SSD            |
| Operating system | Ubuntu 22.04 / Windows   | Ubuntu 22.04 LTS      |
| Network          | LAN access to targets    | LAN + Internet feed   |

## Install in 3 steps

### 1. Install Docker
- **Linux**: https://docs.docker.com/engine/install/ubuntu/
- **Windows**: Install **Docker Desktop** from https://www.docker.com/products/docker-desktop

### 2. Download ZeroPoint Security
Either:
- Download the latest release ZIP from the GitHub Releases page and extract it, OR
- `git clone https://github.com/YOUR-USERNAME/zeropoint-security.git`

### 3. Run the installer

**Linux:**
```bash
cd zeropoint-security
./install.sh
```

**Windows (PowerShell):**
```powershell
cd zeropoint-security
.\install.ps1
```

The installer pulls the required containers (about 5–15 minutes the first time) and starts every service in the background. After it finishes, the initial vulnerability-data sync runs automatically and takes another 30–60 minutes.

## First login

Open in any browser on the same network:

```
http://[server-ip]:3000
```

Default credentials (defined in `.env`): `admin / admin`

**Change the password immediately** — see `Settings` in the dashboard.

## Day-to-day operations

| Task                       | Command                                              |
| -------------------------- | ---------------------------------------------------- |
| Check service status       | `docker compose ps`                                  |
| View logs                  | `docker compose logs -f gvmd`                        |
| Stop everything            | `docker compose stop`                                |
| Start everything           | `docker compose start`                               |
| Update to a new version    | `git pull && docker compose up -d --build`           |
| Remove everything + data   | `docker compose down -v`                             |

## Support

For issues or feature requests, contact the ZeroPoint Security team or open an issue on the project repository.
