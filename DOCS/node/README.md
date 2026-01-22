# Node.js Implementation (Index Node)

**Version:** 2.0 (2026-01-10)
**Purpose:** Local Node.js server for AlphaOS Centres

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
- **[VOICE_CENTRE_RESTRUCTURED.md](../VOICE_CENTRE_RESTRUCTURED.md)** - VOICE implementation details
- **[GAME_CENTRE_RESTRUCTURED.md](../GAME_CENTRE_RESTRUCTURED.md)** - Game implementation details
- **[CORE4_CENTRE_RESTRUCTURED.md](../CORE4_CENTRE_RESTRUCTURED.md)** - Core4 implementation details
- **[FRUITS_CENTRE_RESTRUCTURED.md](../FRUITS_CENTRE_RESTRUCTURED.md)** - Fruits implementation details

---

**Last Updated:** 2026-01-10
**Status:** ✅ Active (6 Centres implemented)
**Version:** 2.0 (Hub-and-Spoke Architecture)
