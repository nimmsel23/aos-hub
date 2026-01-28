# Door Centre Refactoring Plan

**Goal:** Implement proper data flow through 4P phases with dedicated JSON/YAML tracking per phase.

**Date:** 2026-01-16
**Status:** 🏗️ In Progress

---

## Current Problems

1. ❌ **Timestamp in filenames** - Unpraktisch, metadata bereits in frontmatter
2. ❌ **hotlist_index.json bleibt voll** - Wird nie geleert, keine Phasen-Trennung
3. ❌ **Keine Quadrant-Tracking** - Door War Sortierung nicht persistiert
4. ❌ **Keine War Stack Metadaten** - War Stacks haben keine strukturierte YAML
5. ❌ **Keine Profit-Tracking** - Kein System für Reflection Phase

---

## NEW Door Flow Architecture

**Design Principle: Hybrid System**
- **JSON Indexes** = Fast queries for GAS/API/Router (lightweight refs)
- **YAML Frontmatter** = Source of truth in markdown files (complete metadata)
- **Sync Pattern:** JSON → references → YAML in .md files

---

### 1-POTENTIAL/ (Hot List - Sammelstelle)

**Files:**
```
hotlist_index.json          ← Index (references to .md files)
a7f2-neue-idee.md           ← Markdown with YAML frontmatter
b3e1-andere-idee.md
```

**hotlist_index.json** (Index only):
```json
{
  "version": "1.0",
  "updated_at": "2026-01-16T14:30:00Z",
  "items": [
    {
      "file": "a7f2-neue-idee.md",
      "tw_uuid": "abc-123",
      "ticktick_id": "tt-456",
      "created": "2026-01-16T14:30:00Z",
      "status": "active"
    }
  ]
}
```

**a7f2-neue-idee.md** (Minimal YAML):
```yaml
---
tw_uuid: abc-123
---

# 🔥 Neue Idee
```

**Why minimal?** Everything else (created, tags, project, etc.) is in Taskwarrior - query via `task _get abc-123.tags`

**Tag Strategy:**
- `hot` tag = Source indicator (created via hot CLI, not TickTick/manual)
- `potential` tag = Workflow phase (1-Potential)
- Both tags live in Taskwarrior, not in markdown frontmatter

**Filename Format:** `{uuid}-{slug}.md`
- 4-char hex UUID prefix (collision prevention)
- Human-readable slug

---

### 2-PLAN/ (Door War - Quadrant Sortierung)

**Files:**
```
q1.json                     ← Index for Quadrant 1
q2.json                     ← Index for Quadrant 2
q3.json                     ← Index for Quadrant 3
q4.json                     ← Index for Quadrant 4
a7f2-neue-idee.md           ← Markdown moved from 1-Potential/ (YAML updated)
```

**Quadrant JSON Structure (Index):**
```json
{
  "version": "1.0",
  "quadrant": 1,
  "label": "Urgent & Important",
  "description": "Do First - Critical & time-sensitive",
  "created_at": "2026-01-16T14:30:00Z",
  "updated_at": "2026-01-16T14:30:00Z",
  "items": [
    {
      "idea": "Neue Idee",
      "file": "a7f2-neue-idee.md",
      "tw_uuid": "abc-123",
      "ticktick_id": "tt-456",
      "selected_at": "2026-01-16T14:30:00Z",
      "door_war_session": "2026-W03",
      "status": "planned",
      "priority": "high",
      "notes": "Optional Door War notes"
    }
  ],
  "stats": {
    "total_items": 1,
    "active_items": 1,
    "completed_items": 0,
    "last_door_war": "2026-01-16T14:30:00Z"
  }
}
```

**Quadrant Descriptions:**
- **Q1 (Urgent & Important):** Do First - Critical & time-sensitive
- **Q2 (Important, Not Urgent):** Schedule - Long-term development (MOST DOORS HERE!)
- **Q3 (Urgent, Not Important):** Delegate - Distractions masquerading as urgent
- **Q4 (Neither):** Eliminate - Time wasters

**Markdown YAML Evolution** (1-Potential → 2-Plan):

**Before (1-Potential/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
---
```

**After (2-Plan/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
quadrant: 2
---
```

**What changed:**
- Added `quadrant: 2` (user selection from Door War)
- Taskwarrior tags updated: `+plan -potential +q2` (via `task abc-123 modify`)
- File moved: `1-Potential/` → `2-Plan/`

**Process:**
1. Door War UI reads `1-Potential/hotlist_index.json`
2. User assigns Quadrants (Q1-Q4)
3. For each selected idea:
   - Move .md file: `1-Potential/` → `2-Plan/`
   - Update YAML frontmatter (quadrant, stage, tags)
   - Add to Quadrant JSON index (`q2.json`)
   - Remove from `hotlist_index.json`
4. Quadrant JSON updated (append pattern)

---

### 3-PRODUCTION/ (War Stack Execution)

**Files:**
```
warstack_index.json         ← Index for active War Stacks
a7f2-neue-idee.md           ← Markdown moved from 2-Plan/ (transformed to War Stack format)
```

**warstack_index.json** (Index):
```json
{
  "version": "1.0",
  "updated_at": "2026-01-16T15:00:00Z",
  "items": [
    {
      "file": "a7f2-neue-idee.md",
      "tw_uuid": "abc-123",
      "quadrant": 2,
      "warstack_created": "2026-01-16T15:00:00Z",
      "hits": [
        {"uuid": "hit-1-uuid", "type": "fact", "status": "pending"},
        {"uuid": "hit-2-uuid", "type": "obstacle", "status": "pending"},
        {"uuid": "hit-3-uuid", "type": "strike", "status": "pending"},
        {"uuid": "hit-4-uuid", "type": "responsibility", "status": "pending"}
      ],
      "status": "in_progress",
      "completed_hits": 0
    }
  ]
}
```

**Markdown YAML Evolution** (2-Plan → 3-Production):

**Before (2-Plan/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
quadrant: 2
---
```

**After (3-Production/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
taskwarrior_door_uuid: door-uuid
taskwarrior_profit_uuid: profit-uuid
taskwarrior_hits:
  - hit_index: 1
    uuid: hit-1-uuid
  - hit_index: 2
    uuid: hit-2-uuid
  - hit_index: 3
    uuid: hit-3-uuid
  - hit_index: 4
    uuid: hit-4-uuid
---

# ⚔️ WAR STACK — Neue Idee

## 🔥 Transformative Inquiry

### Trigger
Finally got fed up with manual process

### Narrative
I'm too busy to automate this

### Validation
Manual work costs more time than automation setup

### Impact
Hours wasted weekly, growing frustration

---

## 🎯 4 Hits (Tactical Execution)

### Hit 1: FACT
Current process takes 30min daily
- Task: `task hit-1-uuid` (44)

### Hit 2: OBSTACLE
Need to learn API integration
- Task: `task hit-2-uuid` (45)

### Hit 3: STRIKE
Build Python automation script
- Task: `task hit-3-uuid` (46)

### Hit 4: RESPONSIBILITY
I own the decision to automate now
- Task: `task hit-4-uuid` (47)

---

## 📝 Execution Notes
[Add notes as you work...]

---

## Taskwarrior Links

- Door: `task door-uuid` (43)
- Hit 1-4: See above
- Profit: `task profit-uuid` (48)
```

**Key:** Transformative Inquiry stays in markdown body (human-readable), only UUIDs in YAML (machine-queryable)

**Markdown Transformation:**

Original Hot .md:
```markdown
---
type: hot
stage: potential
created: 2026-01-16T14:30:00Z
tw_uuid: abc-123
---

# 🔥 HOT — Neue Idee

- Created: 2026-01-16 14:30
- Status: open
- Quadrant: Q2

## Why it matters
-

## Next micro-step
-
```

↓ **Transformed to War Stack .md:**

```markdown
---
type: warstack
stage: production
created: 2026-01-16T14:30:00Z
tw_uuid: abc-123
warstack_yaml: neue-idee.yaml
---

# ⚔️ WAR STACK — Neue Idee

## 🔥 Transformative Inquiry

### Trigger
What triggered this Door?
- [Answer from YAML]

### Narrative
What story am I telling myself?
- [Answer from YAML]

### Validation
What truth needs facing?
- [Answer from YAML]

### Impact
What's at stake?
- [Answer from YAML]

---

## 🎯 4 Hits (Tactical Execution)

### 1. FACT
[Description from YAML]
- Task: [TW UUID link]

### 2. OBSTACLE
[Description from YAML]
- Task: [TW UUID link]

### 3. STRIKE
[Description from YAML]
- Task: [TW UUID link]

### 4. RESPONSIBILITY
[Description from YAML]
- Task: [TW UUID link]

---

## 📝 Execution Notes
[Notes from YAML]
```

**Process:**
1. User selects Idea from Quadrant JSON
2. War Stack creation wizard (transformative inquiry)
3. Generate YAML with 4 Hits
4. Transform Hot .md → War Stack .md
5. Create 4 Taskwarrior tasks (linked to YAML)

---

### 4-PROFIT/ (Reflection & Achieved)

**Files:**
```
profit_index.json           ← Index for completed Doors
a7f2-neue-idee.md           ← Markdown moved from 3-Production/ (YAML + PROFIT section added)
```

**profit_index.json** (Index):
```json
{
  "version": "1.0",
  "updated_at": "2026-01-20T10:00:00Z",
  "items": [
    {
      "file": "a7f2-neue-idee.md",
      "tw_uuid": "abc-123",
      "quadrant": 2,
      "started_at": "2026-01-16T15:00:00Z",
      "completed_at": "2026-01-20T10:00:00Z",
      "duration_days": 4,
      "hits_completed": 4,
      "energy_roi": 8,
      "status": "achieved"
    }
  ],
  "stats": {
    "total_completed": 1,
    "avg_duration_days": 4,
    "avg_energy_roi": 8,
    "this_week": 1
  }
}
```

**Trigger:** Automatic when all 4 Taskwarrior hits completed (detected by Taskwarrior hook)

**Markdown YAML Evolution** (3-Production → 4-Profit):
```json
{
  "version": "1.0",
  "updated_at": "2026-01-16T16:00:00Z",
  "items": [
    {
      "idea": "Neue Idee",
      "file": "neue-idee.md",
      "tw_uuid": "abc-123",
      "quadrant": 2,
      "started_at": "2026-01-16T15:00:00Z",
      "completed_at": "2026-01-20T10:00:00Z",
      "duration_days": 4,
      "profit": {
        "what_worked": "...",
        "what_didnt": "...",
        "lessons_learned": "...",
        "next_time": "...",
        "energy_roi": 8
      }
    }
  ]
}
```

**Before (3-Production/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
quadrant: 2
trigger: "..."
narrative: "..."
validation: "..."
impact: "..."
hit_fact: hit-1-uuid
hit_obstacle: hit-2-uuid
hit_strike: hit-3-uuid
hit_responsibility: hit-4-uuid
---
```

**After (4-Profit/a7f2-neue-idee.md):**
```yaml
---
tw_uuid: abc-123
quadrant: 2

# Profit Reflection
what_worked: "Python automation saved hours immediately"
what_didnt: "API docs were unclear, took extra time"
lessons_learned: "Start with MVP, iterate fast"
next_time: "Read API docs thoroughly first"
energy_roi: 8
---
```

**What changed:**
- Removed War Stack inquiry (inquiry preserved in markdown body)
- Removed hit UUIDs (already in Taskwarrior)
- Added profit reflection (only new data)
- All timestamps/completion status → query from Taskwarrior

# 💰 PROFIT — Neue Idee

[Previous War Stack content preserved...]

---

## 💰 PROFIT REFLECTION

**Completed:** 2026-01-20
**Duration:** 4 days
**Energy ROI:** 8/10

### What Worked ✅
- Python automation saved hours immediately
- Script ran flawlessly after setup

### What Didn't Work ❌
- API docs were unclear, took extra time debugging
- Should have tested smaller piece first

### Lessons Learned 💡
- Start with MVP, iterate fast
- Automation pays off immediately when scope is clear

### Next Time 🔄
- Read API docs thoroughly before starting
- Create test environment first

---

## 📊 Timeline
- **Created:** 2026-01-16 (1-Potential)
- **Planned:** 2026-01-16 (2-Plan, Q2)
- **War Stack:** 2026-01-16 (3-Production)
- **Completed:** 2026-01-20 (4-Profit)
- **Duration:** 4 days
```

**Process:**
1. User marks War Stack as "Achieved"
2. Profit reflection wizard
3. Append PROFIT section to .md
4. Add entry to `profit_index.json`
5. Move .md to `4-Profit/`

---

## Implementation Plan

### Phase 1: Filename Cleanup ✅ COMPLETED
- [x] Remove timestamp from `ticktick_hotlist_sync.py` ✅
- [x] Remove timestamp from `aos-hot.fish` ✅
- [x] Update GAS `getPotentialHotIdeas()` filename parsing ✅
- [x] Create Python CLI wrapper for bash/zsh compatibility ✅
- [ ] Migration script for existing timestamped files? (deferred)

### Phase 2: Quadrant JSON System
- [ ] Design Quadrant JSON schema
- [ ] Implement Door War → Quadrant assignment UI (GAS)
- [ ] Create Quadrant JSON write functions
- [ ] Clear `hotlist_index.json` after Door War
- [ ] Update Router Bot to read Quadrant JSONs

### Phase 3: War Stack YAML System
- [ ] Design War Stack YAML schema
- [ ] Implement War Stack creation wizard (GAS + Bridge)
- [ ] Create YAML generation functions
- [ ] Implement Hot .md → War Stack .md transformation
- [ ] Link 4 Hits to Taskwarrior tasks

### Phase 4: Profit Tracking System
- [ ] Design Profit JSON schema
- [ ] Implement Profit reflection wizard (GAS)
- [ ] Create Profit JSON write functions
- [ ] Implement .md PROFIT section append
- [ ] Weekly profit aggregation (General's Tent integration)

### Phase 5: Integration & Testing
- [ ] Update all GAS functions to work with multi-JSON system
- [ ] Update Bridge endpoints for new data flow
- [ ] Update Router Bot commands
- [ ] Update CLI tools (aos-hot.fish, etc.)
- [ ] End-to-end testing: 1→2→3→4 flow
- [ ] Documentation update

---

## Migration Strategy

**Existing Files:**
1. Keep existing `hotlist_index.json` format (backward compatible)
2. Rename timestamped .md files: `YYYYMMDD-HHMMSS--slug.md` → `slug.md`
3. Create empty Quadrant JSONs in `2-Plan/`
4. Move existing War Stacks to YAML format
5. Gradual rollout (new system parallel to old)

**Rollback Plan:**
- Keep old `hotlist_index.json` format for 1 month
- Test new system thoroughly before full migration
- Document manual recovery procedures

---

## Files to Modify

**Python:**
- [ ] `ticktick_hotlist_sync.py` - Remove timestamp, create clean filenames
- [ ] Bridge endpoints (future): Quadrant/War Stack/Profit handlers

**Fish:**
- [ ] `.config/fish/functions/aos-hot.fish` - Remove timestamp

**GAS:**
- [ ] `gas/hotlist.gs` - Quadrant JSON system
- [ ] `gas/door_main.gs` - Door War Quadrant assignment
- [ ] `gas/door_warstack.gs` - War Stack YAML generation
- [ ] `gas/door_profit.gs` - Profit tracking

**Router Bot:**
- [ ] `router/extensions/door_flow.py` - Multi-JSON support

**Index Node:**
- [ ] `index-node/server.js` - API endpoints for new data flow
- [ ] `index-node/public/door/index.html` - UI updates

---

## Design Decisions ✅

1. **Filename collisions:** ✅ **DECIDED: Short UUID prefix**
   - Format: `a7f2-slug.md`
   - 4-char hex prefix prevents collisions
   - Still human-readable

2. **Quadrant JSON updates:** ✅ **DECIDED: Append**
   - New Door War selections append to `q1.json` etc.
   - Track version and moved_at timestamp
   - Keep history of all selections

3. **War Stack YAML location:** ✅ **DECIDED: `3-Production/`**
   - Path: `~/AlphaOS-Vault/Door/3-Production/war-stacks/`
   - Phase-specific storage (not separate root folder)
   - Follows 1→2→3→4 folder structure

4. **Profit triggering:** ✅ **DECIDED: Automatic when all 4 Hits done**
   - Door becomes "open" (achieved) when all 4 Taskwarrior tasks completed
   - NO manual aggregation needed
   - Taskwarrior hook detects completion → triggers Profit phase
   - Profit reflection wizard opens automatically

5. **hotlist_index.json clearing:** ⏳ **PENDING**
   - Option A: Delete processed items completely
   - Option B: Move to `_archive` array in same file
   - Option C: Move to separate `hotlist_archive.json`

---

## Success Criteria

- ✅ Hot List filenames are clean (no timestamp)
- ✅ Door War assigns Quadrants → persisted in JSON
- ✅ War Stacks have structured YAML metadata
- ✅ War Stack .md files have transformative inquiry visible
- ✅ Profit reflections are captured and aggregated
- ✅ Full 1→2→3→4 flow works end-to-end
- ✅ GAS, Bridge, Router Bot, CLI all support new system
- ✅ Old system gracefully deprecated

---

## Timeline

**Week 1 (2026-W03):**
- Phase 1: Filename cleanup

**Week 2 (2026-W04):**
- Phase 2: Quadrant JSON system

**Week 3 (2026-W05):**
- Phase 3: War Stack YAML system

**Week 4 (2026-W06):**
- Phase 4: Profit tracking system

**Week 5 (2026-W07):**
- Phase 5: Integration & testing

---

**Next Action:** Start with Phase 1 - Remove timestamp from filenames.
