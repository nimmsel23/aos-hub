# Index Centre 8799: Tailscale Serve + Telegram Router

Fixpoint: 8799 = Index Centre (router/registry)

This doc explains port logic and flow paths between:
- Browser (UI)
- Tailscale Serve (tailnet entry)
- Index Centre (Node.js)
- GAS WebApps (Voice/Door/War/etc)
- Telegram Router Bot (aiogram)

---

## 0) TL;DR

- Index Node runs locally on `127.0.0.1:8799` (Mode A).
- Tailscale Serve exposes HTTPS and proxies to `127.0.0.1:8799`.
- Telegram Router fetches `GET /api/centres` from localhost (no tailnet dependency).
- `menu.yaml` is the single source of truth for all centres.
- For remote Telegram links, use absolute Tailnet or GAS URLs (not `/door`).

---

## 1) Ports and Roles

| Component | Role | Local | Tailnet | Notes |
|---|---|---:|---:|---|
| Index Centre (Node.js) | UI + Router + API | `127.0.0.1:8799` | via Serve | Single source of truth |
| Tailscale Serve | HTTPS door | — | `https://<device>.tail*.ts.net/` | proxies to local |
| GAS WebApps | Centres | — | public https | redirect targets |
| Telegram Router Bot | Command router | local | — | uses `/api/centres` |

---

## 2) Data Sources

### Single Source of Truth
- `menu.yaml` defines all centres (label/cmd/url).

### Derived Views
- `/menu` = UI links (grid)
- `/api/centres` = control plane JSON (Telegram/automation)
- `/<cmd>` = redirect router (stable paths)

---

## 3) Flow Diagrams

### A) Browser -> Index UI (Tailnet)

```text
[BROWSER]
   |
   |  https://<device>.tail*.ts.net/
   v
[TAILSCALE SERVE :8799]
   |
   |  proxy -> http://127.0.0.1:8799/
   v
[INDEX CENTRE (NODE)]
   |
   |  serves public/index.html (static)
   v
[UI: Main Menu Grid]
```

---

### B) Browser -> /voice -> GAS Voice Centre

```text
[BROWSER]
   |
   |  https://<device>.tail*.ts.net/voice
   v
[TAILSCALE SERVE :8799]
   |
   |  proxy -> http://127.0.0.1:8799/voice
   v
[INDEX CENTRE]
   |
   |  302 Redirect -> https://script.google.com/macros/s/<VOICE>/exec
   v
[GAS VOICE CENTRE]
```

Note: the browser ends up at Google after the redirect.

---

### C) Telegram Bot -> Registry Fetch -> Buttons

```text
[TELEGRAM USER]
   |
   |  /menu
   v
[TELEGRAM ROUTER BOT (aiogram)]
   |
   |  GET http://127.0.0.1:8799/api/centres
   v
[INDEX CENTRE]
   |
   |  returns JSON: { updated_at, centres:[{cmd,label,url}...] }
   v
[TELEGRAM ROUTER BOT]
   |
   |  builds inline keyboard: label -> url
   v
[TELEGRAM CHAT]
```

Important: the router prefixes relative URLs (`/door`) using its own
`index_api.base`. In Mode A that becomes `http://127.0.0.1:8799/door`,
which is not usable from a remote phone. For remote access, use absolute
Tailnet or GAS URLs in `menu.yaml`.

---

## 4) Endpoints

Index Centre:
- `GET /` -> UI
- `GET /menu` -> UI JSON (from `menu.yaml`)
- `GET /api/centres` -> control plane JSON (from `menu.yaml`)
- `GET /health` -> health JSON
- `GET /<cmd>` -> 302 redirect to `url`

---

## 5) Configuration (Mode A)

### Node.js
- Port fixed at `8799`
- Recommended:
  - `PORT=8799`
  - `HOST=127.0.0.1`

### Tailscale Serve
```bash
tailscale serve --bg 8799 http://127.0.0.1:8799
tailscale serve status
```

### Router config
```yaml
index_api:
  base: http://127.0.0.1:8799
  path: /api/centres
```

### menu.yaml (remote links)
Use absolute Tailnet or GAS URLs if you want links to work from Telegram:
```yaml
links:
  - label: Door Centre
    cmd: door
    url: "https://<device>.tail*.ts.net/door"
```

Avoid mixing Mode A with direct `http://100.x.x.x:8799` access. If you want
that, switch to Mode B and bind the Node service to `0.0.0.0`.

---

## 6) Debug / Smoke Tests

Local:
```bash
curl -s http://127.0.0.1:8799/health
curl -s http://127.0.0.1:8799/api/centres
curl -I http://127.0.0.1:8799/voice
```

Tailnet (from another device):
```text
https://<device>.tail*.ts.net/
https://<device>.tail*.ts.net/voice
```

If `*.ts.net` does not resolve, enable MagicDNS in the Tailnet admin
and accept DNS on the device:
```bash
sudo tailscale set --accept-dns=true
```

---

## 7) Design Rules (Operator)

- `menu.yaml` is the only registry file.
- `cmd` must be stable and short (`voice`, `door`, `war`, ...).
- UI labels can change, routing should not.
- Redirect paths are public stable links.

---

## 8) Minimal menu.yaml Example

```yaml
links:
  - label: Voice Centre
    cmd: voice
    url: "https://script.google.com/macros/s/<VOICE>/exec"

  - label: Door Centre
    cmd: door
    url: "https://<device>.tail*.ts.net/door"
```

---

## 9) Change Workflow

1) Update `menu.yaml` (labels/URLs/cmd).
2) Index serves new data immediately (or after restart).
3) Telegram Router refresh:
   - wait for TTL, or
   - `/reload`
