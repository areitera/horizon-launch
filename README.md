# Horizon Launch

Static React frontend + FastAPI backend for [horizonlaunch.ca](https://horizonlaunch.ca).

Hosts on the Mane Attraction self-hosted server. Cloudflare Tunnel routes the public domain to nginx; nginx serves the built React app and reverse-proxies `/api/*` to the FastAPI service.

## Stack

- **Frontend**: Vite + React (single SPA, hash routing), built to static. No runtime Node on the server.
- **Backend**: FastAPI (Python), SQLite database, runs as a systemd service.
- **Auth (admin)**: Cloudflare Access in front of `#admin` and the admin API routes. The backend reads `Cf-Access-Authenticated-User-Email` to identify the signed-in user.
- **Contact form**: posts to Web3Forms (free) for delivery to the founders' emails, routed by topic.

## Local development

Requires Node 22+ and Python 3.11+.

```bash
# Terminal 1 — frontend
npm install
npm run dev          # http://localhost:5173

# Terminal 2 — backend
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
HL_DEV=1 uvicorn app:app --reload --port 8001
```

Vite proxies `/api/*` to `127.0.0.1:8001` (see [vite.config.js](vite.config.js)).

In dev mode, the admin auth check is bypassed (`HL_DEV=1`) so you don't need Cloudflare Access running locally.

## Environment

| Variable | Purpose |
|---|---|
| `HL_DB_PATH` | SQLite file location. Default `./data/site.db`. |
| `HL_WEB3FORMS_KEY` | Web3Forms API key for contact form delivery. Without it, submissions are stored but no email is sent. |
| `HL_DEV` | Set to `1` to skip Cloudflare Access auth check (local dev only). |
| `HL_TOPIC_<UPPER>` | Per-topic override of recipient email. E.g. `HL_TOPIC_INSURANCE=catherine@...`. |

## Build for production

```bash
npm run build                 # → dist/
```

The `dist/` folder is what gets deployed to the server's nginx document root.

## Deployment (server-side)

Server layout:
- `/opt/horizonlaunch/public/` — built static files (contents of `dist/`)
- `/opt/horizonlaunch/api/` — backend `app.py` + venv + `data/site.db`
- `/etc/systemd/system/horizonlaunch-api.service` — systemd unit running uvicorn
- `/etc/nginx/sites-available/horizonlaunch.ca` — nginx vhost
- Cloudflare Tunnel: hostname `horizonlaunch.ca` → `http://localhost:8080` (the existing tunnel that already serves office.maneattraction.ca uses host-header routing)
- Cloudflare Access: policy on path `/api/events` (POST/PUT/DELETE) and `/#admin` — allow Denise/Catherine/Tracy by email

Detailed deploy steps live in this chat's session notes; see auto-memory `project_horizon_launch.md`.
