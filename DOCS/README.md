# AOS Hub - Documentation

**Version:** 2.1 (2026-01-10)
**Purpose:** Central documentation for AlphaOS Hub ecosystem

---

## Overview

AOS Hub is the **integration layer** connecting Fish shell, Node.js server, GAS cloud services, Telegram bots, and Taskwarrior for the AlphaOS system.

**Architecture:** Hub-and-Spoke model
- **Index Node** (Node.js :8799) - Local menu server
- **GAS HQ** (Google Apps Script) - Cloud backend
- **Router Bot** (Python/aiogram) - Telegram command routing
- **Bridge** (aiohttp :8080) - GAS ↔ Taskwarrior communication

---

## Documentation Index

### AlphaOS Centres (Philosophy + Implementation)

**Complete Centre Documentation:**
- **[DOOR CENTRE](./DOOR_CENTRE_RESTRUCTURED.md)** - 4P Flow (Potential→Plan→Production→Profit)
- **[GAME CENTRE](./GAME_CENTRE_RESTRUCTURED.md)** - Fact Maps Flow (Frame→Freedom→Focus→Fire→Tent)
- **[VOICE CENTRE](./VOICE_CENTRE_RESTRUCTURED.md)** - Mental Mastery (STOP→SUBMIT→STRUGGLE→STRIKE)
- **[CORE4 CENTRE](./CORE4_CENTRE_RESTRUCTURED.md)** - 28-or-Die Daily Habits
- **[FRUITS CENTRE](./FRUITS_CENTRE_RESTRUCTURED.md)** - Daily Results Tracking (4 Fs)
- **[FIRE CENTRE](./FIRE_CENTRE_RESTRUCTURED.md)** - Weekly War (detailed)

**Structure:** Each doc contains:
- **AlphaOS Philosophy: What MUST Be** (Elliott Hulse blueprints)
- **Implementation: What IS** (GAS + Node.js + Python/CLI status)
- **Data Flow** (complete system diagrams)
- **Testing** (smoke tests)
- **Setup** (checklists)

---

## System Architecture

### Hub-and-Spoke Model

```
┌─────────────────────────────────────────────────────────────┐
│                  AOS HUB ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INTERFACES (Input)                                         │
│  ├─ Fish Shell       (hot, frame, fire, voice, war)        │
│  ├─ Telegram Bot     (/hot, /frame, /fire, /voice)         │
│  ├─ GAS WebApp       (Google Forms, Sheets, Drive)         │
│  └─ Node.js Server   (localhost:8799 - Index Centre)       │
│                                                             │
│  BACKEND (Data Layer)                                       │
│  ├─ Taskwarrior      (Source of Truth - UUIDs)            │
│  ├─ Markdown Files   (Obsidian-friendly Vault)            │
│  ├─ JSON Files       (GAS/Bot processing)                  │
│  └─ Google Drive     (Cloud backup)                        │
│                                                             │
│  INTEGRATION (Hub Components)                               │
│  ├─ Index Node       (Node.js :8799 - Menu system)        │
│  ├─ Router Bot       (Python/aiogram - Telegram routing)   │
│  ├─ Bridge           (aiohttp :8080 - GAS ↔ TW)           │
│  └─ GAS HQ           (Google Apps Script - Cloud backend)  │
│                                                             │
│  SYNC & HOOKS                                               │
│  ├─ on-add hooks     (Taskwarrior → TickTick)              │
│  ├─ on-exit hooks    (task_export.json → GAS)             │
│  ├─ systemd timers   (Auto-sync, backups, weekly reviews) │
│  └─ rclone           (Cloud sync)                          │
│                                                             │
│  EXTERNAL SERVICES                                          │
│  ├─ TickTick         (Mobile task management)              │
│  ├─ Google Calendar  (Fire Maps, deadlines)                │
│  ├─ Telegram         (Notifications, mobile ops)           │
│  └─ Google Drive     (Cloud storage)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## GAS HQ Architecture

### Entry Points

**`doGet(e)` (gas/entrypoints.gs):**
- Renders `Index.html` (HQ UI)
- Centre mode: hides Home/Header, shows toolbar

**`doPost(e)` (gas/entrypoints.gs):**
- Handles Telegram webhook
- Special payloads:
  - `kind=heartbeat` / `bridge_heartbeat` → update Script Props
  - `kind=warstack_complete` → `door_ingestWarStack_()`
  - Telegram messages → routed via router/fruits/webapp

---

### Status / System Health

**`getSystemStatus_()` (gas/hq_status.gs):**
- Returns bridge/router/heartbeat/server info
- Bridge: `/health` check on `AOS_BRIDGE_URL`
- Router: `ROUTER_HEARTBEAT_TS` age check
- Heartbeat: `WATCHDOG_LAST_BEAT_TS` age (fallback when Bridge unreachable)
- Sends Telegram ping per load (session id + labels)

**`debugStatus()` (gas/hq_status.gs):**
- Logs current status to GAS console
- Terminal command: `debug`

**`getDashboardStats_()` (gas/hq_status.gs):**
- Hotlist/War Stack/Hit counters
- Displayed in HQ UI

---

### Centres (GAS Implementation)

**Door Centre (`gas/door.gs`):**
- Saves sessions to Drive (`Alpha_Door`)
- War Stack: autosave drafts, Telegram push, Task queue → Bridge
- Hit/Task logic:
  - Hits → Door Task (depends on hits) → Profit Task (depends on door)
  - Writes Taskwarrior UUIDs into MD frontmatter + section

**Fruits Centre (`gas/fruits.gs`):**
- Daily fact questions (4 Fs: Facts, Feelings, Focus, Fruit)
- Answers to Drive (`Alpha_Fruits`)
- Telegram bot hooks

**Voice Centre (`gas/voice.gs`):**
- VOICE sessions to Drive (`Alpha_Voice`)
- 4-step process (Stop/Submit/Struggle/Strike)
- Phase tracking, history view

**Core4 Centre (`gas/core4.gs`):**
- 28-or-Die tracking to Drive (`Alpha_Core4`)
- Stats feed for HQ dashboard
- Telegram bot commands (`/fit`, `/fue`, `/med`, `/mem`, `/par`, `/pos`, `/dis`, `/dec`)
- Optional journal note via bot: `/fit <text>` writes a Core4 journal entry (Index Node `/api/journal`)

**Game Centres (`gas/game_*.gs`):**
- Frame: `game_frame.gs` → `Alpha_Game/Frame`
- Freedom: `game_freedom.gs` → `Alpha_Game/Freedom`
- Focus: `game_focus.gs` → `Alpha_Game/Alpha_Focus`
- Fire: `game_fire.gs` → `Alpha_Game/Fire`
- Tent: `tent.gs` → `Alpha_Tent/Weekly_Reviews` (Sunday 20:00 auto-trigger)

**Hot List (`gas/hotlist.gs`):**
- Quick add, Drive storage
- Optional TickTick sync
- UUID sync via task_export.json

---

### Task Queue → Bridge

**Flow:**
1. `door_enqueueTaskOps_()` stores tasks in `DOOR_TASK_QUEUE` (Script Prop)
2. `door_flushTaskOps_()` POSTs to `/bridge/task/execute` on `AOS_BRIDGE_URL`
3. Bridge executes via Taskwarrior, returns UUIDs
4. GAS updates War Stack MD with UUIDs
5. Trigger helper: `door_setupTaskQueueTrigger_()` (every 5 min)

---

### War Stack Ingestion (from Python Bot / Webhook)

**`door_ingestWarStack_(payload)`:**
1. Saves markdown to `Alpha_Door/3-Production`
2. Builds tasks (Hits, Door, Profit) with dependencies
3. Enqueues tasks to Bridge
4. Optional Telegram send (`WARSTACK_TELEGRAM=1`)
5. TickTick sync per phase

---

### Script Properties (GAS Config)

**Bridge/Router/Heartbeat:**
- `AOS_BRIDGE_URL`, `BRIDGE_URL`, `LAPTOP_WEBHOOK_URL`
- `ROUTER_HEARTBEAT_TS`, `WATCHDOG_LAST_BEAT_TS`, `BRIDGE_HEARTBEAT_TS`
- `TELEGRAM_BOT_TOKEN` / `BOT_TOKEN`, `CHAT_ID`

**HQ WebApp:**
- `HQ_WEBAPP_URL` (URL for Telegram WebApp buttons)

**Door/TickTick/Telegram:**
- `DOOR_DRIVE_FOLDER_ID`, `DOOR_LOG_SHEET_ID`
- `TICKTICK_TOKEN`, `TICKTICK_INBOX_PROJECT_ID`
- `DOOR_TICKTICK_PROJECT_{POTENTIAL,PLAN,PRODUCTION,PROFIT}`
- `WARSTACK_TELEGRAM`, `WARSTACK_BOT_TOKEN`, `WARSTACK_USER_ID`

**Core4/Fruits/Voice:**
- Drive/Sheet IDs (e.g., `CORE4_DRIVE_FOLDER_ID`, `FRUITS_DRIVE_FOLDER_ID`, `VOICE_DRIVE_FOLDER_ID`)

**General:**
- `AOS_TASK_EXPORT_FILE_ID` (task_export.json file id cache)
- `AOS_TASK_EXPORT_CACHE_ID` (fallback snapshot file id)

---

### Storage (Drive Defaults)

```
Google Drive/
├── Alpha_Door/
│   ├── 0-Drafts/
│   ├── 1-Potential/      (Hot List)
│   ├── 2-Plan/           (War Stacks)
│   ├── 3-Production/     (Hit Lists)
│   └── 4-Profit/         (Reviews)
├── Alpha_Game/
│   ├── Frame/
│   ├── Freedom/
│   ├── Alpha_Focus/      (Current, Q1-Q4)
│   ├── Fire/
│   └── Fruits/
├── Alpha_Tent/
│   └── Weekly_Reviews/
├── Alpha_Voice/
└── Alpha_Core4/
```

---

### Inline Rendering Helpers

- `renderInlineMapHtml_(key)` (`gas/index_inline.gs`) - Pulls inline templates
- `getCentreUrls_()` - External URLs for buttons/dots
- `getBridgeUrl_()` - Central bridge URL resolution
- `debugScriptProps_()` - Logs all Script Props (tokens masked)
- `bridgeCheck_()` - Explicit `/bridge/health` check (HQ terminal: `bridgecheck`)

---

### Functions & Triggers (What Runs When)

**UI Load:**
- `getSystemStatus_()` → Called from HQ frontend; Telegram ping with session + bridge label
- `getDashboardStats_()` → HQ counters (Hotlist/War Stacks/Hits)

**Door:**
- `door_ingestWarStack_(payload)` → Via webhook `kind=warstack_complete` or inline War Stack submit
- `door_taskQueueTick_()` → If trigger installed via `door_setupTaskQueueTrigger_()`

**Reminders/Timers:**
- `weeklyWarStackReminder()` (`gas/bot_hub.gs`) → Telegram reminder
- `weeklyFireMapAutomation()` (`gas/bot_hub.gs`) → Calls Bridge `POST /bridge/trigger/weekly-firemap`
- `dailyReview()` (`gas/door_profit.gs`) → Calls Bridge `GET /bridge/daily-review-data`
- `watchdogCheck()` → Checks heartbeat/bridge health; Telegram alert on offline/online

**Debug:**
- `debugStatus()` → Logs bridge/router/heartbeat to console (HQ terminal: `debug`)
- `debugScriptProps_()` → Logs all Script Props (tokens masked)

---

### Auth Headers (Bridge)

- `bridge_getAuthHeaders_()` - Attach `AOS_BRIDGE_AUTH_HEADER` / `AOS_BRIDGE_AUTH_VALUE` if configured

---

## Node.js Architecture

### Index Node (localhost:8799)

**Purpose:** Local menu server + API endpoints

**Entry:** `http://127.0.0.1:8799`

**Backend:** `index-node/server.js`

**Config:** `index-node/menu.yaml`

---

### Taskwarrior Integration

**Two Execution Paths:**

**1) Node Direct (Local API):**
- UI/client calls Node endpoints
- Node runs local `task` CLI

**2) Bridge Execute (GAS → Bridge → Taskwarrior):**
- GAS queues tasks
- Bridge executes via `task add`
- Returns UUIDs to GAS

---

### Node API Endpoints

**Taskwarrior (Local):**
```bash
GET /api/taskwarrior/tasks?status=pending&tags=door,core4
POST /api/taskwarrior/add
POST /api/taskwarrior/push     # TickTick sync
```

**Bridge API (Local):**
```bash
POST /bridge/task/execute       # Requires AOS_TASK_EXECUTE=1
POST /bridge/task/operation     # Forwards to GAS; queued on failure
```

**Core4:**
```bash
POST /api/core4
GET /api/core4/today
```

**VOICE:**
```bash
POST /api/voice/export
POST /api/voice/autosave
GET /api/voice/history?limit=50
GET /api/voice/file?path=relative/path.md
```

**Game:**
```bash
GET /api/game/export            # Shared Game export
GET /api/fire/day               # Today's Fire Map
GET /api/fire/week              # Current week Fire Map
POST /api/generals/report       # Weekly review
GET /api/generals/latest?type=frame|freedom|focus|fire|voice
```

**Fruits:**
```bash
GET /api/fruits
POST /api/fruits/next
POST /api/fruits/answer
POST /api/fruits/skip
POST /api/fruits/export
```

---

### Environment Variables (Node.js)

**Common:**
```bash
AOS_TASK_BIN=task               # Taskwarrior binary
AOS_TASK_EXECUTE=1              # Allow Bridge execute
AOS_GAS_WEBHOOK_URL=...         # Bridge → GAS
AOS_BRIDGE_URL=...              # GAS → Bridge
```

**Fire Map:**
```bash
FIRE_GCAL_EMBED_URL=...
FIRE_TASK_TAGS_ALL=fire,production,hit
FIRE_TASK_DATE_FIELDS=scheduled,due
```

**Core4:**
```bash
AOS_BRIDGE_URL=...
BRIDGE_TIMEOUT_MS=5000
CORE4_TW_SYNC=true
```

**VOICE:**
```bash
VOICE_VAULT_DIR=~/Voice         # Auto-detect Vault location
```

**Fruits:**
```bash
FRUITS_QUESTIONS=...
FRUITS_STORE=~/AlphaOS-Vault/Game/Fruits/fruits_store.json
FRUITS_EXPORT_DIR=~/AlphaOS-Vault/Game/Fruits
```

---

## Quick Start

### Fish Shell
```fish
# Add to Hot List
hot "Build comprehensive Door-Bot"

# Show Hot List
hotlist

# Open Hot List entry
hotopen 74

# Create War Stack
war "Project Name"

# Frame Map
frame

# Fire Map (today)
fire
```

---

### Telegram Bot
```
# Door
/hot Build comprehensive Door-Bot
/hotlist
/warstack
/doors

# Game
/frame
/fire
/focus
/freedom

# Core4
/core
/fit  /fue  /med  /mem  /par  /pos  /dis  /dec

# VOICE
/voice
```

---

### GAS WebApp
- Open [GAS HQ](https://script.google.com/...)
- Access Centres via inline panels
- Submit via forms → Drive storage
- View via Google Sheets

---

### Node.js Server
```bash
# Start server
cd ~/aos-hub/index-node
npm start

# Access
http://localhost:8799

# Centre URLs
http://localhost:8799/game
http://localhost:8799/game/fire
http://localhost:8799/voice
http://localhost:8799/facts
http://localhost:8799/core4
```

---

## Key Concepts

### The 4P Flow (THE DOOR - Pillar #4)
1. **POTENTIAL** → Hot List (capture ideas)
2. **PLAN** → War Stacks (strategic planning with reflexive inquiry)
3. **PRODUCTION** → Hit Lists (execution with 4 Hits per War Stack)
4. **PROFIT** → Review (achieved & done, learnings extracted)

---

### The Fact Maps Flow (THE GAME - Pillar #5)
1. **FRAME** → Where am I now? (current reality)
2. **IPW** → 10-year Ideal Parallel World vision
3. **FREEDOM** → Annual vision (how do I get there?)
4. **FOCUS** → Monthly mission (what to do to stay on course?)
5. **FIRE** → Weekly War (4 strikes per domain = 16 total)
6. **DAILY GAME** → Today's execution (Core + Voice + Door)
7. **TENT** → Weekly Review (return and report)

**Critical:** Each layer FEEDS the next. Without Frame, no Freedom. Without Freedom, no Focus. Without Focus, no Fire.

---

### The 4 Fs (THE VOICE - Pillar #3 - Submit)
1. **Facts** → Undeniable realities
2. **Feelings** → Emotions beyond surface
3. **Focus** → Mindset toward facts/feelings
4. **Fruit** → Results/outcomes (what you got, what you want)

---

### Data Formats
- **Markdown** → Humans (Obsidian, Vault)
- **JSON** → Bots/GAS (processing, queues)
- **Taskwarrior** → Source of Truth (UUIDs, triggers TickTick)

---

## File Locations

```
~/aos-hub/
├── DOCS/                           # This documentation
│   ├── README.md                   # This file
│   ├── *_RESTRUCTURED.md           # Centre docs (Philosophy + Implementation)
│   ├── gas/                        # GAS-specific docs (legacy)
│   └── node/                       # Node.js-specific docs (legacy)
│
├── index-node/                     # Node.js local server
│   ├── server.js                   # Main server
│   ├── menu.yaml                   # Menu config
│   └── public/                     # Static files
│
├── router/                         # Python Telegram bot
│   ├── router_bot.py               # Main bot (aiogram)
│   └── extensions/door_flow.py     # Door commands
│
├── bridge/                         # Bridge (GAS ↔ Taskwarrior)
│   └── bridge_server.py            # aiohttp server (:8080)
│
├── gas/                            # GAS scripts (Google Apps Script)
│   ├── entrypoints.gs              # doGet/doPost
│   ├── hq_status.gs                # System health
│   ├── door.gs, door_warstack.gs   # Door Centre
│   ├── game_*.gs                   # Game Centres
│   ├── core4.gs, voice.gs, fruits.gs
│   └── ...
│
└── scripts/                        # Utility scripts
    ├── syncvaultctl                # Git + rclone sync v2.4.0
    └── ...

~/.dotfiles/config/fish/functions/
├── aos-hot.fish                    # Hot List interface
├── aos-war.fish                    # War Stack interface
└── aos-game.fish                   # Game Maps interface

~/AlphaOS-Vault/
├── Door/                           # THE DOOR data
│   ├── 1-Potential/                # Hot List (MD + JSON)
│   ├── 2-Plan/                     # War Stacks
│   ├── 3-Production/               # Hit Lists
│   └── 4-Profit/                   # Reviews
│
└── Game/                           # THE GAME data
    ├── Frame/                      # Frame Maps
    ├── Freedom/                    # Freedom Maps (IPW + Annual)
    ├── Focus/                      # Focus Maps (Monthly)
    ├── Fire/                       # Fire Maps (Weekly)
    ├── Fruits/                     # Fruits Maps (Daily 4 Fs)
    └── Tent/                       # General's Tent (Weekly Reviews)
```

---

## Developer TODOs

### Fix/Decide
- `dailyReview()` - Calls Bridge `GET /bridge/daily-review-data`. Returns empty sessions for now; tasks count uses task export if present.
- `weeklyFireMapAutomation()` - Calls Bridge `POST /bridge/trigger/weekly-firemap`. Requires `AOS_FIREMAP_BIN` (and optional `AOS_FIREMAP_TRIGGER_ARGS`).
- Status UI - Shows "Checking" if GAS cannot reach Bridge via funnel. Ensure `AOS_BRIDGE_URL=https://ideapad.tail7a15d6.ts.net/bridge` is externally reachable; otherwise accept hb fallback.
- External Centre Links - Set Script Props for URLs or hide/mute missing ones to avoid "Missing URL".

### Debug/Telemetry
- Verify Status call runs on page load (browser console shows `SystemStatus data`). If not, add retry/fallback.
- Optionally add terminal command `props` → `debugScriptProps_()`.

### Docs/Config
- Keep this README in sync with Centre docs.
- Consider centralizing more Script Prop access through `config.gs` (already partially done).

### Nice to Have
- Refine Status ping cadence (currently every load); optional split messages (HQ online vs Bridge health).
- Decide on Heartbeat vs Funnel for Bridge status; if Funnel stays flaky, move UI status to heartbeat label (`hb Xm`).

### Verified OK (Recent)
- Bridge executor supports `depends`/`wait`; War Stack tasks create Hits → Door (depends) → Profit (depends), UUIDs written to frontmatter + section.
- UI centre mode hides Home/Header, shows toolbar; terminal dummy lines removed; `debug` command triggers `debugStatus()`.
- Watchdog logs to console and Telegram on offline/online.

---

## Contributing

See individual Centre docs (`*_RESTRUCTURED.md`) for implementation details.

**Documentation Structure:**
- **Philosophy First** - Elliott Hulse blueprints define "What MUST Be"
- **Implementation Second** - GAS + Node.js + Python/CLI document "What IS"
- **No Speculation** - Only document what exists, not what "could be"

---

**Last Updated:** 2026-01-10
**Maintainer:** alpha (nimmsel23)
**Version:** 2.1 (Consolidated Architecture + Centre Docs)
