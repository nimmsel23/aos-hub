# Bridge Architecture

## Overview

The AOS Bridge is an aiohttp HTTP service that enables **bidirectional communication** between Gas HQ (Google Apps Script, cloud 24/7) and local services (Taskwarrior, Core4 ledger, Vault).

## Foundation: Tailscale

Tailscale is the transport layer that makes everything possible.

```
                    Tailscale Mesh Network
                    (WireGuard encrypted, P2P)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
Gas HQ (Cloud)         Laptop (anywhere)      Mobile (Tailscale App)
script.google.com      ideapad.tail7a15d6     VPN → tailnet access
    │                  .ts.net                    │
    │                      │                      │
    │              ┌───────┴───────┐              │
    │              │   Bridge      │              │
    │              │   :8080       │              │
    │              │   0.0.0.0     │              │
    │              └───────────────┘              │
    │                                             │
    └─────── Both reach Bridge via Tailscale ─────┘
```

**Why Tailscale:**
- Laptop is behind NAT → not directly reachable from internet
- Tailscale provides persistent domain name (never changes)
- WireGuard encryption (end-to-end)
- Works from any network (WiFi, mobile, hotel, etc.)
- No port forwarding needed

**Tailscale Serve Config:**
```bash
# CORRECT — tailnet-only (secure):
sudo tailscale serve --bg --set-path /bridge http://127.0.0.1:8080

# NEVER — public internet (insecure!):
sudo tailscale funnel ...
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     ACCESS CONTROL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Tailscale (Network)                              │
│    → Only devices on YOUR tailnet can reach the bridge     │
│    → No public internet exposure                           │
│    → tailscale serve = tailnet-only (NEVER use funnel)     │
│                                                             │
│  Layer 2: Bridge Token (Application)                       │
│    → X-Bridge-Token header required                        │
│    → Set AOS_BRIDGE_TOKEN in ~/.env/aos.env                │
│    → Gas HQ sends token via bridge_getAuthHeaders_()       │
│    → Protects against accidental exposure                  │
│                                                             │
│  Layer 3: Localhost Binding (Service)                      │
│    → Index Node: 127.0.0.1:8799 (not directly reachable)  │
│    → Bridge: 0.0.0.0:8080 (reachable via Tailscale only)  │
│    → Tailscale serve proxies /bridge → :8080               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

IMPORTANT: Never use tailscale funnel. It exposes the bridge to the
entire internet. Anyone could log Core4 habits, execute Taskwarrior
commands, or access your vault data.
```

## Bidirectional Communication

Both Gas HQ and Bridge can initiate requests to each other.

### Direction 1: Gas HQ → Bridge (via Tailscale)

```
Gas HQ (Cloud)
    │
    │  User logs Core4 habit (Telegram button / Web UI)
    │
    ├─→ Save to Google Drive Alpha_HQ (SOURCE OF TRUTH)
    │
    ├─→ POST https://ideapad.tail7a15d6.ts.net/bridge/core4/log
    │   Headers: { X-Bridge-Token: <token> }
    │   Body: { domain: "body", task: "fitness", done: true }
    │
    ↓
Bridge (Local)
    ├─→ Write event → ~/.core4/.core4/events/YYYY-MM-DD/*.json
    ├─→ Build day aggregate → ~/.core4/core4_day_YYYY-MM-DD.json
    ├─→ Desktop notification (optional)
    └─→ Return { ok: true, total_today: 1.0 }
```

**Endpoints Gas HQ calls:**
- `POST /bridge/core4/log` — Log Core4 habit
- `POST /bridge/fruits/answer` — Submit Fruits answer
- `POST /bridge/tent/summary` — Save weekly summary
- `POST /bridge/warstack/draft` — Save War Stack draft
- `GET /health` — Watchdog health check (every 5-15 min)

**Failure mode:** Gas HQ fails silently. Google Drive is the source of
truth; bridge sync is best-effort.

### Direction 2: Bridge → Gas HQ (via Webhook)

```
Bridge (Local)
    │
    │  Taskwarrior on-modify hook fires
    │
    ├─→ POST https://script.google.com/.../exec
    │   Body: { kind: "task_operation", payload: {...} }
    │
    ↓
Gas HQ (Cloud)
    ├─→ Process task operation
    ├─→ Sync to TickTick
    └─→ Send Telegram notification
```

**What Bridge sends to Gas:**
- Task operations (add/modify/complete)
- Telegram messages
- System status updates

**Failure mode:** Failed requests are queued to disk
(`~/.cache/alphaos/bridge-queue/`) and retried automatically.
Queue survives Bridge restarts.

## Core4 Data Flow

```
SOURCE OF TRUTH: Google Drive (Alpha_HQ)
    │
    │ (Gas HQ saves here first, always)
    │
    ├─→ Gas HQ POSTs entry to Bridge (best-effort)
    │       POST /bridge/core4/log
    │
    ↓
LOCAL CACHE: ~/.core4/
    ├── .core4/events/YYYY-MM-DD/*.json   (individual events)
    ├── core4_day_YYYY-MM-DD.json         (day aggregate)
    └── core4_week_YYYY-Wxx.json          (week aggregate, on-demand)

CONSUMERS:
    ├── c4              (bash, reads day JSON directly)
    ├── core4ctl        (bash, reads local + optional mount)
    ├── Bridge API      (GET /bridge/core4/today)
    └── Index Node      (GET /api/core4/today, proxies to bridge)
```

**Performance (2026-02-25):**
- `AOS_CORE4_MOUNT_DIR=/nonexistent` — No rclone mount needed
- Day aggregate built on every log (55ms)
- Week aggregate built on-demand only (not on every log)
- No `exists()` calls on hung mount paths

## Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ SYSTEMD SERVICES                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  System Scope (production):                                  │
│    aos-bridge.service    → /opt/aos/bridge/app.py            │
│    aos-router.service    → /opt/aos/router/router_bot.py     │
│                                                              │
│  User Scope (development):                                   │
│    aos-bridge-dev.service → ~/aos-hub/bridge/app.py          │
│    aos-index-dev.service  → ~/aos-hub/index-node/server.js   │
│                                                              │
│  NEVER run both scopes simultaneously (port conflict!)       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ENV SOURCE OF TRUTH                                          │
│   ~/.env/aos.env (symlinked from /etc/aos/aos.env)           │
│   Single file for ALL services (system + user scope)         │
└──────────────────────────────────────────────────────────────┘
```

## CLI Tools

```
bridgectl                        Main dispatcher (this tool)
    ├── bridge-servicectl         Systemd management
    ├── bridge-apictl             HTTP endpoint wrappers
    └── bridge-tsctl              Tailscale serve/funnel

Related:
    c4                            Fast Core4 status (reads ledger directly)
    core4ctl                      Core4 management (tracker, sync, menu)
    aosctl bridge status          Bridge status via aosctl
```

## Quick Reference

```bash
# Health check
bridgectl health

# Full diagnosis
bridgectl doctor

# Core4 today
bridgectl core4-today
c4                                # faster (no bridge dependency)

# Log a habit
bridgectl core4-log body fitness

# Service management
bridgectl status                  # shows both system + user scope
bridgectl restart                 # restart user service
sudo systemctl restart aos-bridge.service  # restart system service

# Tailscale
bridgectl tailscale               # show serve status
sudo tailscale serve --bg --set-path /bridge http://127.0.0.1:8080

# Sync
bridgectl sync-push --dry-run     # preview vault push
bridgectl sync-pull --dry-run     # preview vault pull
bridgectl flush                   # retry failed GAS operations
```

## Environment Variables

Critical variables in `~/.env/aos.env`:

```bash
# Bridge
AOS_BRIDGE_HOST=0.0.0.0
AOS_BRIDGE_PORT=8080
AOS_BRIDGE_TOKEN=<hex token>      # REQUIRED for production

# Core4
AOS_CORE4_LOCAL_DIR=/home/alpha/.core4
AOS_CORE4_MOUNT_DIR=/nonexistent  # MUST be /nonexistent (performance)

# Gas HQ Communication
AOS_GAS_WEBHOOK_URL=https://script.google.com/.../exec
AOS_GAS_CHAT_ID=<telegram chat id>

# Task Execution
AOS_TASK_EXECUTE=1                # Enable Taskwarrior commands
```
