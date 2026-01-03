# Door Centre Documentation (Taskwarrior UUID System)

**Door Centre** implements the **DOOR Pillar** from AlphaOS using **Taskwarrior UUIDs as source of truth**.

**Updated:** 2026-01-02 (Complete Taskwarrior UUID Integration)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Taskwarrior UUID System](#taskwarrior-uuid-system)
4. [Phase 1: POTENTIAL (Hot List)](#phase-1-potential-hot-list)
5. [Phase 2: PLAN (Door War)](#phase-2-plan-door-war)
6. [Phase 3: PRODUCTION (Hit List)](#phase-3-production-hit-list)
7. [Phase 4: PROFIT (Reflection)](#phase-4-profit-reflection)
8. [Data Flow](#data-flow)
9. [API Reference](#api-reference)
10. [Testing](#testing)

---

## Overview

**Purpose:** Transform chaotic ideas (Hot List) into systematic weekly execution (Hit List) through strategic filtering (Door War) and transformative inquiry (War Stack).

**4P Flow:** Potential → Plan → Production → Profit

**Key Innovation:** **Taskwarrior UUIDs** are the single source of truth, not custom GUIDs or file paths.

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
Index Node API (or hot.fish, or Telegram)
    ↓
Bridge /bridge/task/execute
    ↓
Taskwarrior: task add project:HotList +potential
    ↓
Taskwarrior returns UUID
    ↓
UUID saved to .door-flow.json
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
Door (project:<Domain>, +plan, depends: <hotlist_uuid>)
    ↓
Hits (project:<Domain>, +hit +production, due:today+1..4d, wait:+1..4d)
    ↑ (Door depends on Hits)
    ↓
Profit (project:<Domain>, +profit, depends: <door_uuid>, wait:+5d)
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
task add project:Business +plan +business "Door: Vitaltrainer Module 6" depends:a1b2c3d4-...
# Created task 43
# UUID: i9j0k1l2-m3n4-5678-opqr-st9012345678
```

**3. War Stack Hits:**
```bash
task add project:Business +hit +production +business "Hit 1: Study anatomy" due:today+1d wait:+1d
# Created task 44, UUID: u1v2w3x4-...

task add project:Business +hit +production +business "Hit 2: Practice teaching" due:today+2d wait:+2d
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
task add project:Business +profit +business "Profit: Vitaltrainer Module 6" depends:i9j0k1l2-... wait:+5d
# Created task 48, UUID: q7r8s9t0-...
```

### Task Tags & Projects

| Phase | Tags | Project | Example |
|-------|------|---------|---------|
| **Hot List** | `+potential +<domain>` | `HotList` | `task add project:HotList +potential +business "My idea"` |
| **Door** | `+plan +<domain>` | `<Domain>` | `task add project:Business +plan +business "Door: X"` |
| **Hits** | `+hit +production +<domain>` | `<Domain>` | `task add project:Business +hit +production +business "Hit 1"` |
| **Profit** | `+profit +<domain>` | `<Domain>` | `task add project:Business +profit +business "Profit: X"` |

**Domains:** `business`, `body`, `being`, `balance`

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

### API Endpoint

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
   task add project:Business +plan +business \
     "Door: Vitaltrainer Module 6" \
     depends:a1b2c3d4-...
   ```
5. Save Door UUID to `.door-flow.json`
6. Export markdown to `~/AlphaOS-Vault/Door/2-Plan/`

**Verification:**
```bash
task 43 info
# Check depends: field shows Hot List UUID

task a1b2c3d4-... info
# Should show "Blocked by: Door: Vitaltrainer Module 6"
```

---

## Phase 3: PRODUCTION (Hit List)

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

### API Endpoint

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
   task add project:Business +hit +production +business \
     "Hit 1: Module 6 content must be studied by Jan 15" \
     due:today+1d wait:+1d

   task add project:Business +hit +production +business \
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
   task add project:Business +profit +business \
     "Profit: Vitaltrainer Module 6" \
     depends:<door_uuid> wait:+5d
   ```
6. Update markdown with UUIDs (frontmatter + `## Taskwarrior` section)
7. Save to `.door-flow.json`

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
task project:Business list

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

### API Endpoint

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

---

## Data Flow

### Complete 4P Flow with UUIDs

```
┌─────────────────────────────────────────────────────────────┐
│ POTENTIAL (Hot List)                                        │
│                                                             │
│ POST /api/door/hotlist (or hot.fish)                       │
│     ↓                                                       │
│ Bridge: task add project:HotList +potential                │
│     ↓                                                       │
│ Taskwarrior UUID: a1b2c3d4-...                             │
│     ↓                                                       │
│ Save to .door-flow.json                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PLAN (Door War)                                             │
│                                                             │
│ POST /api/door/doorwar                                     │
│     ↓                                                       │
│ Eisenhower Matrix evaluation                               │
│     ↓                                                       │
│ Select Q2 Domino Door                                      │
│     ↓                                                       │
│ Bridge: task add project:Business +plan depends:a1b2c3d4-  │
│     ↓                                                       │
│ Door UUID: i9j0k1l2-...                                    │
│     ↓                                                       │
│ Save to .door-flow.json                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ War Stack Creation (Inquiry)                                │
│                                                             │
│ User creates markdown (Telegram Bot, Manual, CLI)          │
│     ↓                                                       │
│ POST /api/door/export                                      │
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
│ Save to .door-flow.json                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION (Hit List)                                       │
│                                                             │
│ task project:Business +hit list                            │
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
│ POST /api/door/profit                                      │
│     ↓                                                       │
│ task 48 done                                                │
│     ↓                                                       │
│ task 48 annotate "Reflection..."                           │
│     ↓                                                       │
│ Export reflection markdown                                 │
│     ↓                                                       │
│ Save to .door-flow.json                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Hot List

**POST `/api/door/hotlist`**
- **Input:** `{ items: [...], source: "...", domain: "..." }`
- **Output:** `{ ok, items: [{ task_uuid, task_id, title, ... }] }`
- **Creates:** Taskwarrior tasks via Bridge

**GET `/api/door/hotlist`**
- **Output:** `{ ok, items: [{ task_uuid, ... }] }`
- **Source:** `.door-flow.json`

### Door War

**POST `/api/door/doorwar`**
- **Input:** `{ domain: "Business", choice: "..." (optional) }`
- **Output:** `{ ok, doorwar: { door_task_uuid, hotlist_uuid, ... }, evaluated, selected }`
- **Creates:** Door task with `depends:` on selected Hot List UUID

### War Stack Export

**POST `/api/door/export`**
- **Input:** `{ markdown: "...", sessionId: "...", createTasks: true }`
- **Output:** `{ ok, path, parsed, tasks: { door_uuid, profit_uuid, hits: [...] } }`
- **Creates:** 4 Hits + Door (with depends) + Profit (with depends + wait)
- **Updates:** Markdown with UUIDs (frontmatter + section)

### Profit

**POST `/api/door/profit`**
- **Input:** `{ door_uuid: "...", reflection: "...", achieved_at: "..." }`
- **Output:** `{ ok, profit_entry: { ... } }`
- **Marks:** Profit task as done + annotation

### Bridge Endpoints

**POST `/bridge/task/execute`**
- **Input:** `{ tasks: [{ description, tags, project, due, wait, depends, ... }] }`
- **Output:** `{ ok, results: [{ task_uuid, task_id, ... }] }`

**POST `/bridge/task/modify`**
- **Input:** `{ uuid: "...", updates: { tags_add, tags_remove, depends, wait, ... } }`
- **Output:** `{ ok, stdout, stderr }`

---

## Testing

**See:** [TESTING_TASKWARRIOR_UUID.md](TESTING_TASKWARRIOR_UUID.md)

**Quick Smoke Test:**
```bash
# 1. Create Hot List
curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -d '{"items":["Test Item"],"domain":"Business"}'

# 2. Verify Taskwarrior
task project:HotList list

# 3. Run Door War
curl -X POST http://127.0.0.1:8799/api/door/doorwar -d '{"domain":"Business"}'

# 4. Verify Door task
task project:Business +plan list

# 5. Check depends
task <door_uuid> _get depends
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

---

## Related Documentation

- [TESTING_TASKWARRIOR_UUID.md](TESTING_TASKWARRIOR_UUID.md) - Complete test suite
- [bridge/README.md](bridge/README.md) - Bridge API documentation
- [python-warstack-bot/README.md](python-warstack-bot/README.md) - Telegram War Stack Bot
- [scripts/war-stack/README.md](scripts/war-stack/README.md) - CLI automation
- [scripts/ticktick/README.md](scripts/ticktick/README.md) - TickTick integration

---

**Last Updated:** 2026-01-02
**System Status:** ✅ PRODUCTION READY (Taskwarrior UUID Integration Complete)
