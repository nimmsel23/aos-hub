# Door Centre Documentation

**The DOOR Pillar** - AlphaOS Weekly Tactics System

**Last Updated:** 2026-01-10

---

## Table of Contents

1. [AlphaOS Philosophy: What MUST Be](#alphaos-philosophy-what-must-be)
2. [The 4P Flow](#the-4p-flow)
3. [Implementation: What IS](#implementation-what-is)
4. [Testing](#testing)

---

## AlphaOS Philosophy: What MUST Be

> "The Door isn't just a method; it's a philosophy—a way to achieve more by focusing on the essential. It represents an entry point to a life where every action is intentional and every task serves a greater purpose." — Elliott Hulse

### Purpose

Transform **chaotic abundance** of ideas into **systematic weekly execution** through strategic filtering and decisive action.

**The Challenge:** When you've built up power and resources, the challenge isn't scarcity anymore—it's abundance. Too many choices, too many opportunities. The real test is figuring out which doors to open and which to keep shut.

**The Solution:** The 4P Flow (Potential → Plan → Production → Profit)

---

## The 4P Flow

### 1. POTENTIAL: The Hot List

**"Guardian of Ideas"**

#### What MUST Happen

**Purpose:**
- Capture EVERY idea without judgment or filtering
- Vault for potential, treasure chest for fleeting thoughts
- Ensure no idea is ever wasted

**Sources of Ideas:**
- Deep reflections in The Voice
- Dedication to the Core Four
- Random bursts of creativity throughout the day
- Meditation, dreams, moments of crisis

**Philosophy:**
- Every idea = rough piece of marble waiting to be sculpted
- Ideas alone are just potential - they need to be shaped
- Speed over structure in this phase

**Required Action:**
- Jot down ALL possibilities
- No filtering, no judgment
- Each idea becomes potential door

**Outcome:**
- Ideas captured and preserved
- Ready to be prioritized in next phase

---

### 2. PLAN: The Door War

**"Battle of Choices"**

#### What MUST Happen

**Purpose:**
- Fight against distractions and determine which actions truly worth your time
- Choose ONE most important door for the week
- Live by intention, not reaction

**The Eisenhower Quadrant System (MUST Use):**

| | Urgent | Not Urgent |
|---|---|---|
| **Important** | **Q1: Crisis**<br>Fire fighting, deadline-driven | **Q2: Domino Doors** ✅<br>Strategic planning, long-term goals |
| **Not Important** | **Q3: Distraction**<br>Non-essential emails, meetings | **Q4: Waste**<br>Social media scrolling, procrastination |

**Critical Rule:** Focus on Quadrant 2 (Important + Not Urgent)

**The Weekly Battle:**
1. Review your Hot List
2. Enter the Door War
3. Pick ONE key action from Q2 to focus on for the week
4. This becomes your "Door" for the week

**Philosophy:**
- Proactive decisions, not reactive
- Choose tasks by choice, not by chance
- Shift from life controlled by urgent demands to one guided by thoughtful, intentional decisions

**Outcome:**
- ONE Domino Door selected for the week
- Commitment made (not because you have to, but because you choose to)

---

### 3. PRODUCTION: War Stack + Hit List

**"The Warpath"**

#### What MUST Happen

**Purpose:**
- Prepare for the battle ahead
- Take broad ideas and narrow them down into one central theme (the Door) and four clear objectives (Hits)
- Break down main goal into measurable steps

**The War Stack Questions (MUST Answer):**

**Meta:**
- **Title**: What will you call this stack?
- **Domain**: Which area? (Body, Being, Balance, Business)
- **Sub-domain**: Production/Process/Protection categories

**Strategic Inquiry:**
- **The Domino Door**: What specific Door are you aiming to unlock?
- **Trigger**: What person or event has sparked your desire to open this Door?
- **Narrative**: What story are you currently telling yourself about this Door?
- **Validation**: Why does opening this Door feel necessary?
- **Impact on Opening**: How would opening this Door change your life/business?
- **Consequences of Inaction**: What happens if this Door stays closed?

**Four Hits (MUST Define):**

Each Hit spans Mon-Fri and includes:
- **The Fact**: The clear, measurable result you aim to achieve
- **The Obstacle**: What could prevent you from achieving this fact?
- **The Strike**: What's your strategic move to overcome the obstacle?
- **Responsibility**: Who is responsible for executing this strike?

**Repeat 4 times to create Four Hits.**

**Reflection (MUST Complete):**
- **Insights**: What new realizations have come to light during this process?
- **Lessons Learned**: What is the most important life lesson this stack has taught you?

**The Big Rocks Metaphor:**

Imagine fitting rocks and sand into a jar:
1. **The 4 Big Rocks** (War Stack Hits) go in FIRST — these are your critical milestones
2. **The 16 Little Rocks** (smaller hits) go SECOND — still crucial but less significant
3. **The Sand** (daily to-dos) fills gaps LAST — routine tasks that keep things running

**Critical Order:** Start with big rocks. If you start with sand (daily tasks), there won't be room for what truly matters.

**Outcome:**
- Clear mission broken down into 4 actionable Hits
- Warpath defined for the week
- Not just a plan, but a commitment

---

### 4. PROFIT: Achieved & Done

**"Reaping the Fruit of Labor"**

#### What MUST Happen

**Purpose:**
- Assess what you've actually achieved
- Understand your rhythm and pace of work
- Winners keep score

**Weekly Review (MUST Ask):**
- **Did you open the Door?**
- **Did you hit all targets on your Hit List?**

**Reflection:**
- **The Achieved List**: Recognize your successes
- **The Done List**: Show your commitment to completion
- **The Fruit**: What was the week's yield?

**Philosophy:**
- Not about counting everything, but focusing on what truly matters
- Clear, unbiased reflection of your efforts
- Not just about counting tasks, but understanding the value of what you've accomplished
- Use that knowledge to fuel your future success

**Outcome:**
- Celebration of victories OR highlight of missed opportunities
- Understanding of where you stood strong and where you faltered
- Fuel for next week's Door War

---

## Implementation: What IS

### Multi-Platform Architecture

| Platform | Status | Use Case |
|----------|--------|----------|
| **GAS (Google Apps Script)** | ✅ ACTIVE | Cloud fallback, mobile access, Google Drive integration |
| **Node.js (Index Node)** | ✅ ACTIVE | Local API server, desktop workflow, full Taskwarrior integration |
| **Python (War Stack Bot)** | ✅ ACTIVE | Telegram conversational flow for War Stack creation |
| **CLI (Fish shell)** | ✅ ACTIVE | Terminal interface for fast local capture |

**Taskwarrior Integration:** All platforms use Taskwarrior UUIDs as single source of truth

---

### Phase 1: POTENTIAL (Hot List) - Implementation

#### GAS Implementation

**Entry Points:**
- `hotlist_addWeb(idea, user)` - HQ Quick Add panel
- `webapp_handleHotListSubmission` - Telegram WebApp
- `/hot <idea>` - Door Bot command

**Storage:**
- Individual markdown files in `Alpha_Door/1-Potential`
- Filename format: `First_5_Words_Date_2025-01-10.md`
- Minimal frontmatter: `date`, `source`, `tags: [potential]`
- `hotlist_index.json` tracks: `hotlist_id ↔ md_id ↔ task_uuid`

**Taskwarrior Integration:**
```javascript
hotlist_addWeb(idea, user)
  ↓
1. Save markdown (no UUID yet)
2. Update hotlist_index.json
3. Bridge check → task add project:HotList +potential
  ↓
on-exit.alphaos.py exports task_export.json (INSTANT)
  ↓
GAS trigger (every 15 min): hotlist_syncUuidsFromTaskExport()
  ↓
Updates markdown frontmatter with task_uuid
```

**Timing:** Task export instant, UUID sync max 15 minutes

**Functions:**
- `hotlist_addWeb()` - Add idea
- `hotlist_saveToDoorPotential_()` - Save markdown
- `hotlist_syncUuidsFromTaskExport()` - Sync UUIDs from task_export.json
- `hotlist_updateMarkdownWithUuid_()` - Write UUID to frontmatter

**Setup (Run Once):**
```javascript
hotlist_setupUuidSyncTrigger()  // Creates 15-min trigger
```

#### Node.js Implementation

**API:**
- `POST /api/door/hotlist` - Add items
- `GET /api/door/hotlist` - List items with UUIDs

**Storage:**
- `~/AlphaOS-Vault/Door/.door-flow.json` - Tracking file with UUIDs
- `~/AlphaOS-Vault/Door/1-Potential/` - Markdown files

**Taskwarrior Integration:**
```bash
POST /api/door/hotlist
  ↓
Bridge: task add project:HotList +potential +<domain>
  ↓
Taskwarrior returns UUID
  ↓
UUID saved to .door-flow.json
```

**Timing:** Instant UUID

#### CLI Implementation

**Command:**
```fish
hot "My Idea"
```

**What Happens:**
1. Creates markdown: `1-Potential/20260110-123456--my-idea.md`
2. Runs `task add project:HotList +hot +potential "My Idea"`
3. Gets UUID from Taskwarrior output
4. Annotates task with `file://` link
5. Syncs to Google Drive via rclone (background)

---

### Phase 2: PLAN (Door War) - Implementation

#### GAS Implementation

**Entry Points:**
- `getPotentialHotIdeas()` - List candidates from `1-Potential`
- `doorMovePotentialToPlan(ids)` - Move selected to `2-Plan`

**Flow:**
1. List Potential ideas
2. Move to Plan folder
3. (Optional) Create Door task via Bridge: `project:DoorWar +plan +<domain> depends:<hotlist_uuid>`
4. Priority mapping: `q1=H`, `q2=M`, `q3=L`, `q4=none`

**Missing:**
- Full Eisenhower scoring not implemented in GAS
- Can reuse Node.js logic

#### Node.js Implementation

**API:**
- `POST /api/door/doorwar` - Run Eisenhower Matrix + select Door

**Eisenhower Scoring:**
- Importance: business/career (+3), health/body (+3), relationship (+2), goals (+2), priority≥3 (+2)
- Urgency: urgent tag (+3), priority≥4 (+2), age>7d (+1), age>14d (+2)

**Flow:**
1. Load Hot List from `.door-flow.json`
2. Evaluate each with Eisenhower Matrix
3. Auto-recommend highest Q2 item
4. Create Door task via Bridge with `depends:<hotlist_uuid>`
5. Save Door UUID to `.door-flow.json`
6. Export markdown to `2-Plan/`

---

### Phase 3: PRODUCTION (War Stack + Hit List) - Implementation

#### GAS Implementation

**War Stack Concept:**
- NOT just task generator - guided sequence of rooms
- Forces clarity and commitment before execution

**Phases (Rooms):**
1. **Door** - Define Domino Door (title, outcome, domain)
2. **Trigger/Narrative** - Why this Door, why now (Trigger, Narrative, Validation, Impact, Consequences)
3. **Hits (4 Rooms)** - Define 4 decisive Hits (Fact/Obstacle/Strike/Responsibility per Hit)
4. **Insights & Lessons** - Reflection
5. **Commit & Export** - Finalize, generate markdown + tasks

**UX Rules:**
- Each phase = distinct room (full panel step)
- Next step unlocked when required fields filled
- Draft persists on blur/step change
- Final submit clears draft

**Entry Points:**
- HQ War Stack panel → `saveDoorEntry` with `tool = 'warstack'`
- Direct: `door_ingestWarStack_(markdown, sessionId)`

**Functions:**
- `doorParseWarStackHits()` - Extract hits from markdown
- `door_buildWarStackTasks_()` - Build Hit/Door/Profit task payloads
- `door_updateWarStackTaskwarriorUuids_()` - Update markdown with UUIDs
- `door_scanWarStacksForTasks_()` - Background scan for new War Stacks

**Task Structure:**
- **Hits:** `+hit +production +door +<domain>`, due today+1..4, wait +1..4
- **Door:** description = War Stack title, `+production +<domain>`, depends on all Hits
- **Profit:** `+profit +<domain>`, wait +5d, depends on Door

**Storage:**
- Drafts: `0-Drafts/WarStack_Draft_<session>.json`
- Draft synced to Bridge `/bridge/warstack/draft` (Python bot `/resume`)
- Final: `3-Production/` markdown with UUID frontmatter

**Markdown Structure:**
```yaml
---
domain: Business
taskwarrior_door_uuid: abc123...
taskwarrior_profit_uuid: def456...
taskwarrior_hits:
  - uuid: ghi789...
    hit_index: 1
  ...
---

# WAR STACK - Title

[content]

## Taskwarrior

- Door: `abc123...` (43)
- Hit 1: `ghi789...` (44) — Description
...
```

**Telegram Push:**
- Controlled by `WARSTACK_TELEGRAM=1`
- Token: `WARSTACK_BOT_TOKEN`
- Splits long markdown into chunks

#### Node.js Implementation

**API:**
- `POST /api/door/export` - Export War Stack + create tasks

**Flow:**
1. Parse markdown (extract hits, domain, title)
2. Create 4 Hit tasks via Bridge (due:today+1..4d, wait:+1..4d)
3. Create/use Door task
4. Wire Door dependencies to all 4 Hits
5. Create Profit task (depends:door_uuid, wait:+5d)
6. Update markdown with UUIDs
7. Save to `.door-flow.json`

#### Python Bot Implementation

**Conversational Flow:**
- Guides user through War Stack rooms
- Saves draft to Bridge `/bridge/warstack/draft`
- User can `/resume` incomplete War Stacks

---

### Phase 4: PROFIT (Reflection) - Implementation

#### GAS Implementation

**Entry Points:**
- Profit panel → `door_saveProfitJson_(data)`

**Storage:**
- JSON in `Alpha_Door/4-Profit/door_profit_<date>.json`

**JSON Structure:**
```json
{
  "date": "YYYY-MM-DD",
  "week": "YYYY-WWW",
  "door_opened": true,
  "door_obstacle": "optional if door_opened = false",
  "hits": [
    { "hit": "Hit 1", "done": true, "notes": "" }
  ],
  "done": ["other completed tasks"],
  "insight": "string",
  "lesson": "string",
  "score": {
    "big_rocks_total": 4,
    "big_rocks_done": 3,
    "execution_percent": 75
  }
}
```

**Missing:**
- Taskwarrior Profit task completion via Bridge
- Markdown export (only JSON currently)
- Link to War Stack/Hit completion

#### Node.js Implementation

**API:**
- `POST /api/door/profit` - Save reflection

**Flow:**
1. Mark Profit task done: `task <uuid> done`
2. Annotate with reflection
3. Export to `4-Profit/<date>_<door>.md`
4. Save to `.door-flow.json`

---

## Testing

### Quick Smoke Test (GAS)

```javascript
// 1. Add Hot List idea
hotlist_addWeb("Test GAS Hot List", {username: "test"})

// 2. Verify Drive
// Check Alpha_Door/1-Potential for new markdown

// 3. Wait for UUID sync (max 15 min)
// Check task_export.json or hotlist_index.json

// 4. Move to Plan
doorMovePotentialToPlan(["<file_id>"])

// 5. Create War Stack
door_ingestWarStack_({markdown: "...", sessionId: "test"})
```

### Quick Smoke Test (Node.js)

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

# 5. Check dependencies
task <door_uuid> _get depends
```

### Quick Smoke Test (CLI)

```bash
# 1. Add to Hot List
hot "Test CLI Hot List"

# 2. Verify Taskwarrior
task project:HotList list

# 3. Check markdown created
ls ~/AlphaOS-Vault/Door/1-Potential/
```

---

## Related Documentation

- [TESTING_TASKWARRIOR_UUID.md](TESTING_TASKWARRIOR_UUID.md) - Complete test suite
- [bridge/README.md](../bridge/README.md) - Bridge API
- [python-warstack/README.md](../python-warstack/README.md) - War Stack Bot
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [index-node/README.md](../index-node/README.md) - Node.js server docs

---

**Last Updated:** 2026-01-10
**AlphaOS Philosophy:** Elliott Hulse Blueprints (Chapters 25-31)
**Implementation Status:** ✅ Multi-Platform (GAS + Node.js + Python + CLI)
