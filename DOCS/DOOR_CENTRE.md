# Door Centre Documentation (Multi-Platform)

**Door Centre** implements the **DOOR Pillar** from AlphaOS across multiple platforms: Node.js, GAS (Google Apps Script), Python Bot, and CLI.

**Updated:** 2026-01-10 (Consolidated GAS + Node.js Documentation)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Taskwarrior UUID System](#taskwarrior-uuid-system)
4. [Phase 1: POTENTIAL (Hot List)](#phase-1-potential-hot-list)
5. [Phase 2: PLAN (Door War)](#phase-2-plan-door-war)
6. [Phase 3: PRODUCTION (War Stack + Hit List)](#phase-3-production-war-stack--hit-list)
7. [Phase 4: PROFIT (Reflection)](#phase-4-profit-reflection)
8. [Node.js Implementation](#nodejs-implementation)
9. [GAS Implementation](#gas-implementation)
10. [Data Flow](#data-flow)
11. [API Reference](#api-reference)
12. [Testing](#testing)

---

## Overview

**Purpose:** Transform chaotic ideas (Hot List) into systematic weekly execution (Hit List) through strategic filtering (Door War) and transformative inquiry (War Stack).

**4P Flow:** Potential → Plan → Production → Profit

**Key Innovation:** **Taskwarrior UUIDs** are the single source of truth, not custom GUIDs or file paths.

### Multi-Platform Support

| Platform | Role | Use Case |
|----------|------|----------|
| **Node.js** | Local API server + Web UI | Desktop workflow, full Taskwarrior integration |
| **GAS** | Cloud fallback + Mobile | Remote access, Google Drive integration |
| **Python Bot** | Telegram conversational flow | Mobile War Stack creation |
| **CLI (Fish)** | Terminal interface | Fast local capture |

### Benefits of UUID-First Design

**Before (Custom GUID):**
```json
{
  "hotlist": [
    {
      "guid": "lqz7qxxx123abc",  // Custom GUID
      "title": "My Door",
      "source": "manual"
    }
  ]
}
```
- ❌ Duplicate ID systems (GUID + Taskwarrior UUID)
- ❌ Manual sync between .door-flow.json and Taskwarrior
- ❌ No integration with taskopen, TickTick hooks

**After (Taskwarrior UUID):**
```json
{
  "hotlist": [
    {
      "task_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // Taskwarrior UUID
      "task_id": "42",
      "title": "My Door",
      "domain": "Business"
    }
  ]
}
```
- ✅ Single source of truth (Taskwarrior)
- ✅ Automatic hook integration
- ✅ taskopen works (`taskopen <uuid>` opens notes)
- ✅ TickTick sync via Taskwarrior hooks
- ✅ Obsidian integration via task-obsidian plugin

---

## Architecture

### Multi-Component System

| Component | Role | UUID Integration |
|-----------|------|------------------|
| **Index Node** | Web UI + API server | Creates tasks via Bridge |
| **Bridge** | Taskwarrior executor | POST `/bridge/task/execute` + `/bridge/task/modify` |
| **Router Bot** | Telegram interface | Delegates to Index Node API |
| **War Stack Bot** | Conversational flow | Creates tasks via Bridge |
| **GAS Web App** | Cloud fallback | Creates tasks via Bridge webhook |
| **hot.fish** | CLI Hot List | Direct `task add` (UUID in output) |

### Data Flow: UUID-First

```
User creates Hot List item
    ↓
Index Node API (or hot.fish, or Telegram, or GAS)
    ↓
Bridge /bridge/task/execute
    ↓
Taskwarrior: task add project:HotList +potential
    ↓
Taskwarrior returns UUID
    ↓
UUID saved to .door-flow.json (Node) or hotlist_index.json (GAS)
    ↓
Taskwarrior hooks trigger (on-add.alphaos.py)
    ↓
TickTick sync, Obsidian sync, etc (automatic)
```

---

## Taskwarrior UUID System

### Task Hierarchy

```
HotList (project:HotList, +potential)
    ↓
Door (project:<DoorName>, +door +plan +<domain>, depends: <hotlist_uuid>)
    ↓
Hits (project:<DoorName>, +hit +production +<domain>, due:today+1..4d, wait:+1..4d)
    ↑ (Door depends on Hits)
    ↓
Profit (project:<DoorName>, +profit +<domain>, depends: <door_uuid>, wait:+5d)
```

### UUID Lifecycle

**1. Hot List Creation:**
```bash
task add project:HotList +potential +business "Vitaltrainer Module 6"
# Created task 42
# UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**2. Door War Selection:**
```bash
task add project:"Vitaltrainer Module 6" +door +plan +business "Door: Vitaltrainer Module 6" depends:a1b2c3d4-...
# Created task 43
# UUID: i9j0k1l2-m3n4-5678-opqr-st9012345678
```

**3. War Stack Hits:**
```bash
task add project:"Vitaltrainer Module 6" +hit +production +business "Hit 1: Study anatomy" due:today+1d wait:+1d
# Created task 44, UUID: u1v2w3x4-...

task add project:"Vitaltrainer Module 6" +hit +production +business "Hit 2: Practice teaching" due:today+2d wait:+2d
# Created task 45, UUID: y5z6a7b8-...

# ... Hit 3 & 4
```

**4. Wire Door Dependencies:**
```bash
task 43 modify depends:u1v2w3x4-...,y5z6a7b8-...,c9d0e1f2-...,g3h4i5j6-...
# Door now depends on all 4 Hits
```

**5. Create Profit Task:**
```bash
task add project:"Vitaltrainer Module 6" +profit +business "Profit: Vitaltrainer Module 6" depends:i9j0k1l2-... wait:+5d
# Created task 48, UUID: q7r8s9t0-...
```

### Task Tags & Projects

| Phase | Tags | Project | Example |
|-------|------|---------|---------|
| **Hot List** | `+potential +<domain>` | `HotList` | `task add project:HotList +potential +business "My idea"` |
| **Door** | `+door +plan +<domain>` | `<DoorName>` | `task add project:"My Door" +door +plan +business "Door: X"` |
| **Hits** | `+hit +production +<domain>` | `<DoorName>` | `task add project:"My Door" +hit +production +business "Hit 1"` |
| **Profit** | `+profit +<domain>` | `<DoorName>` | `task add project:"My Door" +profit +business "Profit: X"` |

**Domains (tag):** `business`, `body`, `being`, `balance`

---

## Phase 1: POTENTIAL (Hot List)

**Purpose:** Capture ALL potential doors without filtering.

### Via Index Node API

**POST `/api/door/hotlist`**

```bash
curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -H "Content-Type: application/json" \
  -d '{
    "items": ["Vitaltrainer Module 6", "FADARO Content Calendar"],
    "source": "manual",
    "domain": "Business"
  }'
```

**Response:**
```json
{
  "ok": true,
  "items": [
    {
      "task_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "task_id": "42",
      "title": "Vitaltrainer Module 6",
      "source": "manual",
      "domain": "Business",
      "created_at": "2026-01-02T..."
    }
  ]
}
```

**What happens:**
1. Index Node calls Bridge `/bridge/task/execute`
2. Bridge runs `task add project:HotList +potential +business "Vitaltrainer Module 6"`
3. Taskwarrior returns UUID + task ID
4. UUID saved to `~/AlphaOS-Vault/Door/.door-flow.json`

**Verification:**
```bash
task project:HotList list
cat ~/AlphaOS-Vault/Door/.door-flow.json | jq '.hotlist'
```

### Via hot.fish CLI

```fish
hot "Vitaltrainer Module 6"
```

**What it does:**
1. Creates markdown file: `~/AlphaOS-Vault/Door/1-Potential/20260102-123456--vitaltrainer-module-6.md`
2. Runs `task add project:HotList +hot +potential "Vitaltrainer Module 6"`
3. Gets UUID from Taskwarrior output
4. Annotates task with `file://` link
5. Syncs to Google Drive via rclone (background)

### Via GAS WebApp

**Entry Points:**
- HQ Quick Add panel
- Telegram WebApp (`webapp_handleHotListSubmission`)
- Door Bot: `/hot <idea>` (uses `HOTLIST_BOT_TOKEN`)

**Storage (GAS):**
- Each idea saved as separate markdown file in `Alpha_Door/1-Potential`
- Filename: First 5 words (max 60 chars) + date + underscores
  - Example: `FADARO_Platform_Setup_2025-01-10.md`
- Minimal frontmatter: `date`, `source`, `tags: [potential]`
- UUID added later via GAS trigger (reads `task_export.json` every 15 min)
- `hotlist_index.json` tracks: `hotlist_id ↔ md_id ↔ task_uuid`

**GAS Function:**
```javascript
hotlist_addWeb(idea, user)
  ↓
hotlist_saveToDoorPotential_()  // Save markdown (no UUID yet)
  ↓
hotlist_loadIndex_() / hotlist_writeIndex_()  // Update index
  ↓
bridgeHealth_() → checks Bridge online
  ✅ Bridge online → bridge_taskExecutor_() → POST /bridge/task/execute
  ❌ Bridge offline → hotlist_enqueueTaskOps_() → queued for retry
  ↓
Taskwarrior: task add project:HotList +potential "..."
  ↓
on-exit.alphaos.py: Exports task_export.json INSTANTLY
  ↓
GAS Trigger (every 15 min): hotlist_syncUuidsFromTaskExport()
  ↓
Updates: hotlist_index.json + markdown frontmatter (task_uuid field)
```

**Timing (GAS):**
- Task Export: **INSTANT** (on-exit hook after every task command)
- UUID Sync to Markdown: **Max 15 minutes** (GAS trigger)

---

## Phase 2: PLAN (Door War)

**Purpose:** Select ONE Domino Door using Eisenhower Matrix (Q2: Important + Not Urgent).

### Eisenhower Matrix

**Importance Score (0-10):**
- Business/career tags: +3
- Health/body tags: +3
- Relationship/balance tags: +2
- Goal/vision keywords: +2
- Priority ≥ 3: +2

**Urgency Score (0-10):**
- Urgent tag or "!": +3
- Priority ≥ 4: +2
- Age > 7 days: +1
- Age > 14 days: +2

**Quadrants:**
- **Q1:** Important + Urgent → Crisis (do immediately)
- **Q2:** Important + Not Urgent → **DOMINO DOORS** ← Target
- **Q3:** Not Important + Urgent → Distraction (delegate/minimize)
- **Q4:** Not Important + Not Urgent → Waste (eliminate)

### Node.js API

**POST `/api/door/doorwar`**

```bash
curl -X POST http://127.0.0.1:8799/api/door/doorwar \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "Business"
  }'
```

**Response:**
```json
{
  "ok": true,
  "doorwar": {
    "door_task_uuid": "i9j0k1l2-m3n4-5678-opqr-st9012345678",
    "door_task_id": "43",
    "hotlist_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "selected_title": "Vitaltrainer Module 6",
    "domain": "Business",
    "reasoning": "Q2 - Importance: 5/10, Urgency: 0/10",
    "created_at": "2026-01-02T..."
  },
  "evaluated": [...],  // All Hot List items with scores
  "selected": {...},   // Selected item details
  "path": "/home/alpha/AlphaOS-Vault/Door/2-Plan/Door_War_2026-01-02.md"
}
```

**What happens:**
1. Load Hot List from `.door-flow.json` (with UUIDs)
2. Evaluate each item with Eisenhower Matrix
3. Auto-recommend highest Q2 item
4. Create Door task via Bridge:
   ```
   task add project:"<DoorName>" +door +plan +business \
     "Door: <DoorName>" \
     depends:a1b2c3d4-...
   ```
5. Save Door UUID to `.door-flow.json`
6. Export markdown to `~/AlphaOS-Vault/Door/2-Plan/`

### GAS Implementation

**Entry Points:**
- Door Centre UI: `getPotentialHotIdeas()` lists .md from `1-Potential`
- `doorMovePotentialToPlan(ids)` moves selected files to `2-Plan`

**Flow (GAS):**
1. List Potential ideas via `getPotentialHotIdeas`
2. Move to Plan via `doorMovePotentialToPlan`
3. (Optional) Create Door task via Bridge with `+plan`, `project:DoorWar`, depends on Hotlist UUID
4. Priority mapping: `q1=H`, `q2=M`, `q3=L`, `q4=none`

**Open Items (GAS):**
- Full Eisenhower scoring not yet implemented in GAS (can reuse Node.js logic)
- Domain detection from file metadata
- Optional markdown summary in `2-Plan`

**Verification:**
```bash
task 43 info
# Check depends: field shows Hot List UUID

task a1b2c3d4-... info
# Should show "Blocked by: Door: Vitaltrainer Module 6"
```

---

## Phase 3: PRODUCTION (War Stack + Hit List)

**Purpose:** Execute 4 Hits from War Stack via Taskwarrior.

### War Stack Structure

**4 Hits:** FACT → OBSTACLE → STRIKE → RESPONSIBILITY

**Example Hit:**
```markdown
### Hit 1

- **FACT:** Module 6 content must be studied by Jan 15
- **OBSTACLE:** No structured study routine
- **STRIKE:** Study 1 hour daily from 9-10am
- **RESPONSIBILITY:** Disciplined Student
```

### Node.js API

**POST `/api/door/export`**

```bash
curl -X POST http://127.0.0.1:8799/api/door/export \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "...",  // Complete War Stack markdown
    "sessionId": "WS-2026-01-02",
    "createTasks": true
  }'
```

**Response:**
```json
{
  "ok": true,
  "path": "/home/alpha/AlphaOS-Vault/Door/War-Stacks/2026-01-02_Vitaltrainer-Module-6.md",
  "parsed": {
    "title": "Vitaltrainer Module 6",
    "domain": "Business",
    "hit_count": 4
  },
  "tasks": {
    "door_uuid": "i9j0k1l2-...",
    "door_task_id": "43",
    "profit_uuid": "q7r8s9t0-...",
    "profit_task_id": "48",
    "hits": [
      {"uuid": "u1v2w3x4-...", "task_id": "44", "hit_index": 1, "title": "..."},
      {"uuid": "y5z6a7b8-...", "task_id": "45", "hit_index": 2, "title": "..."},
      {"uuid": "c9d0e1f2-...", "task_id": "46", "hit_index": 3, "title": "..."},
      {"uuid": "g3h4i5j6-...", "task_id": "47", "hit_index": 4, "title": "..."}
    ]
  },
  "rclone": {...}
}
```

**What happens:**
1. Parse War Stack markdown (extract hits, domain, title)
2. Create 4 Hit tasks via Bridge:
   ```
   task add project:"<DoorName>" +hit +production +business \
     "Hit 1: Module 6 content must be studied by Jan 15" \
     due:today+1d wait:+1d

   task add project:"<DoorName>" +hit +production +business \
     "Hit 2: Practice teaching demo required" \
     due:today+2d wait:+2d

   # ... Hit 3 & 4
   ```
3. Create Door task (if doesn't exist) or use existing from Door War
4. Wire Door dependencies:
   ```
   task <door_uuid> modify depends:u1v2w3x4-...,y5z6a7b8-...,c9d0e1f2-...,g3h4i5j6-...
   ```
5. Create Profit task:
   ```
   task add project:"<DoorName>" +profit +business \
     "Profit: <DoorName>" \
     depends:<door_uuid> wait:+5d
   ```
6. Update markdown with UUIDs (frontmatter + `## Taskwarrior` section)
7. Save to `.door-flow.json`

### GAS Implementation

**War Stack Concept & Flow:**

War Stack is NOT just a task payload generator - it's a guided sequence of rooms forcing clarity and commitment before execution.

**Phases (Rooms):**
1. **Door** - Define Domino Door (title + outcome), inputs: Title, Domino Door, Domain, Subdomain
2. **Trigger / Narrative** - Why this Door, why now (Trigger, Narrative, Validation, Impact, Consequences)
3. **Hits (4 Rooms)** - Define 4 decisive Hits (Fact/Obstacle/Strike/Responsibility per Hit, all 4 required)
4. **Insights & Lessons** - Reflection for future-proofing execution
5. **Commit & Export** - Finalize, generate markdown + task payloads

**UX Rules:**
- Each phase = distinct "room" (full panel step, not giant form)
- Next step unlocked only when required fields filled
- Draft persists on blur/step change (no manual save)
- Final submit clears draft, shows confirmation ("War Stack locked in")

**Entry Points (GAS):**
- HQ War Stack panel → `saveDoorEntry` with `tool = 'warstack'`
- Direct ingestion: `door_ingestWarStack_(markdown, sessionId)`
- Task queue: tasks queued and executed via `bridge_taskExecutor_`

**Parsing & Tasks:**
- `doorParseWarStackHits` extracts Hits from markdown
- `door_buildWarStackTasks_` builds tasks:
  - Hits: tags `+hit +production +door +<domain>`, due today+1..4, wait +1..4
  - Door: description = War Stack title, tags `+production +<domain>`, depends on all Hits, project = Domino Door
  - Profit: tags `+profit +<domain>`, wait +5d, depends on Door, project = Domino Door
- `door_updateWarStackTaskwarriorUuids_` updates markdown with UUIDs + Taskwarrior section and frontmatter

**Storage / Drafts (GAS):**
- Drafts: `0-Drafts/WarStack_Draft_<session>.json` (save/load/clear)
- Draft synced to Bridge at `/bridge/warstack/draft` (enables Python bot `/resume`)
- Final markdown: `3-Production/` (or legacy `War-Stacks/`)
- Task execution: if Bridge offline, tasks queued and flushed later; UUIDs injected when results return
- Background scan: `door_scanWarStacksForTasks_` can enqueue tasks for new War Stack markdowns

**Markdown Structure (Required):**
- Frontmatter: `taskwarrior_door_uuid`, `taskwarrior_profit_uuid`, `taskwarrior_hits[]`
- Sections: Door details, Trigger/Narrative/Validation/Impact/Consequences, 4 Hits, Insights/Lessons, Taskwarrior UUID section (auto-injected)

**Telegram (GAS):**
- Controlled by Script Prop `WARSTACK_TELEGRAM=1`
- Token from `WARSTACK_BOT_TOKEN` (fallback TELEGRAM_BOT_TOKEN/BOT_TOKEN)
- `chat_id` from `CHAT_ID`
- Splits long markdown into chunks and sends all parts

**Updated Markdown:**
```markdown
---
domain: Business
taskwarrior_door_uuid: i9j0k1l2-...
taskwarrior_profit_uuid: q7r8s9t0-...
taskwarrior_hits:
  - uuid: u1v2w3x4-...
    hit_index: 1
  - uuid: y5z6a7b8-...
    hit_index: 2
  - uuid: c9d0e1f2-...
    hit_index: 3
  - uuid: g3h4i5j6-...
    hit_index: 4
---

# WAR STACK - Vitaltrainer Module 6

[... original content ...]

## Taskwarrior

War Stack Tasks (UUIDs):

- Door: `i9j0k1l2-...` (43)
- Hit 1: `u1v2w3x4-...` (44) — Module 6 content must be studied by Jan 15
- Hit 2: `y5z6a7b8-...` (45) — Practice teaching demo required
- Hit 3: `c9d0e1f2-...` (46) — Reflection essay (2000 words) due Jan 20
- Hit 4: `g3h4i5j6-...` (47) — Final assessment Jan 22
- Profit: `q7r8s9t0-...` (48)
```

**Verification:**
```bash
task project:"Vitaltrainer Module 6" list

# Expected 6 tasks:
# 43 Door (blocked until 44,45,46,47 done)
# 44-47 Hits (due Mon-Thu, wait +1..4d)
# 48 Profit (depends on 43, wait +5d)

task 43 _get depends
# Expected: 44,45,46,47 (comma-separated)

task 48 _get depends
# Expected: 43
```

### taskopen Integration

```bash
# Open War Stack markdown in editor
taskopen 44  # Opens Hit 1 task

# taskopen looks for annotation: file://...
# Or creates note: ~/.task/notes/u1v2w3x4-....md
```

---

## Phase 4: PROFIT (Reflection)

**Purpose:** Review achieved doors, extract learnings.

### Node.js API

**POST `/api/door/profit`**

```bash
curl -X POST http://127.0.0.1:8799/api/door/profit \
  -H "Content-Type: application/json" \
  -d '{
    "door_uuid": "i9j0k1l2-...",
    "reflection": "Module 6 certification achieved! Key learning: Daily structure works better than cramming.",
    "achieved_at": "2026-01-22T..."
  }'
```

**What happens:**
1. Mark Profit task as done: `task q7r8s9t0-... done`
2. Annotate with reflection: `task q7r8s9t0-... annotate "Module 6 certification achieved! ..."`
3. Export to `~/AlphaOS-Vault/Door/4-Profit/2026-01-22_Vitaltrainer-Module-6.md`
4. Save to `.door-flow.json`

### GAS Implementation

**Entry Points:**
- Profit panel in Door Centre calling `door_saveProfitJson_`
- Direct GAS call to `door_saveProfitJson_(data)`

**Storage (GAS):**
- JSON in `Alpha_Door/4-Profit` via `door_saveProfitJson_`
- Filename: `door_profit_<date>.json`
- (Future) Markdown export can be added

**JSON Structure:**
```json
{
  "date": "YYYY-MM-DD",
  "week": "YYYY-WWW",
  "door_opened": true,
  "door_obstacle": "optional text if door_opened = false",
  "hits": [
    { "hit": "Hit 1", "done": true, "notes": "" }
  ],
  "done": ["other completed tasks..."],
  "insight": "string",
  "lesson": "string",
  "score": {
    "big_rocks_total": 4,
    "big_rocks_done": 3,
    "execution_percent": 75
  }
}
```

**Taskwarrior Completion Flow (optional):**
- Find Profit task for current Door (by UUID in War Stack frontmatter or by tag `+profit` + project)
- Mark done in Taskwarrior via Bridge
- Annotate with summary line (insight + lesson)
- (Current Bridge supports `task modify` only; done/annotation require bridge upgrade)

**Open Items (GAS):**
- Hook into Taskwarrior: mark Profit task done + annotate reflection
- Optional Markdown export in addition to JSON
- Link Profit view to War Stack/Hit completion for context

---

## Node.js Implementation

### Entry Points

**Web UI:**
- `http://127.0.0.1:8799/door` (Index Node redirect)

**Backend:**
- `index-node/server.js`

### Storage (Node.js)

**Vault Paths:**
- Root: `~/AlphaOS-Vault/Door`
- Hot List → `1-Potential`
- Door War → `2-Plan`
- War Stack → `War-Stacks` (legacy) or `3-Production`
- Hit List → `3-Production`
- Profit → `4-Profit`

**Tracking File:**
- `.door-flow.json` - Taskwarrior UUIDs for all phases

### API Endpoints (Node.js)

**Hot List:**
- `GET /api/door/hotlist` - List Hot List items
- `POST /api/door/hotlist` - Add Hot List items

**Door War:**
- `POST /api/door/doorwar` - Run Eisenhower Matrix + select Door

**War Stack:**
- `POST /api/door/export` - Export War Stack + create tasks
- `POST /api/door/warstack/start` - Start conversational flow
- `POST /api/door/warstack/answer` - Answer War Stack questions
- `GET /api/door/warstack/:id` - Get War Stack session

**Blueprints:**
- `GET /api/door/chapters?source=blueprints|alphaos` - Get Elliott Hulse chapters

**Profit:**
- `POST /api/door/profit` - Save Profit reflection

### Environment Variables (Node.js)

```bash
DOOR_FLOW_PATH=~/AlphaOS-Vault/Door/.door-flow.json
DOOR_HITS_TICKTICK=1          # Push hits to TickTick
DOOR_HITS_TAGS=door,hit,production
```

---

## GAS Implementation

### Entry Points

**UI:**
- `gas/Door_Index.html` (inline in HQ)
- `gas/Door_Client.html` (client logic)

**Backend:**
- `gas/door.gs` (main logic)
- `gas/hotlist.gs` (Hot List functions)
- `gas/door_warstack.gs` (War Stack generator)

### Storage (GAS)

**Drive Root:**
- `Alpha_Door` (auto-created if missing)

**Folders:**
- `0-Drafts` - War Stack drafts (JSON + markdown)
- `1-Potential` - Hot List ideas (individual markdown files)
- `2-Plan` - Door War selections
- `3-Production` - War Stacks + Hit Lists
- `4-Profit` - Profit reflections (JSON + optional markdown)

**Logsheet:**
- `Alpha_Door_Logsheet` (Google Sheet for stats)

### API Functions (GAS)

**Door Core:**
- `saveDoorEntry(payload)` - Writes markdown into correct phase folder
- `getPotentialHotIdeas()` - Reads `1-Potential` for Door War backlog
- `listWarStackHits()` - Parses War Stack hits for Hit List
- `door_getWarStackStats()` - Feeds HQ dashboard counters
- `door_saveProfitJson_(data)` - Writes Profit JSON in `4-Profit`

**Hot List:**
- `hotlist_addWeb(idea, user)` - Entry point for all Hot List adds
- `hotlist_saveToDoorPotential_()` - Saves individual markdown file
- `hotlist_loadIndex_() / hotlist_writeIndex_()` - Manages `hotlist_index.json`
- `hotlist_syncToTickTick_()` - Optional TickTick sync (project from `HOTLIST_TICKTICK_PROJECT_ID`)
- `hotlist_syncUuidsFromTaskExport()` - Reads `task_export.json`, matches by description, updates UUIDs
- `hotlist_setupUuidSyncTrigger()` - Creates 15-minute trigger for UUID sync
- `hotlist_updateMarkdownWithUuid_(fileId, uuid)` - Writes UUID to frontmatter

**War Stack:**
- `door_ingestWarStack_(payload)` - Via webhook `kind=warstack_complete` (Python bot) or inline submit
- `door_buildWarStackTasks_()` - Builds Hit/Door/Profit task payloads
- `door_updateWarStackTaskwarriorUuids_()` - Updates markdown with UUIDs
- `doorParseWarStackHits()` - Extracts hits from markdown
- `door_scanWarStacksForTasks_()` - Background scan to enqueue tasks for new War Stacks

**Door War:**
- `doorMovePotentialToPlan(ids)` - Move selected items from `1-Potential` to `2-Plan`

**Task Queue:**
- `door_enqueueTaskOps_()` - Stores tasks in `DOOR_TASK_QUEUE` (Script Prop)
- `door_flushTaskOps_()` - POSTs to `/bridge/task/execute`, updates War Stack markdown with UUIDs
- `door_setupTaskQueueTrigger_()` - Creates 5-minute trigger

### Script Properties (GAS)

**Drive & Sheets:**
- `DOOR_DRIVE_FOLDER_ID` - Door Centre Drive folder
- `DOOR_LOG_SHEET_ID` - Door stats sheet

**Bridge:**
- `AOS_BRIDGE_URL` (canonical, includes `/bridge`) - Bridge API base URL
- Legacy fallbacks: `BRIDGE_URL`, `LAPTOP_WEBHOOK_URL`, `LAPTOP_URL`
- `AOS_BRIDGE_TOKEN` / `BRIDGE_TOKEN` - Optional auth token
- `WARSTACK_USER_ID` - User ID for War Stack drafts

**TickTick:**
- `TICKTICK_TOKEN` - TickTick API token
- `TICKTICK_INBOX_PROJECT_ID` - TickTick inbox
- `HOTLIST_TICKTICK_PROJECT_ID` - Hot List TickTick project
- `DOOR_TICKTICK_PROJECT_POTENTIAL` - Potential phase project
- `DOOR_TICKTICK_PROJECT_PLAN` - Plan phase project
- `DOOR_TICKTICK_PROJECT_PRODUCTION` - Production phase project
- `DOOR_TICKTICK_PROJECT_PROFIT` - Profit phase project

**Telegram:**
- `HOTLIST_BOT_TOKEN` - Hot List Telegram bot (optional)
- `WARSTACK_BOT_TOKEN` - War Stack Telegram bot (optional)
- `TELEGRAM_BOT_TOKEN` / `BOT_TOKEN` - Fallback bot token
- `CHAT_ID` - Telegram chat ID
- `WARSTACK_TELEGRAM` - Set to `1` to enable War Stack Telegram push

**Task Export:**
- `AOS_TASK_EXPORT_FILE_ID` - task_export.json file ID (auto-set on first read)
- `AOS_TASK_EXPORT_CACHE_ID` - task_export_cache.json file ID (fallback snapshot)

### GAS Setup (Run Once)

**Hot List UUID Sync Trigger:**
```javascript
hotlist_setupUuidSyncTrigger()
// Creates trigger: Every 15 minutes
// Syncs UUIDs from task_export.json to Hot List markdown files
```

**Task Queue Trigger:**
```javascript
door_setupTaskQueueTrigger_()
// Creates trigger: Every 5 minutes
// Flushes queued tasks to Bridge
```

**Task Export Snapshot Cache (optional):**
```javascript
setupTaskExportSnapshotTrigger()
// Creates trigger: Every 6 hours
// Creates cache copy of task_export.json
```

### GAS Notes

**Hot List UUID Sync Flow:**
```
User: /hot "FADARO Platform Setup"
  ↓
GAS: hotlist_addWeb()
  ↓
1. Save markdown: FADARO_Platform_Setup_2025-01-10.md (no UUID yet)
2. Save to hotlist_index.json (no UUID yet)
3. Sync to TickTick (tag:hot)
  ↓
bridgeHealth_() → checks http://laptop:8080/health
  ✅ Bridge online → bridge_taskExecutor_() → POST /bridge/task/execute
  ❌ Bridge offline → hotlist_enqueueTaskOps_() → queued for retry
  ↓
Taskwarrior: task add project:HotList +potential "FADARO Platform Setup"
  ↓
on-add.alphaos.py: Sends Telegram notification
  ↓
on-exit.alphaos.py: INSTANT export (runs after EVERY task command)
  ↓
Writes:
  ~/.local/share/alphaos/task_export.json
  AlphaOS-Vault/.alphaos/task_export.json (if AOS_TASK_EXPORT_COPY_TO_VAULT=1)
  ↓
GAS Trigger: hotlist_syncUuidsFromTaskExport() (every 15 minutes)
  ↓
1. Reads task_export.json from GDrive (via aos_loadTaskExportSafe_)
2. Filters: project:HotList tasks
3. Matches with hotlist_index.json by description
4. Updates:
   - hotlist_index.json (task_uuid field)
   - Markdown frontmatter (task_uuid: abc123...)
```

**Timing (GAS):**
- Task Export: **INSTANT** (on-exit hook after every `task` command)
- UUID Sync to Markdown: **Max 15 minutes** (GAS trigger)

**Draft Persistence:**
- Drafts saved to `0-Drafts/WarStack_Draft_<session>.json`
- Draft pushed to Bridge `/bridge/warstack/draft` for Python bot `/resume`

**Independence:**
- GAS is source of truth for War Stack data
- Laptop/Python bot only resumes drafts via Bridge, does not own final data

---

## Data Flow

### Complete 4P Flow with UUIDs

```
┌─────────────────────────────────────────────────────────────┐
│ POTENTIAL (Hot List)                                        │
│                                                             │
│ POST /api/door/hotlist (or hot.fish, or GAS)              │
│     ↓                                                       │
│ Bridge: task add project:HotList +potential                │
│     ↓                                                       │
│ Taskwarrior UUID: a1b2c3d4-...                             │
│     ↓                                                       │
│ Save to .door-flow.json (Node) or hotlist_index.json (GAS) │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PLAN (Door War)                                             │
│                                                             │
│ POST /api/door/doorwar (or GAS doorMovePotentialToPlan)   │
│     ↓                                                       │
│ Eisenhower Matrix evaluation                               │
│     ↓                                                       │
│ Select Q2 Domino Door                                      │
│     ↓                                                       │
│ Bridge: task add project:"Vitaltrainer Module 6" +door +plan depends:a1b2c3d4-  │
│     ↓                                                       │
│ Door UUID: i9j0k1l2-...                                    │
│     ↓                                                       │
│ Save to .door-flow.json (Node) or index (GAS)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ War Stack Creation (Inquiry)                                │
│                                                             │
│ User creates markdown (Telegram Bot, Manual, CLI, GAS)     │
│     ↓                                                       │
│ POST /api/door/export (or GAS door_ingestWarStack_)       │
│     ↓                                                       │
│ Parse markdown → Extract 4 Hits                            │
│     ↓                                                       │
│ Bridge: Create 4 Hit tasks (today+1..4d, wait:+1..4d)      │
│     ↓                                                       │
│ Hit UUIDs: u1v2w3x4-..., y5z6a7b8-..., c9d0e1f2-..., ...   │
│     ↓                                                       │
│ Wire Door depends: task i9j0k1l2-... modify depends:...    │
│     ↓                                                       │
│ Create Profit task: depends:i9j0k1l2-... wait:+5d          │
│     ↓                                                       │
│ Profit UUID: q7r8s9t0-...                                  │
│     ↓                                                       │
│ Update markdown with UUIDs (frontmatter + section)         │
│     ↓                                                       │
│ Save to .door-flow.json (Node) or index (GAS)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION (Hit List)                                       │
│                                                             │
│ task project:"Vitaltrainer Module 6" +hit list                            │
│     ↓                                                       │
│ User completes Hits Mon-Thu                                │
│     ↓                                                       │
│ task 44 done, task 45 done, task 46 done, task 47 done    │
│     ↓                                                       │
│ Door task unblocks automatically                           │
│     ↓                                                       │
│ task 43 done (Door completed)                              │
│     ↓                                                       │
│ Profit task unblocks after wait:+5d                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PROFIT (Reflection)                                         │
│                                                             │
│ POST /api/door/profit (or GAS door_saveProfitJson_)       │
│     ↓                                                       │
│ task 48 done                                                │
│     ↓                                                       │
│ task 48 annotate "Reflection..."                           │
│     ↓                                                       │
│ Export reflection markdown (Node) or JSON (GAS)            │
│     ↓                                                       │
│ Save to .door-flow.json (Node) or index (GAS)             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Hot List

**Node.js:**
- `POST /api/door/hotlist` - Add items: `{ items: [...], source, domain }`
- `GET /api/door/hotlist` - List items with UUIDs

**GAS:**
- `hotlist_addWeb(idea, user)` - Add single idea
- `getPotentialHotIdeas()` - List all Hot List items

### Door War

**Node.js:**
- `POST /api/door/doorwar` - Run Eisenhower: `{ domain, choice (optional) }`

**GAS:**
- `getPotentialHotIdeas()` - List candidates
- `doorMovePotentialToPlan(ids)` - Move to Plan

### War Stack Export

**Node.js:**
- `POST /api/door/export` - Export + create tasks: `{ markdown, sessionId, createTasks }`

**GAS:**
- `door_ingestWarStack_(payload)` - Save War Stack + create tasks
- `door_buildWarStackTasks_()` - Build task payloads
- `door_updateWarStackTaskwarriorUuids_()` - Update markdown with UUIDs

### Profit

**Node.js:**
- `POST /api/door/profit` - Save reflection: `{ door_uuid, reflection, achieved_at }`

**GAS:**
- `door_saveProfitJson_(data)` - Save Profit JSON

### Bridge Endpoints

**All Platforms:**
- `POST /bridge/task/execute` - Create tasks: `{ tasks: [{ description, tags, project, due, wait, depends }] }`
- `POST /bridge/task/modify` - Modify task: `{ uuid, updates: { tags_add, tags_remove, depends, wait } }`

---

## Testing

**See:** [TESTING_TASKWARRIOR_UUID.md](TESTING_TASKWARRIOR_UUID.md)

**Quick Smoke Test (Node.js):**
```bash
# 1. Create Hot List
curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -d '{"items":["Test Item"],"domain":"Business"}'

# 2. Verify Taskwarrior
task project:HotList list

# 3. Run Door War
curl -X POST http://127.0.0.1:8799/api/door/doorwar -d '{"domain":"Business"}'

# 4. Verify Door task
task +plan list

# 5. Check depends
task <door_uuid> _get depends
```

**Quick Smoke Test (GAS):**
```javascript
// 1. Add Hot List idea
hotlist_addWeb("Test GAS Hot List", {username: "test"})

// 2. Verify Drive
// Check Alpha_Door/1-Potential for new markdown file

// 3. Verify Taskwarrior (via Bridge)
// Check task_export.json after 15 minutes for UUID

// 4. Move to Plan
doorMovePotentialToPlan(["<file_id>"])

// 5. Create War Stack
door_ingestWarStack_({markdown: "...", sessionId: "test"})
```

---

## Comparison: Old vs New System

| Aspect | Old (Custom GUID) | New (Taskwarrior UUID) |
|--------|-------------------|------------------------|
| **ID System** | Custom GUID | Taskwarrior UUID |
| **Source of Truth** | `.door-flow.json` | Taskwarrior |
| **Sync** | Manual | Automatic (hooks) |
| **taskopen** | Needs custom setup | Works out-of-box |
| **TickTick** | Manual sync | Via hooks |
| **Obsidian** | Manual | Via task-obsidian plugin |
| **Dependency Tracking** | File-based | Native Taskwarrior |
| **Multi-Tool** | Complex | Simple |
| **GAS Integration** | Custom IDs | task_export.json + UUIDs |

---

## Legacy Notes

### Door Client Audit (2026-01-04)

**Scope:** `gas/Door_Client.html` after Door modularization

**Issues Found:**
- Duplicate `escapeHtml` definition (shadowing risk, inconsistent escaping)
- Obsolete Door War flow `selectDoor()` expected `#doorwarinput` element (not in panel)
- Orphaned UI flow: `renderDoorWarHotPanel()` and `insertSelectedHotIdeasToDoorWar()` expected `#doorwar-hot-cache` and checkbox UI (removed)

**Cleanup:**
- Removed: `selectDoor()`, `renderDoorWarHotPanel()`, `insertSelectedHotIdeasToDoorWar()`, duplicate `escapeHtml`

**Note:** If old Door War textarea flow or Hot candidate panel is reactivated, helper functions must be reintroduced.

---

## Related Documentation

- [TESTING_TASKWARRIOR_UUID.md](TESTING_TASKWARRIOR_UUID.md) - Complete test suite
- [bridge/README.md](../bridge/README.md) - Bridge API documentation
- [python-warstack-bot/README.md](../python-warstack-bot/README.md) - Telegram War Stack Bot
- [scripts/war-stack/README.md](../scripts/war-stack/README.md) - CLI automation
- [scripts/ticktick/README.md](../scripts/ticktick/README.md) - TickTick integration
- [gas/README.md](../gas/README.md) - GAS HQ documentation

---

**Last Updated:** 2026-01-10
**System Status:** ✅ PRODUCTION READY (Multi-Platform Door Centre - Node.js + GAS)
