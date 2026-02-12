# Node.js Implementation (Index Node)

**Version:** 2.0 (2026-01-10)
**Purpose:** Local Node.js server for αOS Centres

---

## Overview

The **Index Node** is the local Node.js server (`localhost:8799`) that provides:
- **Menu System** (menu.yaml-driven UI)
- **Local APIs** (Taskwarrior, VOICE, Core4, Game, Fruits)
- **Vault Integration** (Obsidian-compatible markdown storage)

**NOT a replacement for GAS** - Node.js and GAS have different implementations:
- **GAS** = Cloud-based (Google Drive, Sheets, always online)
- **Node.js** = Local-only (Vault files, offline-first, Taskwarrior integration)

---

## Architecture

```
User → localhost:8799 (Index Node)
    ↓
menu.yaml → UI rendering
    ↓
API endpoints → server.js
    ↓
Data Layer:
  ├─ Taskwarrior (via `task` CLI)
  ├─ Vault markdown files (~/AlphaOS-Vault/)
  ├─ Local JSON stores (~/.local/share/alphaos/)
  └─ Bridge (:8080) for GAS ↔ Taskwarrior communication
```

---

## Centre Implementations (Node.js)

### VOICE Centre
- **UI:** `http://127.0.0.1:8799/voice`
- **Storage:** `~/Voice` OR `~/AlphaOS-Vault/VOICE`
- **APIs:**
  - `POST /api/voice/export` - Save session
  - `POST /api/voice/autosave` - Auto-save draft
  - `GET /api/voice/history?limit=50` - Recent sessions
  - `GET /api/voice/file?path=...` - Load specific session
- **Env:** `VOICE_VAULT_DIR` (auto-detect)

---

### Game Centre
- **UI:** `http://127.0.0.1:8799/game`
- **Storage:** `~/AlphaOS-Vault/Game/`

**Sub-centres:**
- **Frame:** `/game/frame` → Frame Maps
- **Freedom:** `/game/freedom` → Freedom Maps (IPW + Annual)
- **Focus:** `/game/focus` → Focus Maps (Monthly)
- **Fire:** `/game/fire` → Fire Maps (Weekly War)
- **Tent:** `/game/tent` → General's Tent (Weekly Review)

**APIs:**
- `GET /api/game/export` - Shared Game export (Frame/Freedom/Focus)
- `GET /api/fire/day` - Today's Fire Map (Taskwarrior + TickTick)
- `GET /api/fire/week` - Current week Fire Map
- `POST /api/generals/report` - Submit weekly review
- `GET /api/generals/latest?type=frame|freedom|focus|fire|voice`

**Env:**
```bash
FIRE_GCAL_EMBED_URL=...
FIRE_TASK_TAGS_ALL=fire,production,hit
FIRE_TASK_DATE_FIELDS=scheduled,due
```

---

### Core4 Centre
- **UI:** `http://127.0.0.1:8799/core4`
- **Storage:** `~/.local/share/alphaos` (core4 TTY)

**APIs:**
- `POST /api/core4` - Log habit completion
- `GET /api/core4/today` - Today's Core4 status

**Env:**
```bash
AOS_BRIDGE_URL=...
BRIDGE_TIMEOUT_MS=5000
CORE4_TW_SYNC=true
```

---

### Fruits Centre
- **UI:** `http://127.0.0.1:8799/facts`
- **Storage:** `~/AlphaOS-Vault/Game/Fruits/`

**APIs:**
- `GET /api/fruits` - Get all data
- `GET /api/fruits/users` - List users
- `POST /api/fruits/register` - Register user
- `POST /api/fruits/next` - Get next question
- `POST /api/fruits/answer` - Save answer
- `POST /api/fruits/skip` - Skip question
- `POST /api/fruits/export` - Export to markdown

**Env:**
```bash
FRUITS_QUESTIONS=data/fruits_questions.json
FRUITS_STORE=~/AlphaOS-Vault/Game/Fruits/fruits_store.json
FRUITS_EXPORT_DIR=~/AlphaOS-Vault/Game/Fruits
```

---

## Taskwarrior Integration

### Two Execution Paths

**1) Node Direct (Local API):**
```
User → Node.js API
    ↓
Node runs `task` CLI
    ↓
Taskwarrior → TickTick (via hooks)
```

**2) Bridge Execute (GAS → Bridge → Taskwarrior):**
```
GAS → POST /bridge/task/execute
    ↓
Bridge → `task add` (with dependencies)
    ↓
Returns UUIDs → GAS
    ↓
GAS updates War Stack markdown
```

---

### Taskwarrior APIs (Node.js)

**Query:**
```bash
GET /api/taskwarrior/tasks?status=pending&tags=door,core4
```

**Add Task:**
```bash
POST /api/taskwarrior/add
Body: { description, project, tags, due, scheduled }
```

**TickTick Sync:**
```bash
POST /api/taskwarrior/push
```

---

### Bridge APIs (Local)

**Execute Tasks:**
```bash
POST /bridge/task/execute
Requires: AOS_TASK_EXECUTE=1
Body: { operations: [...] }
Returns: { results: [{ uuid: "..." }] }
```

**Forward to GAS:**
```bash
POST /bridge/task/operation
Body: { kind, data }
Forwards to: AOS_GAS_WEBHOOK_URL
```

---

## Environment Variables

**Common:**
```bash
AOS_TASK_BIN=task               # Taskwarrior binary (default: task)
AOS_TASK_EXECUTE=1              # Allow Bridge execute
AOS_GAS_WEBHOOK_URL=...         # Bridge → GAS webhook
AOS_BRIDGE_URL=...              # GAS → Bridge URL
```

**Centre-Specific:**
See individual Centre sections above.

---

## Setup

### Install Dependencies
```bash
cd ~/aos-hub/index-node
npm install
```

### Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit with your settings
vim .env
```

### Start Server
```bash
npm start
```

### Access
```
http://localhost:8799
```

---

## Menu System (menu.yaml)

**Location:** `index-node/menu.yaml`

**Structure:**
```yaml
categories:
  - name: "Game"
    items:
      - label: "Frame Map"
        url: "/game/frame"
      - label: "Fire Map"
        url: "/game/fire"
  - name: "Door"
    items:
      - label: "Hot List"
        url: "/door/hotlist"
```

**Rendering:** Menu items rendered dynamically from YAML config.

---

## Data Flow

### VOICE Session Flow
```
User → http://localhost:8799/voice
    ↓
POST /api/voice/export { content: "..." }
    ↓
Save to: ~/Voice/VOICE_Session_YYYY-MM-DD.md
    ↓
Return: { ok: true, path: "..." }
```

### Fire Map Flow
```
User → http://localhost:8799/game/fire
    ↓
GET /api/fire/day
    ↓
Query Taskwarrior: task export +fire +production scheduled:today
    ↓
Fallback: TickTick API (if Taskwarrior empty)
    ↓
Return: { tasks: [...], gcalEmbed: "..." }
```

### Core4 Flow
```
User logs habit → POST /api/core4 { domain, task }
    ↓
Save to: ~/.local/share/alphaos/core4.json
    ↓
Optional: Sync to Taskwarrior (if CORE4_TW_SYNC=true)
    ↓
Return: { ok: true, total: 2.5 }
```

---

## Testing

### Smoke Test (All Centres)

```bash
# VOICE
curl http://localhost:8799/api/voice/history?limit=10

# Game/Fire
curl http://localhost:8799/api/fire/day

# Core4
curl -X POST http://localhost:8799/api/core4 \
  -H "Content-Type: application/json" \
  -d '{"domain": "Body", "task": "Fitness"}'

# Fruits
curl http://localhost:8799/api/fruits/next

# Taskwarrior
curl "http://localhost:8799/api/taskwarrior/tasks?status=pending&tags=fire"
```

---

## Comparison: GAS vs Node.js

| Feature | GAS | Node.js |
|---------|-----|---------|
| **Hosting** | Google Cloud | Local (localhost:8799) |
| **Storage** | Google Drive + Sheets | Vault markdown + JSON |
| **Access** | Anywhere (web) | Local network only |
| **Offline** | ❌ Requires internet | ✅ Works offline |
| **Taskwarrior** | Via Bridge (webhook) | Direct CLI access |
| **UI** | WebApp (HTML Service) | Express + menu.yaml |
| **Auth** | Google Account | No auth (local only) |
| **Backup** | Drive auto-backup | Manual (git + rclone) |

**Use GAS for:**
- Mobile access
- Cloud backup
- Telegram bot integration
- Always-on automations (triggers)

**Use Node.js for:**
- Local-first workflow
- Offline access
- Direct Taskwarrior integration
- Vault markdown files (Obsidian)

---

## Related Documentation

- **[Main README](../README.md)** - Complete AOS Hub documentation
- **[voice.md](../voice.md)** - VOICE implementation details
- **[game.md](../game.md)** - Game implementation details
- **[core4.md](../core4.md)** - Core4 implementation details
- **[fruits.md](../fruits.md)** - Fruits implementation details

---

**Last Updated:** 2026-01-10
**Status:** ✅ Active (6 Centres implemented)
**Version:** 2.0 (Hub-and-Spoke Architecture)


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

### Tailscale Serve (actually funnel is needed)
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

   
   # αOS Local Index Node

> **Private Repository** — Local Entry Interface + Router Service for αOS

The **αOS Local Index Node** is a hybrid system combining a **local visual interface** with a **minimal routing service**.  
It replaces the need for a hosted index while keeping the exact same UI and semantics used across the αOS ecosystem.

This project is intentionally simple: it **routes**, it does **not decide**.

---

## Concept

This repository implements **A + B**:

- **A — Local Interface**  
  A browser-based command interface (Matrix UI + Grid) used as the primary αOS entry point.

- **B — Local Router Service**  
  A minimal Node.js service that exposes menu data from a single configuration file.

Both layers consume the same source of truth.

---

## Architecture

```text
menu.yaml  ← single source of truth
   │
   ├─ Node Router (Express)
   │     └─ /menu → JSON
   │
   └─ Local Index UI (Browser)
         └─ fetch('/menu')
```

---

## Design Principles

- **Single Source of Truth**  
  All routes are defined once (`menu.yaml`).

- **Offline First**  
  Runs entirely on localhost.

- **No Persistence**  
  No logging, no storage, no user state.

- **UI ≠ Logic**  
  The interface renders data, it does not contain it.

- **Router Only**  
  This project never becomes a Centre.

---

## Repository Structure

```text
alphaos-index-node/
├─ menu.yaml              # routing config (SSOT, YAML or JSON)
├─ server.js              # local router service
├─ data/                  # local JSON payloads
├─ scripts/               # vault sync + task sync helpers
├─ public/
│  ├─ index.html          # menu-only root UI
│  ├─ core4.html          # Core4 bridge UI
│  ├─ facts.html          # Fruits UI
│  ├─ tele.html           # Telegram control layer
│  ├─ chapters.html       # chapters viewer
│  ├─ game/               # Game Centre pages
│  ├─ door/               # Door Centre pages
│  ├─ voice/              # Voice Centre pages
│  ├─ style.css           # UI styling
│  ├─ matrix.js           # matrix + glitch background
│  └─ menu.js             # menu loader
└─ README.md
```

---

## Configuration

### menu.yaml

`menu.yaml` is parsed with `js-yaml`, so it can be YAML or JSON. Current file uses JSON syntax.

```yaml
links:
  - label: Voice Centre
    cmd: voice
    url: https://script.google.com/macros/s/.../exec
  - label: Door Centre
    cmd: door
    url: https://script.google.com/macros/s/.../exec
  - label: Game Centre
    cmd: game
    url: https://script.google.com/macros/s/.../exec
```

Fields:

- `label` (string, required) - UI label.
- `url` (string, required) - redirect target.
- `cmd` (string, optional) - slug for `/your-cmd` redirect and Telegram router (`/api/centres`).

This file is the **only configuration** that should change for routes.

---

## Running Locally

```bash
npm install
npm start
```

Then open:

```
http://127.0.0.1:8799
```

You can also run directly:

```bash
node server.js
```

## UI Routes

Static pages are served from `public/`:

- `/` - menu root UI
- `/game` - Game Centre (index)
- `/game/frame`, `/game/freedom`, `/game/focus`, `/game/fire` - Game sub-centres
- `/game/tent` - General's Tent
- `/door` - Door Centre
- `/voice` - Voice Centre
- `/facts` - Fruits maps
- `/core4` - Core4 bridge UI
- `/tele` - Telegram control layer
- `/chapters.html` - chapters viewer

## API Reference

Menu and health:

- `GET /menu` - raw `menu.yaml` as `{ links: [...] }`
- `GET /api/centres` - normalized centres payload for the Telegram router
- `GET /health` - service health

General's Tent:

- `POST /api/generals/report` - save weekly report markdown to `~/AlphaOS-Vault/Game/Tent`
- `GET /api/generals/latest?type=frame|freedom|focus|fire|voice` - latest markdown metadata

Fruits:

- `GET /api/fruits` - questions, answers, and metadata
- `GET /api/fruits/users` - registered user list
- `POST /api/fruits/register` - register chat user
- `POST /api/fruits/next` - next unanswered question
- `POST /api/fruits/answer` - submit answer
- `POST /api/fruits/skip` - mark a question as skipped
- `POST /api/fruits/export` - write markdown export to vault

Door:

- `POST /api/door/export` - export markdown (writes to vault + optional TickTick)
- `GET /api/door/flow` - door flow state (local JSON)
- `GET /api/door/hotlist` - hotlist items
- `POST /api/door/hotlist` - add hotlist items
- `POST /api/door/doorwar` - run Door War evaluation
- `POST /api/door/warstack/start` - start or resume War Stack
- `POST /api/door/warstack/answer` - answer current War Stack step
- `GET /api/door/warstack/:id` - fetch War Stack by id/short id
- `GET /api/door/chapters?source=blueprints|alphaos` - chapters from vault

Game:

- `POST /api/game/export` - export markdown (writes to vault + optional TickTick)
- `GET /api/game/chapters?source=alphaos|blueprints` - game chapters

Voice:

- `POST /api/voice/export` - save session markdown to vault
- `GET /api/voice/history?limit=50` - recent vault files
- `GET /api/voice/file?path=relative/path.md` - read vault file
- `POST /api/voice/autosave` - autosave section to vault

Core4:

- `POST /api/core4` - toggle subtask (local or bridge)
- `GET /api/core4/today` - totals for today

Fire:

- `GET /api/fire/day` - daily tasks (Taskwarrior primary, TickTick fallback)
- `GET /api/fire/week?tag=fire` - weekly tasks (Taskwarrior primary, TickTick fallback)
- Aliases: `/fire/day`, `/fire/week`, `/fired`, `/firew`
  - Source priority: Taskwarrior (local) → TickTick (fallback)

Taskwarrior:

- `GET /api/taskwarrior/tasks?status=pending&tags=door,core4` - filtered export
- `POST /api/taskwarrior/add` - add tasks via local `task` CLI
- `POST /api/taskwarrior/push` - push filtered tasks to TickTick

Telegram:

- `POST /api/tele/send` - send a message via local `tele` CLI

Docs:

- `GET /api/doc?name=foundation|code|core|door|game|voice` - αOS docs from vault

Terminal:

- `WS /ws/terminal` - embedded terminal websocket

## systemd env file

If you run the index node via systemd (`aos-index.service`), it reads an env file at `~/.env/alphaos-index.env`.
An example file is provided at `index-node/alphaos-index.env.example`.

---

## Integration

This local node can be consumed by:

- Browser UI
- Telegram Router Bot
- CLI tools (fish / python)

All consumers must treat `menu.yaml` as read-only input.

---

## Core4 TTY

This repo also ships a local Core4 TTY utility (writes to `~/.local/share/alphaos`).

```bash
npm run core4
```

By default it will sync completed Core4 subtasks into Taskwarrior (tag: `core4`
plus subtask tags like `+fitness`, project: `core4`). Disable with `CORE4_TW_SYNC=0`.

## Embedded Terminal (General's Tent)

General's Tent includes a local embedded terminal powered by `node-pty` + `xterm`.

```bash
npm install
```

The websocket is restricted to localhost unless `TERMINAL_ALLOW_REMOTE=1` is set.

## Environment Variables

Core server:

- `HOST` (default `0.0.0.0`)
- `PORT` (default `8799`)
- `MENU_YAML` (default `./menu.yaml`)
- `TERMINAL_ENABLED` (set `0` to disable)
- `TERMINAL_ALLOW_REMOTE` (set `1` to allow non-local websocket)

Vault paths and exports:

- `FRUITS_QUESTIONS` (default `data/fruits_questions.json`)
- `FRUITS_DIR` (default `~/AlphaOS-Vault/Game/Fruits`)
- `FRUITS_STORE` (default `FRUITS_DIR/fruits_store.json`)
- `FRUITS_EXPORT_DIR` (default `FRUITS_DIR`)
- `DOOR_FLOW_PATH` (default `~/AlphaOS-Vault/Door/.door-flow.json`)
- `VOICE_VAULT_DIR` (default auto-detects `~/Voice`, else `~/AlphaOS-Vault/VOICE`)

Sync and automation:

- `TICK_ENV` (default `~/.alpha_os/tick.env`)
- `TASK_EXPORT` (default `~/.local/share/alphaos/task_export.json`)
- `TASK_BIN` (default `task`)
- `TASKRC` (optional Taskwarrior config override)
- `TASK_CACHE_TTL` (seconds, default `30`)
- `TASK_EXPORT_FILTER` (optional filter passed to `task`, e.g. `status:pending` before `export`)
- `SYNC_TAGS` (default `door,hit,strike,core4,fire`)
- `SYNC_MAP` (default `~/.local/share/alphaos/task_sync_map.json`)
- `RCLONE_RC_URL` (default `http://127.0.0.1:5572`)
- `RCLONE_TARGET` (default `fabian:AlphaOS-Vault`)
- `RCLONE_BACKUP_TARGET` (default `${RCLONE_TARGET}-backups`)
- `RCLONE_FLAGS` (default `--update --skip-links --create-empty-src-dirs`)
- `DOOR_HITS_TICKTICK` (set `1` to push War Stack hits)
- `DOOR_HITS_TAGS` (default `door,hit,production`)
- `FIRE_GCAL_EMBED_URL` (optional, for Fire week fallback)
- `AOS_BRIDGE_URL` or `BRIDGE_URL` (Core4 bridge)
- `BRIDGE_TIMEOUT_MS` (default `2500`)
- `TELE_BIN` (default `/home/alpha/bin/utils/tele`)

## Local Centres

- `http://127.0.0.1:8799/game` → Game Centre
- `http://127.0.0.1:8799/game/frame` → Frame Map
- `http://127.0.0.1:8799/game/freedom` → Freedom Map
- `http://127.0.0.1:8799/game/focus` → Focus Map
- `http://127.0.0.1:8799/game/fire` → Fire Map
- `http://127.0.0.1:8799/game/tent` → General's Tent
- `http://127.0.0.1:8799/door` → Door Centre
- `http://127.0.0.1:8799/voice` → Voice Centre
- `http://127.0.0.1:8799/facts` → Fruits Map
- `http://127.0.0.1:8799/core4` → Core4 bridge UI
- `http://127.0.0.1:8799/tele` → Telegram Control Layer

## Door Centre Exports

Door Centre can export markdown directly into your vault:

- Hot List → `~/AlphaOS-Vault/Door/1-Potential`
- Door War → `~/AlphaOS-Vault/Door/2-Plan`
- War Stack → `~/AlphaOS-Vault/Door/War-Stacks`
- Hit List → `~/AlphaOS-Vault/Door/3-Production`
- Profit → `~/AlphaOS-Vault/Door/4-Profit`

### TickTick Push (Optional)

Door exports can also push to TickTick (async, tags: `door` + tool name).  
Token is read from `~/.alpha_os/tick.env`:

```
TICKTICK_TOKEN=...
TICKTICK_PROJECT_ID=inbox
```

The save always writes locally; TickTick is best-effort.

### UUID Bridge (Minimal)

When TickTick push is enabled, a local Sync ID is generated and appended to the TickTick note:

```
SYNC-ID: door-warstack-...
```

Mappings are stored in:

```
~/.local/share/alphaos/task_sync_map.json
```

## Taskwarrior Export (Local)

Local sync expects a Taskwarrior export file:

```
~/.local/share/alphaos/task_export.json
```

Index Node will refresh this file on-demand when Taskwarrior export runs successfully; for periodic refresh (and Vault copy), use:

```
scripts/taskwarrior/export-snapshot.sh
scripts/setup-task-export.sh
```

You can expose tagged tasks via:

```
GET /api/taskwarrior/tasks?status=pending
```

Tags are filtered by `SYNC_TAGS` (default: `door,hit,strike,core4`).

## Telegram Layer

The `/tele` page provides a UI layer for Telegram commands and quick actions.  
It uses the local `tele` CLI for sending messages:

```
/api/tele/send
```

Set `TELE_BIN` if the script lives elsewhere (default: `/home/alpha/bin/utils/tele`).

### Telegram WebApp Mode

When opened inside Telegram, `/tele` uses `telegram-web-app.js` and sends
payloads via `Telegram.WebApp.sendData()` for:

- Hot List quick add
- Core4 toggle
- `/command` messages from the terminal

### Sync Map Updater (Local)

Update the local UUID bridge with Taskwarrior UUIDs:

```
scripts/task_sync_map_update.py
```

This reads `TASK_EXPORT` + `SYNC_TAGS` and writes to:

```
~/.local/share/alphaos/task_sync_map.json
```

### Taskwarrior Hook

If you want automatic updates on task changes, add this hook:

```
~/.task/hooks/on-modify.task-sync
```

Hook target:

```
scripts/task_sync_hook.py
```


## Game Centre Exports

Game sub-centres export markdown into the vault:

- Frame → `~/AlphaOS-Vault/Game/Frame`
- Freedom → `~/AlphaOS-Vault/Game/Freedom`
- Focus → `~/AlphaOS-Vault/Game/Focus`
- Fire → `~/AlphaOS-Vault/Game/Fire`

### TickTick Push (Optional)

Game sub-centres can push a copy to TickTick (async, tag: `game`).  
Token is read from `~/.alpha_os/tick.env`:

```
TICKTICK_TOKEN=...
TICKTICK_PROJECT_ID=inbox
```

The save always writes locally; TickTick is best-effort.

### UUID Bridge (Minimal)

When TickTick push is enabled, a local Sync ID is generated and appended to the TickTick note:

```
SYNC-ID: game-frame-...
```

Mappings are stored in:

```
~/.local/share/alphaos/task_sync_map.json
```

## Vault Sync (rclone)

- Script: `scripts/vault-sync.sh` (modes: `pull`, `push`, default `bisync`).
- Defaults: local `~/AlphaOS-Vault`, remote `fabian:AlphaOS-Vault`, remote backups `fabian:AlphaOS-Vault-backups`, local backups `~/.local/share/alphaos/vault-backups/`.
- Backups: `--backup-dir` keeps overwritten/deleted files in timestamped folders; bisync resolves conflicts by newer mtime and tracks renames.
- Symlinks: default is to skip symlinks (`--skip-links`); override flags via `VAULT_RCLONE_FLAGS` (e.g. `--copy-links`).
- Systemd templates: `systemd/alphaos-vault-sync-pull.service` (pull on boot), `systemd/alphaos-vault-sync-push.service` (push on shutdown).
  - Install: copy to `/etc/systemd/system/`, `systemctl daemon-reload`, then `systemctl enable alphaos-vault-sync-{pull,push}.service`.
- Override remotes/paths via env: `VAULT_REMOTE`, `VAULT_REMOTE_BACKUP`, `VAULT_LOCAL`, `VAULT_LOCAL_BACKUP`.

## Troubleshooting

- `menu.yaml` not loading - ensure valid YAML/JSON and `MENU_YAML` points to it.
- Vault reads empty - confirm `~/AlphaOS-Vault` exists and expected subfolders are present.
- TickTick push fails - check `~/.alpha_os/tick.env` and token/project values.
- Taskwarrior export missing - verify `TASK_EXPORT` path and that it is valid JSON.
- Terminal websocket rejected - `TERMINAL_ENABLED` must not be `0`, and remote access needs `TERMINAL_ALLOW_REMOTE=1`.


---

## Non-Goals

This repository will never:

- store user data
- track usage
- perform αOS logic
- replace Centres
- expose public endpoints

---

## Status

**Stable — intentionally minimal**

Changes are structural, not frequent.

---

## License

Private — internal αOS infrastructure.
