# AlphaOS Local Index Node

> **Private Repository** — Local Entry Interface + Router Service for AlphaOS

The **AlphaOS Local Index Node** is a hybrid system combining a **local visual interface** with a **minimal routing service**.  
It replaces the need for a hosted index while keeping the exact same UI and semantics used across the AlphaOS ecosystem.

This project is intentionally simple: it **routes**, it does **not decide**.

---

## Concept

This repository implements **A + B**:

- **A — Local Interface**  
  A browser-based command interface (Matrix UI + Grid) used as the primary AlphaOS entry point.

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
├─ menu.yaml              # routing config (SSOT)
├─ server.js              # local router service
├─ package.json
├─ public/
│  ├─ index.html          # visual interface
│  ├─ style.css           # UI styling
│  ├─ matrix.js           # matrix + glitch background
│  └─ menu.js             # menu loader
└─ README.md
```

---

## Configuration

### menu.yaml

```yaml
links:
  - label: Voice Centre
    url: https://script.google.com/macros/s/.../exec
  - label: Door Centre
    url: https://script.google.com/macros/s/.../exec
  - label: Game Centre
    url: https://script.google.com/macros/s/.../exec
```

This file is the **only configuration** that should change.

---

## Running Locally

```bash
npm install
node server.js
```

Then open:

```
http://127.0.0.1:8799
```

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

## Local Centres

- `http://127.0.0.1:8799/game` → Game Centre
- `http://127.0.0.1:8799/game/frame` → Frame Map
- `http://127.0.0.1:8799/game/freedom` → Freedom Map
- `http://127.0.0.1:8799/game/focus` → Focus Map
- `http://127.0.0.1:8799/game/fire` → Fire Map
- `http://127.0.0.1:8799/game/tent` → General's Tent
- `http://127.0.0.1:8799/door` → Door Centre
- `http://127.0.0.1:8799/voice` → Voice Centre
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


---

## Non-Goals

This repository will never:

- store user data
- track usage
- perform AlphaOS logic
- replace Centres
- expose public endpoints

---

## Status

**Stable — intentionally minimal**

Changes are structural, not frequent.

---

## License

Private — internal AlphaOS infrastructure.
