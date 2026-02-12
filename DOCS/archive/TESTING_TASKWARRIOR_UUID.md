# Taskwarrior UUID Integration Testing

**Date:** 2026-01-02
**Feature:** Door Centre with Taskwarrior UUID System
**Scope:** Hot List → Door War → War Stack → Hit Tasks (via Bridge)

---

## Prerequisites

**Required Services:**
```bash
# Bridge must be running
systemctl --user status alphaos-bridge.service
# Expected: Active (running)

# Index Node must be running
systemctl --user status alphaos-index.service
# Expected: Active (running)

# Environment variables
echo $AOS_BRIDGE_URL
# Expected: http://127.0.0.1:8080 (or Tailscale IP)

echo $AOS_TASK_EXECUTE
# Expected: 1 (task execution enabled in Bridge)
```

---

## Test 1: Hot List → Taskwarrior Tasks

### 1.1 Create Hot List Items

```bash
curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -H "Content-Type: application/json" \
  -d '{
    "items": ["Vitaltrainer Module 6 fertigstellen", "FADARO Content Calendar erstellen"],
    "source": "test",
    "domain": "Business"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "items": [
    {
      "task_uuid": "a1b2c3d4-...",
      "task_id": "42",
      "title": "Vitaltrainer Module 6 fertigstellen",
      "source": "test",
      "domain": "Business",
      "created_at": "2026-01-02T..."
    },
    {
      "task_uuid": "e5f6g7h8-...",
      "task_id": "43",
      "title": "FADARO Content Calendar erstellen",
      "source": "test",
      "domain": "Business",
      "created_at": "2026-01-02T..."
    }
  ]
}
```

**Verification:**
```bash
# Check Taskwarrior
task project:HotList list

# Expected:
# ID  Description                           Tags              Project
# 42  Vitaltrainer Module 6 fertigstellen  potential,business HotList
# 43  FADARO Content Calendar erstellen    potential,business HotList

# Check .door-flow.json
cat ~/AlphaOS-Vault/Door/.door-flow.json | jq '.hotlist'

# Expected: Array with task_uuid entries
```

**Status:** ☐ PASS / ☐ FAIL

**Notes:**
_[Test results here]_

---

### 1.2 Verify UUID Persistence

```bash
# Get Hot List via API
curl http://127.0.0.1:8799/api/door/hotlist | jq

# Expected: Same UUIDs as Taskwarrior tasks
```

**Status:** ☐ PASS / ☐ FAIL

---

## Test 2: Door War → Door Task with Depends

### 2.1 Run Door War Selection

```bash
curl -X POST http://127.0.0.1:8799/api/door/doorwar \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "Business"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "doorwar": {
    "door_task_uuid": "i9j0k1l2-...",
    "door_task_id": "44",
    "hotlist_uuid": "a1b2c3d4-...",
    "selected_title": "Vitaltrainer Module 6 fertigstellen",
    "domain": "Business",
    "reasoning": "Q2 - Importance: 5/10, Urgency: 0/10",
    "created_at": "2026-01-02T..."
  },
  "evaluated": [...],
  "selected": {...},
  "path": "/home/alpha/AlphaOS-Vault/Door/2-Plan/Door_War_2026-01-02.md"
}
```

**Verification:**
```bash
# Check Taskwarrior Door task
task 44 info

# Expected:
# Description: Door: Vitaltrainer Module 6 fertigstellen
# Project:     Vitaltrainer Module 6 fertigstellen
# Tags:        door plan business
# Depends:     a1b2c3d4-... (Hot List task UUID)

# Verify dependency graph
task 44 _get depends

# Expected: UUID of Hot List task
```

**Status:** ☐ PASS / ☐ FAIL

**Notes:**
_[Test results here]_

---

## Test 3: War Stack Export → Hit Tasks + Depends

### 3.1 Create Test War Stack Markdown

```bash
cat > /tmp/test_warstack.md <<'EOF'
---
domain: Business
---

# WAR STACK - Vitaltrainer Module 6

**Domain:** Business

## 🚪 The Domino Door

Vitaltrainer Module 6 certification opens doors to credibility and teaching authority.

### Hit 1

- **FACT:** Module 6 content must be studied by Jan 15
- **OBSTACLE:** No structured study routine
- **STRIKE:** Study 1 hour daily from 9-10am
- **RESPONSIBILITY:** Disciplined Student

### Hit 2

- **FACT:** Practice teaching demo required
- **OBSTACLE:** No practice partners
- **STRIKE:** Record 3 practice videos by Jan 18
- **RESPONSIBILITY:** Confident Teacher

### Hit 3

- **FACT:** Reflection essay (2000 words) due Jan 20
- **OBSTACLE:** Writer's block
- **STRIKE:** Write 500 words daily in General's Tent
- **RESPONSIBILITY:** Thoughtful Writer

### Hit 4

- **FACT:** Final assessment Jan 22
- **OBSTACLE:** Test anxiety
- **STRIKE:** Practice exam questions daily
- **RESPONSIBILITY:** Calm Test-Taker
EOF
```

### 3.2 Export War Stack

```bash
curl -X POST http://127.0.0.1:8799/api/door/export \
  -H "Content-Type: application/json" \
  --data-binary @- <<'EOF'
{
  "markdown": "$(cat /tmp/test_warstack.md)",
  "sessionId": "TEST-2026-01-02",
  "createTasks": true
}
EOF
```

**Expected Response:**
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
    "door_uuid": "m3n4o5p6-...",
    "door_task_id": "45",
    "profit_uuid": "q7r8s9t0-...",
    "profit_task_id": "50",
    "hits": [
      {"uuid": "u1v2w3x4-...", "task_id": "46", "hit_index": 1, "title": "Module 6 content must be studied by Jan 15"},
      {"uuid": "y5z6a7b8-...", "task_id": "47", "hit_index": 2, "title": "Practice teaching demo required"},
      {"uuid": "c9d0e1f2-...", "task_id": "48", "hit_index": 3, "title": "Reflection essay (2000 words) due Jan 20"},
      {"uuid": "g3h4i5j6-...", "task_id": "49", "hit_index": 4, "title": "Final assessment Jan 22"}
    ]
  },
  "rclone": {...}
}
```

**Verification:**
```bash
# Check Taskwarrior tasks
task project:"Vitaltrainer Module 6" list

# Expected 6 tasks:
# - 4 Hit tasks (46-49): tags: +hit +production +business +warstack, due: today+1..4d, wait: +1..4d
# - 1 Door task (45): tags: +door +plan +business +warstack, depends: hit UUIDs
# - 1 Profit task (50): tags: +door +profit +business +warstack, depends: Door UUID, wait: +5d

# Verify Hit 1 task
task 46 info
# Expected:
# Description: Hit 1: Module 6 content must be studied by Jan 15
# Project:     Vitaltrainer Module 6
# Tags:        hit production business warstack
# Due:         today+1d
# Wait:        +1d

# Verify Door task dependencies
task 45 _get depends
# Expected: 4 Hit UUIDs (comma-separated)

# Verify Profit task dependency
task 50 _get depends
# Expected: Door UUID

task 50 _get wait
# Expected: +5d

# Check markdown file
cat ~/AlphaOS-Vault/Door/War-Stacks/2026-01-02_Vitaltrainer-Module-6.md
```

**Expected in Markdown:**
```markdown
## Taskwarrior

War Stack Tasks (UUIDs):

- Door: `m3n4o5p6-...` (45)
- Hit 1: `u1v2w3x4-...` (46) — Module 6 content must be studied by Jan 15
- Hit 2: `y5z6a7b8-...` (47) — Practice teaching demo required
- Hit 3: `c9d0e1f2-...` (48) — Reflection essay (2000 words) due Jan 20
- Hit 4: `g3h4i5j6-...` (49) — Final assessment Jan 22
- Profit: `q7r8s9t0-...` (50)
```

**Frontmatter:**
```yaml
---
domain: Business
taskwarrior_door_uuid: m3n4o5p6-...
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
```

**Status:** ☐ PASS / ☐ FAIL

**Notes:**
_[Test results here]_

---

## Test 4: Task Modify Endpoint (Bridge)

### 4.1 Update Task Tags

```bash
curl -X POST http://127.0.0.1:8080/bridge/task/modify \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "u1v2w3x4-...",
    "updates": {
      "tags_add": ["urgent", "critical"],
      "priority": "H"
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "code": 0,
  "stdout": "Modified 1 task.",
  "stderr": "",
  "cmd": "task u1v2w3x4-... modify +urgent +critical priority:H",
  "task_uuid": "u1v2w3x4-..."
}
```

**Verification:**
```bash
task u1v2w3x4-... info
# Expected: Tags include +urgent +critical, Priority: H
```

**Status:** ☐ PASS / ☐ FAIL

---

## Test 5: Complete Flow Integration

### 5.1 End-to-End Test

**Scenario:** Hot List → Door War → War Stack → Taskwarrior → taskopen

```bash
# 1. Create Hot List item
curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -d '{"items":["Test End-to-End Flow"],"domain":"Business"}'
# Note UUID from response

# 2. Run Door War
curl -X POST http://127.0.0.1:8799/api/door/doorwar \
  -d '{"domain":"Business"}'
# Verify Door task created with depends

# 3. Create War Stack (manual markdown)
# 4. Export War Stack
# 5. Verify all 6 tasks in Taskwarrior
# 6. Test taskopen integration
taskopen <hit_uuid>
# Expected: Opens markdown file in editor
```

**Status:** ☐ PASS / ☐ FAIL

---

## Known Issues

### Hot List Object Title Parsing
- **Status:** ✅ FIXED (2026-01-01)
- **Fix:** Object property extraction in server.js lines 1685-1687

### Bridge Task Modify
- **Status:** ✅ IMPLEMENTED (2026-01-02)
- **Endpoint:** POST `/bridge/task/modify`

### Taskwarrior SQLite Access
- **Status:** ✅ FIXED (2025-12-XX)
- **Fix:** ReadWritePaths in systemd service

---

## Performance Metrics

**Average Response Times:**
- Hot List creation: _[ms]_
- Door War selection: _[ms]_
- War Stack export: _[ms]_
- Bridge task execute: _[ms]_

**Resource Usage:**
- Index Node memory: _[MB]_
- Bridge memory: _[MB]_

---

## Regression Tests

**After each deployment, verify:**
1. ☐ Hot List creates Taskwarrior tasks
2. ☐ Door War creates Door task with correct depends
3. ☐ War Stack export creates 6 tasks (4 Hits + Door + Profit)
4. ☐ UUIDs written to markdown (frontmatter + section)
5. ☐ `.door-flow.json` updated with UUIDs
6. ☐ Dependencies wired correctly (Door→Hits, Profit→Door)

---

## Test Coverage

**Covered:**
- ✅ Hot List API (POST/GET)
- ✅ Door War API (Eisenhower evaluation)
- ✅ War Stack export (markdown parsing)
- ✅ Bridge task creation (POST /bridge/task/execute)
- ✅ Bridge task modification (POST /bridge/task/modify)
- ✅ UUID persistence (.door-flow.json)
- ✅ Markdown frontmatter update
- ✅ Dependency wiring

**Not Covered Yet:**
- ☐ TickTick integration (door_uuid_sync.py)
- ☐ War Stack Bot (Telegram conversational flow)
- ☐ GAS fallback (offline mode)
- ☐ taskopen integration (notes)
- ☐ Multi-domain testing (BODY/BEING/BALANCE)

---

**Last Updated:** 2026-01-02
**Next Review:** After first production use
