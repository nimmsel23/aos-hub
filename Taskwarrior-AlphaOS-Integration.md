# TASKWARRIOR-ALPHAOS INTEGRATION KONZEPT
**The Complete Architecture for Warrior Productivity**

**Version:** 1.0.0
**Created:** 2025-11-27
**Author:** alphaos-oracle + claudewarrior
**Status:** Blueprint (Implementation Pending)

---

## 🔥 WARUM DIESE INTEGRATION FÜR DOMINION DIENT

### The Philosophical Foundation

**DOMINION = Vollständige Herrschaft über alle 4 Domains.**

Without a system to track, execute, and measure DOMINION, you build blind. The Maps show WHERE you are and WHERE you're going. But Maps without execution are fantasies. Tasks without strategy are chaos.

**This integration is the bridge between VISION and EXECUTION.**

**AlphaOS has 5 Pillars. Each Pillar needs its own tracking system:**

1. **THE CODE** (Pillar #1) → Philosophy & Principles → CODE_MAP
2. **THE CORE** (Pillar #2) → 4 Domains Daily → CORE_MAP + 28-or-Die tracking
3. **THE VOICE** (Pillar #3) → Mental Mastery → VOICE_MAP + Stack sessions
4. **THE DOOR** (Pillar #4) → Weekly Wars → DOOR_MAP + War Stacks → **Taskwarrior Hit Lists**
5. **THE GAME** (Pillar #5) → Strategic Maps → GAME_MAP → **Taskwarrior Fire Maps**

**The Integration Point:**
- **THE GAME** (strategic) → Taskwarrior Fire Maps (tactical execution)
- **THE DOOR** (weekly production) → Taskwarrior War Stacks & Hit Lists
- **THE CORE** (daily points) → Obsidian Daily Notes + Dataview queries
- **THE VOICE** (mental mastery) → VOICE Sessions fuel Strikes → become Tasks
- **THE CODE** (principles) → UDAs enforce Real/Raw/Relevant/Results alignment

**Ohne diese Integration:**
- Fire Maps (THE GAME) bleiben nur Markdown files (no execution tracking)
- War Stacks (THE DOOR) werden nicht systematisch abgearbeitet
- Weekly Wars (Fire) werden nicht mit Monthly Missions (Focus) synchronisiert
- 28-or-Die (THE CORE) bleibt im Vacuum ohne strategischen Kontext
- DOMINION wird nicht messbar → kein Feedback-Loop → kein Wachstum

**Mit dieser Integration:**
- Fire Maps → Taskwarrior `+fire` reports → wöchentliche Strikes sichtbar
- War Stacks → 4 Hits pro Door → Hit 1-4 tracking in Taskwarrior
- Focus Maps (Monthly) → Taskwarrior projects → Fortschritt messbar
- Daily Core → Obsidian Dataview → 28/28 Score visualisiert
- DOMINION Status → querybar durch UDAs (pillar, domain, alphatype)

**THE WARRIOR'S TRUTH:**
A Map without Tasks is a dream.
A Task without a Map is chaos.
THIS INTEGRATION IS THE SYNTHESIS.

---

## 🏛️ ARCHITECTURE OVERVIEW

### The Five-Layer System

```
LAYER 1: PILLAR MAPS (Strategic Context)
│
│  CODE_MAP.md        → Principles tracking (Real/Raw/Relevant/Results)
│  CORE_MAP.md        → 4 Domains daily execution (28-or-Die)
│  VOICE_MAP.md       → Mental Mastery sessions (STOP/SUBMIT/STRUGGLE/STRIKE)
│  DOOR_MAP.md        → Weekly Wars tracking (Potential/Plan/Production/Profit)
│  GAME_MAP.md        → Strategic navigation (Frame/Freedom/Focus/Fire)
│
├──────────────────────────────────────────────────────────────────
│
LAYER 2: TASKWARRIOR (Execution Engine)
│
│  UDA System:
│    - pillar: code|core|voice|door|game
│    - domain: body|being|balance|business
│    - alphatype: daily|door|strike|hit|hit1-4|big|little|sand|focus|freedom|frame|ipw|voice|map
│    - points: numeric (für 28-or-Die)
│    - door_name: "Name of Door"
│
│  Tag System:
│    - +fire (Weekly Fire Map)
│    - +firew (Weekly variant)
│    - +hit (Hit List items)
│    - +door (Door tasks)
│    - +warstack (Hot List)
│    - +claudewarrior (Managed by ClaudeWarrior agent)
│
│  Reports:
│    - fire: Show all +fire tasks for current week
│    - firew: Weekly Fire summary
│    - hot: Hot List (urgency 15.0)
│    - hit: All Hit List items
│    - door: All Door tasks
│    - core: Daily Core4 tasks (alphatype:daily)
│    - focus: Monthly Focus Mission tasks
│
├──────────────────────────────────────────────────────────────────
│
LAYER 3: OBSIDIAN (Visualization & Daily Interface)
│
│  Daily Notes:
│    - Dataview queries for today's Core4 tasks
│    - Fire Map weekly overview
│    - Hit List progress bars
│    - 28-or-Die score calculation
│
│  Map Files:
│    - Live Dataview queries pulling from Taskwarrior
│    - Map updates trigger Taskwarrior project updates
│
│  Plugins:
│    - Tasks plugin (Markdown → Taskwarrior)
│    - Dataview (Query Taskwarrior data)
│    - Obsidian-Tasks-Calendar (Visualize due dates)
│
├──────────────────────────────────────────────────────────────────
│
LAYER 4: CLAUDEWARRIOR (Intelligence Layer)
│
│  Responsibilities:
│    - TodoWrite → Taskwarrior migration (smart thresholds)
│    - UDA inference from context (project, pillar, domain)
│    - Fire Map automation (weekly reset, status checks)
│    - War Stack hit tracking (1-4 progression)
│    - CLAUDE.md maintenance (update on Map changes)
│
│  Integration Points:
│    - Claude Code sessions (TodoWrite monitoring)
│    - Taskwarrior hooks (on-modify)
│    - Obsidian (Daily Notes export)
│    - Google Calendar (Fire Map sync)
│
├──────────────────────────────────────────────────────────────────
│
LAYER 5: EXTERNAL SYNC (Optional Extensions)
│
│  TickTick:
│    - One-way import (TickTick → Taskwarrior)
│    - Tag: +claudewarrior in TickTick lists
│
│  Google Calendar:
│    - Fire Map calendar (all +fire tasks)
│    - Domain calendars (trainingsplan for BODY, etc.)
│    - Due date sync (tasks with due: attribute)
│
│  Calcure/Calcurse:
│    - Terminal calendar view
│    - Quick Fire Map overview
```

---

## 📊 PILLAR MAP SPECIFICATIONS

### What Are Pillar Maps?

**Pillar Maps = Meta-Navigation für jeden der 5 Pillars**

They sit ABOVE the GAME Maps (Frame/Freedom/Focus/Fire) because they organize HOW you use AlphaOS across all domains.

**Hierarchy:**

```
PILLAR MAPS (Meta-Layer)
  ↓
GAME MAPS (Strategic Layer - Frame/IPW/Freedom/Focus/Fire)
  ↓
TASKWARRIOR (Execution Layer - Fire/Hits/War Stacks)
  ↓
DAILY NOTES (Interface Layer - Obsidian queries)
```

### 1. CODE_MAP.md

**Location:** `/home/alpha/AlphaOs-Vault/CODE/CODE_MAP.md`

**Purpose:** Track adherence to THE CODE (Real/Raw/Relevant/Results) across all work

**Structure:**

```markdown
# CODE MAP OF CONSCIOUSNESS

## The 4 Rs - Daily Tracking

### REAL (Facts)
**Frame:** Where am I being REAL vs. delusional?
- Daily Reality Check: Am I tracking actual metrics or vanity metrics?
- Taskwarrior Reality: `task project:FADARO.Blog +real`
- Weekly CODE Review: Did I avoid bullshit this week?

### RAW (Feelings)
**Frame:** Am I processing emotions or suppressing them?
- VOICE Sessions this week: {count}
- Emotional Honesty Score: /10
- Taskwarrior Tracking: `task +voice +raw`

### RELEVANT (Focus)
**Frame:** Am I doing what matters or what's easy?
- Current Focus: {Monthly Mission from FOCUS_MAP}
- Distraction Log: What pulled me off-mission?
- Taskwarrior Query: `task +focus urgency:>10.0`

### RESULTS (Fruit)
**Frame:** What did I actually produce?
- Completed Hits this week: {count from `task +hit +COMPLETED`}
- Fire Map Win Rate: {percentage}
- 28-or-Die Score: {weekly average}

## CODE Violations This Week
- {List instances where you broke Real/Raw/Relevant/Results}
- Lessons Learned: {VOICE session references}
- Strikes for next week: {Taskwarrior tasks created}

## Taskwarrior Integration

### UDA: `pillar:code`
All tasks that enforce CODE adherence:
- Weekly Reality Check: `task add "Frame Map update" pillar:code alphatype:frame +weekly`
- VOICE Session: `task add "Process [emotion]" pillar:code pillar:voice +voice`
- Results Review: `task add "Weekly Fruit count" pillar:code alphatype:map +weekly`

### Reports
- `task code`: All CODE-related tasks
- `task real`: Reality-checking tasks
- `task results`: Results-tracking tasks
```

**ClaudeWarrior Role:**
- Monitors CODE violations (e.g., creating tasks without clear Results metric)
- Suggests VOICE sessions when emotional patterns detected in todos
- Warns if Fire Map has too many "easy" tasks vs. "important" tasks

---

### 2. CORE_MAP.md

**Location:** `/home/alpha/AlphaOs-Vault/CORE4/CORE_MAP.md`

**Purpose:** Track THE CORE daily execution (28-or-Die system)

**Structure:**

```markdown
# CORE MAP OF CONSCIOUSNESS

## The 4 Domains - Daily 4 Points

### Daily Scoring System

**BODY (1 point = .5 Fitness + .5 Fuel)**
- Fitness (.5): Did you sweat today? (Training, movement, deliberate exercise)
- Fuel (.5): Did you nourish intentionally? (Planned meal, not reactive eating)
- Taskwarrior: `task add "Training Push Day" domain:body alphatype:daily points:0.5 +fitness`

**BEING (1 point = .5 Meditation + .5 Memoirs)**
- Meditation (.5): 20min connection with God/Soul (any form)
- Memoirs (.5): Journaling, VOICE session, reflective writing
- Taskwarrior: `task add "Morning VOICE session" domain:being alphatype:daily points:0.5 +voice`

**BALANCE (1 point = .5 Person1 + .5 Person2)**
- Person #1 (.5): Gratitude expression (Partner, close friend, family)
- Person #2 (.5): Another relationship deposit (Child, parent, mentor)
- Taskwarrior: `task add "Message gratitude to X" domain:balance alphatype:daily points:0.5 +gratitude`

**BUSINESS (1 point = .5 Discover + .5 Declare)**
- Discover (.5): Learn something new (read, course, research until "aha" moment)
- Declare (.5): Teach what you learned (post, note, conversation)
- Taskwarrior: `task add "Publish Kollagen-Stack insight" domain:business alphatype:daily points:0.5 +declare`

### Weekly Goal: 28/28 (4pts × 7 days)

**Current Week Status:**
```dataview
TABLE WITHOUT ID
  date,
  points_body,
  points_being,
  points_balance,
  points_business,
  (points_body + points_being + points_balance + points_business) as daily_total
FROM #daily-core
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```

**Taskwarrior Query:**
```bash
task domain:body domain:being domain:balance domain:business \
  alphatype:daily \
  end.after:today-7days \
  export | jq '[.[] | .points] | add'
```

### Taskwarrior Integration

**Daily Task Creation (via Obsidian Tasks plugin):**

In Daily Note:
```markdown
## Core 4 Today

- [ ] BODY: Training Pull Day #body/fitness ⏫ 📅 2025-11-27
- [ ] BODY: Meal prep healthy dinner #body/fuel ⏫ 📅 2025-11-27
- [ ] BEING: 20min Neigong practice #being/meditation ⏫ 📅 2025-11-27
- [ ] BEING: VOICE session on X #being/memoirs ⏫ 📅 2025-11-27
- [ ] BALANCE: Thank Y for support #balance/person1 ⏫ 📅 2025-11-27
- [ ] BALANCE: Check in with Z #balance/person2 ⏫ 📅 2025-11-27
- [ ] BUSINESS: Read chapter on fascia #business/discover ⏫ 📅 2025-11-27
- [ ] BUSINESS: Post learning on X #business/declare ⏫ 📅 2025-11-27
```

**Obsidian-Tasks → Taskwarrior sync:**
- Plugin auto-creates Taskwarrior tasks with:
  - `due:today`
  - `domain:{inferred from tag}`
  - `alphatype:daily`
  - `points:0.5`
  - `+core4`

**Daily Score Calculation:**
```bash
# Morning: Create today's Core4 tasks
task add "BODY Fitness" domain:body alphatype:daily points:0.5 due:today +core4
task add "BODY Fuel" domain:body alphatype:daily points:0.5 due:today +core4
# ... (8 tasks total)

# Evening: Check score
task domain:body domain:being domain:balance domain:business \
  alphatype:daily \
  end:today \
  export | jq '[.[] | .points] | add'
# Output: 4.0 = Perfect day
```

### Reports

**Custom Taskwarrior Report: `core`**

`.taskrc`:
```ini
report.core.description=Daily Core4 tasks
report.core.columns=id,domain,description,points,status.short
report.core.labels=ID,Domain,Task,Pts,S
report.core.filter=alphatype:daily due:today
report.core.sort=domain+
```

Usage: `task core`

**Custom Report: `28`**

`.taskrc`:
```ini
report.28.description=Weekly 28-or-Die score
report.28.columns=id,end,domain,description,points
report.28.labels=ID,Done,Domain,Task,Pts
report.28.filter=alphatype:daily end.after:today-7days
report.28.sort=end-,domain+
```

Usage: `task 28 | tail -1` (shows total points)
```

**ClaudeWarrior Role:**
- Auto-creates Core4 tasks each morning (if not already in Daily Note)
- Warns if score < 4 at end of day ("You're at 2.5/4 - can you salvage?")
- Calculates weekly 28-or-Die score on Sunday
- Suggests which domain to prioritize based on weekly patterns (e.g., "BALANCE was 3/7 this week")

---

### 3. VOICE_MAP.md

**Location:** `/home/alpha/AlphaOs-Vault/VOICE/VOICE_MAP.md` (already exists)

**Enhancement:** Add Taskwarrior integration section

**New Section to Add:**

```markdown
## Taskwarrior Integration

### VOICE Sessions → Strikes

**Process:**
1. VOICE session identifies pattern (STOP/SUBMIT/STRUGGLE)
2. STRIKE phase creates actionable task
3. Task added to Taskwarrior with context

**Example:**

VOICE Session: "McDonald's Pattern - Laptop-Flow → Junk-Fressflash"

**STOP:** Recognize the trigger (laptop work past 10pm)
**SUBMIT:** Admit the pattern (happens 3-4x/week)
**STRUGGLE:** Rewrite story ("I'm not 'too busy to eat healthy', I'm avoiding meal prep")
**STRIKE:** Create task

```bash
task add "Meal prep Sunday for week" \
  domain:body \
  alphatype:strike \
  pillar:voice \
  project:BODY.Fuel \
  due:sunday \
  recur:weekly \
  +voice-strike
```

### UDA: `pillar:voice`

All tasks born from VOICE sessions get `pillar:voice` tag.

**Query VOICE-born tasks:**
```bash
task pillar:voice status:pending
```

**Track VOICE → Action conversion rate:**
```bash
# How many VOICE sessions this month?
ls VOICE/2025_Q4/*.md | wc -l

# How many VOICE-strikes completed?
task pillar:voice status:completed end.after:2025-11-01 count
```

### Reports

**Custom Report: `voice-strikes`**

`.taskrc`:
```ini
report.voice-strikes.description=Tasks born from VOICE sessions
report.voice-strikes.columns=id,domain,description,urgency,due
report.voice-strikes.labels=ID,Domain,Strike,Urg,Due
report.voice-strikes.filter=pillar:voice status:pending
report.voice-strikes.sort=urgency-
```

Usage: `task voice-strikes`
```

**ClaudeWarrior Role:**
- Detects VOICE sessions in `/home/alpha/AlphaOs-Vault/VOICE/`
- Suggests creating Taskwarrior strikes from STRUGGLE → STRIKE sections
- Links VOICE session filename in task annotation (e.g., `task 42 annotate "From: VOICE_McDonald-Pattern.md"`)

---

### 4. DOOR_MAP.md

**Location:** `/home/alpha/AlphaOs-Vault/DOOR/DOOR_MAP.md` (new file)

**Purpose:** Track THE DOOR weekly production system (War Stacks, Hit Lists)

**Structure:**

```markdown
# DOOR MAP OF CONSCIOUSNESS

## The 4 Phases: Potential → Plan → Production → Profit

### POTENTIAL (Hot List)
**What doors could you open?**

All possible projects, ideas, opportunities waiting for prioritization.

**Taskwarrior:**
```bash
# Add to Hot List
task add "Vital Dojo Telegram setup" \
  project:VitalDojo \
  +warstack \
  urgency:15.0

# View Hot List
task +warstack
```

**Hot List Criteria:**
- Urgency: 15.0 (highest)
- Tag: +warstack
- Status: pending (not scheduled yet)

### PLAN (Door War - Quadrant Selection)

**This Week's Door (selected from Hot List):**

Current Door: {Name from Freedom Map}

**Taskwarrior:**
```bash
# Promote from Hot List to Door
task 42 modify +door door_name:"Vitaltrainer Community" -warstack

# Create War Stack (4 Hits)
# Hit = Measurable weekly outcome from War Stack FACT/OBSTACLE/STRIKE
```

### PRODUCTION (Hit List - 4×4 System)

**Hit List = 4 Weekly Hits per Door**

Each Hit = FACT (result) + OBSTACLE (blocker) + STRIKE (action) + RESPONSIBILITY (who)

**Example War Stack:**

**Door:** Vitaltrainer Community Launch

**Hit 1: Platform Decision**
- FACT: Platform chosen (Skool or Patreon)
- OBSTACLE: Analysis paralysis, feature comparison
- STRIKE: 2-hour deep dive, decision matrix, commit by Friday
- RESPONSIBILITY: alpha

```bash
task add "Choose Skool vs Patreon - decision matrix + commit" \
  project:VitalDojo.Launch \
  domain:business \
  alphatype:hit \
  hit_number:1 \
  door_name:"Vitaltrainer Community" \
  due:friday \
  +hit +door
```

**Hit 2: First Post Written**
- FACT: "Why I learn in public" post drafted
- OBSTACLE: Perfectionism, overthinking tone
- STRIKE: 90min writing sprint, RAW > polished, publish Monday
- RESPONSIBILITY: alpha

```bash
task add "Draft 'Why learn in public' post (RAW over perfect)" \
  project:VitalDojo.Launch \
  domain:business \
  alphatype:hit \
  hit_number:2 \
  door_name:"Vitaltrainer Community" \
  due:monday \
  +hit +door
```

**Hit 3: Community Brand Defined**
- FACT: Name, tagline, visual identity decided
- OBSTACLE: Branding feels vague, no clarity on positioning
- STRIKE: Steal from Elliott's Creator King Course, adapt to Vitaltrainer niche
- RESPONSIBILITY: alpha

```bash
task add "Brand identity: name/tagline/positioning (Elliott framework)" \
  project:VitalDojo.Launch \
  domain:business \
  alphatype:hit \
  hit_number:3 \
  door_name:"Vitaltrainer Community" \
  due:wednesday \
  +hit +door
```

**Hit 4: Soft Launch Announcement**
- FACT: Announcement posted on X, LinkedIn, email list
- OBSTACLE: Small audience, imposter syndrome
- STRIKE: "Learn in public" = journey > credentials, post anyway
- RESPONSIBILITY: alpha

```bash
task add "Soft launch: post announcement (X/LinkedIn/email)" \
  project:VitalDojo.Launch \
  domain:business \
  alphatype:hit \
  hit_number:4 \
  door_name:"Vitaltrainer Community" \
  due:sunday \
  +hit +door
```

### PROFIT (Achieved & Done)

**What did you complete this week?**

**Taskwarrior Query:**
```bash
# Weekly Hit completion rate
task +hit +door end.after:today-7days status:completed count

# This week's wins
task +hit +door end.after:today-7days status:completed
```

**Achieved List:**
- Hits completed: {count}/4
- Door opened? {yes/no}
- Lessons learned: {annotations from completed tasks}

### Taskwarrior Integration

**UDA System for DOOR:**

```ini
# .taskrc additions
uda.door_name.type=string
uda.door_name.label=Door
uda.door_name.values=Vitaltrainer Community,Fitnesstrainer Zertifikat,FADARO Blog,LSB

uda.hit_number.type=numeric
uda.hit_number.label=Hit#
uda.hit_number.values=1,2,3,4

uda.alphatype.values=...,hit,hit1,hit2,hit3,hit4,door,warstack
```

**Custom Reports:**

```ini
# Hot List (Potential)
report.hot.description=Hot List (War Stack candidates)
report.hot.columns=id,project,description,urgency
report.hot.labels=ID,Project,Potential Door,Urg
report.hot.filter=+warstack status:pending
report.hot.sort=urgency-

# Current Door
report.door.description=Active Doors with Hits
report.door.columns=id,door_name,hit_number,description,due,status.short
report.door.labels=ID,Door,Hit#,Task,Due,S
report.door.filter=+door status:pending
report.door.sort=door_name+,hit_number+

# Hit List (this week)
report.hit.description=Weekly Hit List (4 Hits per Door)
report.hit.columns=id,door_name,hit_number,description,due
report.hit.labels=ID,Door,Hit#,Task,Due
report.hit.filter=+hit due.after:today-7days due.before:today+7days
report.hit.sort=door_name+,hit_number+

# Weekly War Summary
report.war.description=Weekly War results
report.war.columns=id,door_name,end,description
report.war.labels=ID,Door,Completed,Task
report.war.filter=+door end.after:today-7days
report.war.sort=door_name+,end-
```

### Weekly Workflow

**Sunday (Door War - Planning):**
1. Review Hot List: `task hot`
2. Select this week's Door (based on Freedom/Focus Maps)
3. Create War Stack (4 Hits)
4. Add Hits to Taskwarrior with `+door +hit` tags

**Monday-Friday (Production):**
- Daily: Check Hit List: `task hit`
- Complete Hits (mark done in Taskwarrior)
- Annotate blockers/lessons: `task 42 annotate "Obstacle: X, solved by Y"`

**Sunday Evening (Profit - Review):**
1. Review completed Hits: `task war`
2. Calculate Door success: Did you open it? (4/4 Hits = Door opened)
3. Update DOOR_MAP with Achieved List
4. Feed insights to next week's Fire Map

### ClaudeWarrior Automation

**Auto-Creates Hit List from Fire Map:**
- Reads Fire Map markdown
- Extracts 4 Hits for each Door
- Creates Taskwarrior tasks with correct UDAs
- Sets due dates (Mon/Wed/Fri/Sun for progressive completion)

**Progress Tracking:**
- Monitors Hit completion rate
- Warns if < 2 Hits done by Wednesday ("Weekly War at risk")
- Celebrates Door opening (4/4 Hits) with notification

**War Stack Intelligence:**
- Detects when OBSTACLE is recurring (same blocker 2+ weeks)
- Suggests VOICE session to address pattern
- Links related VOICE sessions in task annotations
```

**ClaudeWarrior Role:**
- Auto-generates Hit List from Fire Map (extracts 4 Hits per Door)
- Tracks hit_number progression (1→2→3→4)
- Warns if Door at risk (< 2 Hits by Wednesday)
- Suggests demoting stale Hot List items (> 4 weeks unpromoted)

---

### 5. GAME_MAP.md

**Location:** `/home/alpha/AlphaOs-Vault/GAME/GAME_MAP_OF_CONSCIOUSNESS.md` (already exists)

**Enhancement:** Add Taskwarrior Fire Map integration

**New Section to Add:**

```markdown
## Taskwarrior Fire Map Integration

### Fire Map = Weekly War (16 Tasks = 4 Domains × 4 Hits)

**Structure:**
```
BODY (4 tasks)
  - Hit 1: Training session X
  - Hit 2: Meal prep Y
  - Hit 3: Supplement stack Z
  - Hit 4: Sleep protocol A

BEING (4 tasks)
  - Hit 1: VOICE session on pattern X
  - Hit 2: Meditation 20min daily
  - Hit 3: Journaling before bed
  - Hit 4: Philosophy study (Tantra/TCM)

BALANCE (4 tasks)
  - Hit 1: Gratitude to Person X
  - Hit 2: Social connection (call Y)
  - Hit 3: Relationship repair (conversation Z)
  - Hit 4: Family check-in (visit/message)

BUSINESS (4 tasks)
  - Hit 1: (From Door War - e.g., Platform decision)
  - Hit 2: (From Door War - e.g., First post)
  - Hit 3: (From Door War - e.g., Brand identity)
  - Hit 4: (From Door War - e.g., Soft launch)
```

**Taskwarrior Implementation:**

**Weekly Fire Map Creation (Sunday):**

```bash
#!/bin/bash
# fire-map-create.sh - Auto-generate Fire Map from Focus Map

WEEK_START=$(date -d "next monday" +%Y-%m-%d)
WEEK_END=$(date -d "next sunday" +%Y-%m-%d)

# BODY Domain
task add "Training Push Day" domain:body alphatype:hit hit_number:1 due:monday +fire
task add "Meal prep for week" domain:body alphatype:hit hit_number:2 due:sunday +fire
task add "Morning supplement stack" domain:body alphatype:hit hit_number:3 recur:daily due:monday +fire
task add "Sleep protocol (10pm cutoff)" domain:body alphatype:hit hit_number:4 recur:daily due:monday +fire

# BEING Domain
task add "VOICE: Process McDonald's pattern" domain:being alphatype:hit hit_number:1 due:tuesday +fire +voice
task add "20min Neigong daily" domain:being alphatype:hit hit_number:2 recur:daily due:monday +fire
task add "Evening journaling" domain:being alphatype:hit hit_number:3 recur:daily due:monday +fire
task add "Read Tantra chapter" domain:being alphatype:hit hit_number:4 due:thursday +fire

# BALANCE Domain
task add "Thank X for support" domain:balance alphatype:hit hit_number:1 due:monday +fire
task add "Call Y (friend check-in)" domain:balance alphatype:hit hit_number:2 due:wednesday +fire
task add "Message Z (gratitude)" domain:balance alphatype:hit hit_number:3 due:friday +fire
task add "Family video call" domain:balance alphatype:hit hit_number:4 due:sunday +fire

# BUSINESS Domain (from DOOR War Stack)
task add "Skool vs Patreon decision" domain:business alphatype:hit hit_number:1 door_name:"Vitaltrainer Community" due:friday +fire +door
task add "Draft first post" domain:business alphatype:hit hit_number:2 door_name:"Vitaltrainer Community" due:monday +fire +door
task add "Brand identity defined" domain:business alphatype:hit hit_number:3 door_name:"Vitaltrainer Community" due:wednesday +fire +door
task add "Soft launch announcement" domain:business alphatype:hit hit_number:4 door_name:"Vitaltrainer Community" due:sunday +fire +door
```

**Fire Map Reports:**

```ini
# .taskrc

# Weekly Fire (all +fire tasks)
report.fire.description=Weekly Fire Map (16 hits)
report.fire.columns=id,domain,hit_number,description,due,status.short
report.fire.labels=ID,Domain,Hit#,Task,Due,S
report.fire.filter=+fire due.after:today-7days due.before:today+7days status:pending
report.fire.sort=domain+,hit_number+

# Fire Summary (completion rate)
report.firew.description=Fire Map weekly summary
report.firew.columns=domain,end,description
report.firew.labels=Domain,Done,Task
report.firew.filter=+fire end.after:today-7days
report.firew.sort=domain+,end-

# Fire Score (how many hits completed)
# Run: task +fire end.after:today-7days status:completed count
# Goal: 16/16
```

**Daily Fire Check:**
```bash
# Morning: What's on fire today?
task +fire due:today

# Evening: Did I hit today's fires?
task +fire due:today status:completed
```

### ClaudeWarrior Fire Map Automation

**Sunday Evening (Fire Map Setup):**
1. Read current FOCUS_MAP (monthly mission)
2. Read active DOOR (from Freedom Map)
3. Generate 16 Fire tasks (4 per domain)
4. Create in Taskwarrior with +fire tag
5. Export to Obsidian Daily Note template (Monday note)

**Monday-Sunday (Daily Fire Tracking):**
- Morning notification: "Today's Fire: {count} tasks"
- Midday check-in (if < 50% done by 2pm): "Fire at risk: {list undone tasks}"
- Evening summary: "Fire score: {completed}/{total} ({percentage}%)"

**Sunday Review (Fire Map Close):**
1. Calculate Fire Score: `task +fire end.after:today-7days count`
2. Update FIRE_MAP.md with weekly stats
3. Identify patterns (which domain struggled? which thrived?)
4. Feed insights to next week's Fire Map
5. Update General's Tent review (Component #1: Return & Report)

### Google Calendar Sync

All +fire tasks sync to dedicated "Fire Map" calendar:
- Morning tasks (due:morning) → 6am-9am block
- Afternoon tasks (due:afternoon) → 2pm-5pm block
- Evening tasks (due:evening) → 7pm-10pm block
- No due time → All-day event

**Sync command:**
```bash
claudewarrior sync-fire-to-gcal
```

Runs every 30min via cron (or manual trigger).
```

**ClaudeWarrior Role:**
- Auto-generates 16 Fire tasks every Sunday from Focus Map + Door War Stack
- Tracks daily Fire completion (morning reminder, evening summary)
- Syncs +fire tasks to Google Calendar (Fire Map calendar)
- Calculates weekly Fire Score (Sunday review)

---

## 🔧 TASKWARRIOR UDA & TAG SYSTEM

### Complete UDA Definitions

**Add to `~/.taskrc`:**

```ini
# ============================================================================
# ALPHAOS CUSTOM UDAs (User Defined Attributes)
# ============================================================================

# Pillar (Elliott Hulse's 5 Pillars)
uda.pillar.type=string
uda.pillar.label=Pillar
uda.pillar.values=code,core,voice,door,game

# Domain (Core 4 Domains)
uda.domain.type=string
uda.domain.label=Domain
uda.domain.values=body,being,balance,business

# AlphaType (Task type in AlphaOS system)
uda.alphatype.type=string
uda.alphatype.label=Type
uda.alphatype.values=daily,door,strike,hit,hit1,hit2,hit3,hit4,big,little,sand,focus,freedom,frame,ipw,voice,map,warstack

# Points (for 28-or-Die tracking)
uda.points.type=numeric
uda.points.label=Pts
uda.points.default=0

# Door Name (for Door system)
uda.door_name.type=string
uda.door_name.label=Door

# Hit Number (1-4 for War Stack)
uda.hit_number.type=numeric
uda.hit_number.label=Hit#
uda.hit_number.values=1,2,3,4

# ============================================================================
# ALPHAOS CUSTOM REPORTS
# ============================================================================

# --- CORE REPORTS ---

# Daily Core4 (8 tasks, 4 points)
report.core.description=Daily Core4 tasks (28-or-Die)
report.core.columns=id,domain,description,points,status.short
report.core.labels=ID,Domain,Task,Pts,S
report.core.filter=alphatype:daily due:today
report.core.sort=domain+

# Weekly 28-or-Die score
report.28.description=Weekly 28-or-Die score
report.28.columns=id,end,domain,description,points
report.28.labels=ID,Done,Domain,Task,Pts
report.28.filter=alphatype:daily end.after:today-7days
report.28.sort=end-,domain+

# --- FIRE REPORTS ---

# Weekly Fire Map (16 hits)
report.fire.description=Weekly Fire Map (16 hits across 4 domains)
report.fire.columns=id,domain,hit_number,description,due,status.short
report.fire.labels=ID,Domain,Hit#,Task,Due,S
report.fire.filter=+fire due.after:today status:pending
report.fire.sort=domain+,hit_number+

# Fire Summary (completion rate)
report.firew.description=Fire Map weekly summary (completed)
report.firew.columns=domain,end,description
report.firew.labels=Domain,Done,Task
report.firew.filter=+fire end.after:today-7days
report.firew.sort=domain+,end-

# --- DOOR REPORTS ---

# Hot List (War Stack candidates)
report.hot.description=Hot List (War Stack candidates)
report.hot.columns=id,project,description,urgency
report.hot.labels=ID,Project,Potential Door,Urg
report.hot.filter=+warstack status:pending
report.hot.sort=urgency-

# Active Doors
report.door.description=Active Doors with Hit Lists
report.door.columns=id,door_name,hit_number,description,due,status.short
report.door.labels=ID,Door,Hit#,Task,Due,S
report.door.filter=+door status:pending
report.door.sort=door_name+,hit_number+

# Hit List (weekly)
report.hit.description=Weekly Hit List (4 Hits per Door)
report.hit.columns=id,door_name,hit_number,description,due
report.hit.labels=ID,Door,Hit#,Task,Due
report.hit.filter=+hit due.after:today due.before:today+7days
report.hit.sort=door_name+,hit_number+

# Weekly War summary
report.war.description=Weekly War results (completed Hits)
report.war.columns=id,door_name,end,description
report.war.labels=ID,Door,Completed,Task
report.war.filter=+door end.after:today-7days
report.war.sort=door_name+,end-

# --- VOICE REPORTS ---

# VOICE Strikes (tasks born from VOICE sessions)
report.voice-strikes.description=Tasks from VOICE sessions
report.voice-strikes.columns=id,domain,description,urgency,due
report.voice-strikes.labels=ID,Domain,Strike,Urg,Due
report.voice-strikes.filter=pillar:voice status:pending
report.voice-strikes.sort=urgency-

# --- FOCUS/FREEDOM REPORTS ---

# Monthly Focus Mission
report.focus.description=Monthly Focus Mission tasks
report.focus.columns=id,project,domain,description,due
report.focus.labels=ID,Project,Domain,Task,Due
report.focus.filter=alphatype:focus status:pending
report.focus.sort=due+,project+

# Annual Freedom Map
report.freedom.description=Annual Freedom Map tasks (Doors)
report.freedom.columns=id,door_name,project,description,due
report.freedom.labels=ID,Door,Project,Task,Due
report.freedom.filter=alphatype:freedom status:pending
report.freedom.sort=door_name+,due+

# --- CLAUDEWARRIOR REPORTS ---

# ClaudeWarrior managed tasks
report.cw.description=ClaudeWarrior managed tasks
report.cw.columns=id,project,description,urgency,due
report.cw.labels=ID,Project,Task,Urg,Due
report.cw.filter=+claudewarrior status:pending
report.cw.sort=urgency-
```

### Tag System

**Core Tags:**
- `+fire` - Weekly Fire Map tasks (16 total, 4 per domain)
- `+firew` - Weekly variant of +fire
- `+hit` - Hit List items (4 per Door)
- `+door` - Door tasks (active projects)
- `+warstack` - Hot List (potential Doors, urgency 15.0)
- `+core4` - Daily Core4 tasks (8 total, 2 per domain)
- `+voice` - Tasks from VOICE sessions
- `+claudewarrior` - Managed by ClaudeWarrior agent

**Domain-Specific Tags:**
- `+fitness` - BODY domain fitness tasks
- `+fuel` - BODY domain nutrition tasks
- `+meditation` - BEING domain meditation
- `+memoirs` - BEING domain journaling/VOICE
- `+gratitude` - BALANCE domain relationship deposits
- `+discover` - BUSINESS domain learning
- `+declare` - BUSINESS domain teaching

**Project Tags:**
- `+fadaro` - FADARO brand work
- `+vitaldojo` - Vital Dojo community
- `+vitaltrainer` - Vitaltrainer Ausbildung

---

## 🗄️ OBSIDIAN INTEGRATION

### Plugin Architecture

**Required Plugins:**

1. **Tasks** (by schemar)
   - Parses Markdown tasks with emoji syntax
   - Syncs to Taskwarrior via custom adapter
   - Supports due dates, priorities, recurrence

2. **Dataview**
   - Queries Taskwarrior data via custom JS
   - Live Fire Map views in Daily Notes
   - 28-or-Die score calculation

3. **Obsidian-Tasks-Calendar**
   - Visual calendar of due dates
   - Shows Fire Map weekly overview
   - Click date to see tasks

4. **Templater** (optional, for automation)
   - Auto-populate Daily Notes with Fire tasks
   - Template for VOICE → Strike workflow

### Daily Notes Template

**Location:** `/home/alpha/AlphaOs-Vault/VOICE/templates/daily-claudewarrior.md`

**Template Structure:**

```markdown
---
date: {{date:YYYY-MM-DD}}
type: daily-note
tags: [daily-core, fire-map]
---

# {{date:dddd, MMMM DD, YYYY}}

## 🔥 Fire Map Today

```dataviewjs
// Query Taskwarrior for today's +fire tasks
const { execSync } = require('child_process');
const output = execSync('task +fire due:today export').toString();
const tasks = JSON.parse(output);

dv.table(
  ["Domain", "Hit#", "Task", "Status"],
  tasks.map(t => [
    t.domain,
    t.hit_number || '-',
    t.description,
    t.status === 'completed' ? '✅' : '⬜'
  ])
);
```

**Score:** {{fire_score}}/{{fire_total}}

## 💪 Core 4 Today (4 points)

### BODY (1pt = .5 Fitness + .5 Fuel)
- [ ] Fitness: {{body_fitness_task}} #body/fitness ⏫ 📅 {{date:YYYY-MM-DD}}
- [ ] Fuel: {{body_fuel_task}} #body/fuel ⏫ 📅 {{date:YYYY-MM-DD}}

### BEING (1pt = .5 Meditation + .5 Memoirs)
- [ ] Meditation: {{being_meditation_task}} #being/meditation ⏫ 📅 {{date:YYYY-MM-DD}}
- [ ] Memoirs: {{being_memoirs_task}} #being/memoirs ⏫ 📅 {{date:YYYY-MM-DD}}

### BALANCE (1pt = .5 Person1 + .5 Person2)
- [ ] Person #1: {{balance_person1_task}} #balance/person1 ⏫ 📅 {{date:YYYY-MM-DD}}
- [ ] Person #2: {{balance_person2_task}} #balance/person2 ⏫ 📅 {{date:YYYY-MM-DD}}

### BUSINESS (1pt = .5 Discover + .5 Declare)
- [ ] Discover: {{business_discover_task}} #business/discover ⏫ 📅 {{date:YYYY-MM-DD}}
- [ ] Declare: {{business_declare_task}} #business/declare ⏫ 📅 {{date:YYYY-MM-DD}}

**Daily Score:** {{daily_score}}/4

## 🎯 Active Doors

```dataviewjs
// Query active Doors (from DOOR_MAP)
const output = execSync('task +door status:pending export').toString();
const doors = JSON.parse(output);

dv.table(
  ["Door", "Hit#", "Task", "Due"],
  doors.map(d => [
    d.door_name,
    d.hit_number,
    d.description,
    d.due
  ])
);
```

## 🗣️ VOICE Sessions

- [[VOICE_{{date:YYYY-MM-DD}}]] - Create if needed

## 📊 Weekly Stats

```dataviewjs
// 28-or-Die weekly score
const output = execSync('task alphatype:daily end.after:today-7days export').toString();
const completed = JSON.parse(output);
const total_points = completed.reduce((sum, t) => sum + (t.points || 0), 0);

dv.paragraph(`**28-or-Die Score:** ${total_points}/28`);
```

## Notes

{{daily_notes}}
```

**Obsidian-Tasks → Taskwarrior Sync:**

Custom adapter script (Python):

```python
#!/usr/bin/env python3
# ~/.config/obsidian/sync-tasks-to-taskwarrior.py

import re
import subprocess
from pathlib import Path

VAULT_PATH = Path.home() / "AlphaOs-Vault"
DAILY_NOTES = VAULT_PATH / "VOICE" / "templates"

def parse_obsidian_task(line):
    """
    Parse Obsidian task format:
    - [ ] Task description #domain/subdomain ⏫ 📅 2025-11-27

    Returns: {description, domain, priority, due}
    """
    task = {}

    # Extract description
    match = re.match(r'- \[ \] (.+?) #', line)
    if match:
        task['description'] = match.group(1)

    # Extract domain tag
    match = re.search(r'#(\w+)/(\w+)', line)
    if match:
        task['domain'] = match.group(1)
        task['subdomain'] = match.group(2)

    # Extract priority (⏫ = high)
    if '⏫' in line:
        task['priority'] = 'H'

    # Extract due date
    match = re.search(r'📅 (\d{4}-\d{2}-\d{2})', line)
    if match:
        task['due'] = match.group(1)

    return task

def create_taskwarrior_task(task):
    """
    Create Taskwarrior task with AlphaOS UDAs
    """
    cmd = ['task', 'add', task['description']]

    if 'domain' in task:
        cmd.append(f"domain:{task['domain']}")

    if 'due' in task:
        cmd.append(f"due:{task['due']}")

    if 'priority' in task:
        cmd.append(f"priority:{task['priority']}")

    # Infer alphatype from subdomain
    subdomain_map = {
        'fitness': 'daily',
        'fuel': 'daily',
        'meditation': 'daily',
        'memoirs': 'daily',
        'person1': 'daily',
        'person2': 'daily',
        'discover': 'daily',
        'declare': 'daily'
    }

    if task.get('subdomain') in subdomain_map:
        cmd.append(f"alphatype:{subdomain_map[task['subdomain']]}")
        cmd.append(f"points:0.5")
        cmd.append('+core4')

    subprocess.run(cmd)

def sync_daily_note(date_str):
    """
    Sync all tasks from daily note to Taskwarrior
    """
    note_path = DAILY_NOTES / f"daily-{date_str}.md"

    if not note_path.exists():
        return

    with open(note_path, 'r') as f:
        for line in f:
            if line.startswith('- [ ]'):
                task = parse_obsidian_task(line)
                if task:
                    create_taskwarrior_task(task)

if __name__ == '__main__':
    import sys
    date = sys.argv[1] if len(sys.argv) > 1 else 'today'
    sync_daily_note(date)
```

**Usage:**
```bash
# Sync today's Daily Note
~/.config/obsidian/sync-tasks-to-taskwarrior.py

# Sync specific date
~/.config/obsidian/sync-tasks-to-taskwarrior.py 2025-11-27
```

**Auto-sync via Obsidian plugin hook:**

Install `obsidian-shell-commands` plugin, create command:
```bash
~/.config/obsidian/sync-tasks-to-taskwarrior.py {{date:YYYY-MM-DD}}
```

Trigger: On file save (for Daily Notes only).

---

## 🤖 CLAUDEWARRIOR ROLE IN ALPHAOS

### Core Responsibilities

ClaudeWarrior is the **Intelligence Layer** between:
- TodoWrite (ephemeral session tasks)
- Taskwarrior (persistent task database)
- Obsidian (visualization & daily interface)
- AlphaOS Maps (strategic context)

**Primary Functions:**

1. **Smart Migration (TodoWrite → Taskwarrior)**
   - Threshold-based (5+ todos → migrate oldest)
   - Pattern-based (FADARO.*, Project:*, #tw tag)
   - Size-based (multi-step tasks → Taskwarrior)

2. **UDA Inference**
   - Analyzes todo content to infer `pillar`, `domain`, `alphatype`
   - Example: "FADARO blog post" → `project:FADARO.Blog domain:business pillar:voice`

3. **Fire Map Automation**
   - Generates 16 Fire tasks every Sunday (4 per domain)
   - Reads Focus Map + active Doors to populate tasks
   - Syncs to Google Calendar

4. **War Stack Management**
   - Creates 4 Hits per Door (from War Stack FACT/OBSTACLE/STRIKE)
   - Tracks Hit progression (1→2→3→4)
   - Warns if Door at risk (< 2 Hits by Wednesday)

5. **CLAUDE.md Maintenance** (Future)
   - Updates CLAUDE.md files when Maps change
   - Tracks Domino Door dependencies
   - Syncs Frame updates → Freedom/Focus/Fire cascade

### When to Use TodoWrite vs Taskwarrior

**TodoWrite (Ephemeral):**
- Quick wins (single action, < 30min)
- Session-specific tasks ("Debug this bug", "Run tests")
- Exploratory work ("Research X", "Investigate Y")
- Temporary tracking during active coding

**Taskwarrior (Persistent):**
- Multi-step tasks (3+ actions)
- Project-defining work (Doors, Hits)
- Fire Map tasks (weekly strikes)
- Recurring tasks (Core4 daily, weekly reviews)
- Strategic tasks (from Freedom/Focus Maps)

**ClaudeWarrior decides based on:**
1. **Explicit tags:** `#tw` → always migrate
2. **Project patterns:** `FADARO.*`, `Project:*` → migrate
3. **Threshold:** 5+ todos → suggest migrating oldest
4. **Complexity:** Multi-step implied (e.g., "Implement auth (schema + API + frontend)") → suggest migration + breakdown
5. **Context:** If session changes direction → preserve todos in Taskwarrior

### Fire Map Support

**Sunday Evening (Fire Map Setup):**

ClaudeWarrior workflow:
1. **Read context:**
   - `/home/alpha/AlphaOs-Vault/GAME/Focus/` (current monthly mission)
   - `/home/alpha/AlphaOs-Vault/GAME/Freedom/` (active Doors)
   - `/home/alpha/AlphaOs-Vault/DOOR/` (War Stacks for this week)

2. **Generate 16 tasks:**
   - BODY: 4 hits (2 fitness, 1 fuel, 1 recovery)
   - BEING: 4 hits (1 VOICE, 1 meditation, 1 journaling, 1 study)
   - BALANCE: 4 hits (2 gratitude, 1 social, 1 family)
   - BUSINESS: 4 hits (from active Door's War Stack)

3. **Create in Taskwarrior:**
   ```bash
   task add "Training Push Day" domain:body alphatype:hit hit_number:1 due:monday +fire
   # ... (15 more)
   ```

4. **Export to Obsidian:**
   - Update `/home/alpha/AlphaOs-Vault/VOICE/templates/daily-claudewarrior.md`
   - Pre-populate Monday's Daily Note with Fire tasks

**Daily Monitoring:**
- Morning: "Today's Fire: {list tasks}"
- Midday (if < 50% done): "Fire at risk: {remaining tasks}"
- Evening: "Fire score: {completed}/{total}"

**Sunday Review:**
- Calculate weekly Fire Score: `task +fire end.after:today-7days count`
- Update `FIRE_MAP.md` with stats
- Feed insights to next week's Fire Map

### Hot List / Hit List Support

**Hot List (Potential → Plan):**

ClaudeWarrior detects:
- New project ideas in TodoWrite or Obsidian
- Suggests adding to Hot List: `task add "X" +warstack urgency:15.0`

**Hit List (Plan → Production):**

ClaudeWarrior assists:
- When user selects Door from Hot List
- Prompts: "Create War Stack for this Door? (4 Hits = FACT/OBSTACLE/STRIKE)"
- Auto-generates 4 Hit tasks with progressive due dates (Mon/Wed/Fri/Sun)

**Example:**

User says: "I want to work on Vital Dojo Community this week"

ClaudeWarrior:
```
I see "Vital Dojo Community" in your Freedom Map. Should I:

1. Create War Stack (4 Hits) for this week?
2. Use existing War Stack from DOOR_MAP?

If new, I'll prompt you for:
- Hit 1: FACT (measurable result)
- Hit 2: FACT
- Hit 3: FACT
- Hit 4: FACT

Then create Taskwarrior tasks with:
- door_name:"Vital Dojo Community"
- hit_number:1-4
- +door +hit tags
- due dates: Mon/Wed/Fri/Sun
```

### VOICE Session Integration

**Workflow:**

1. **User completes VOICE session** (e.g., `VOICE_McDonald-Pattern.md`)
2. **ClaudeWarrior detects new VOICE file** (monitors `/home/alpha/AlphaOs-Vault/VOICE/`)
3. **Analyzes STRIKE section:**
   - Extracts actionable tasks from STRIKE phase
   - Infers domain from VOICE topic (e.g., "McDonald's Pattern" → `domain:body`)
4. **Suggests Taskwarrior creation:**
   ```
   I found a new VOICE session: "McDonald's Pattern"

   STRIKE detected: "Meal prep Sunday for week"

   Should I create this task?

   task add "Meal prep Sunday for week" \
     domain:body \
     alphatype:strike \
     pillar:voice \
     project:BODY.Fuel \
     due:sunday \
     recur:weekly \
     +voice-strike

   Annotate with VOICE session? (yes/no)
   ```

5. **If yes:**
   - Creates task
   - Annotates: `task {id} annotate "From VOICE: VOICE_McDonald-Pattern.md"`
   - Links in VOICE_MAP.md

**Tracking:**
```bash
# All VOICE-born tasks
task pillar:voice

# VOICE → Action conversion rate
echo "VOICE sessions: $(ls VOICE/2025_Q4/*.md | wc -l)"
echo "VOICE strikes completed: $(task pillar:voice status:completed end.after:2025-11-01 count)"
```

---

## 🗓️ GENERAL'S TENT INTEGRATION

### The Weekly Review Ritual

**When:** Sunday evening (18:00)
**Duration:** 30-60 minutes
**Location:** `/home/alpha/AlphaOs-Vault/GAME/Tent/`
**Tool:** `tent` command (CLI wrapper)

**The Fourfold Strategy Session:**

#### Component #1: Return & Report

**Taskwarrior Queries:**

```bash
# Annual Freedom Maps status
task alphatype:freedom status:pending

# Monthly Focus Mission momentum
task alphatype:focus status:pending

# Weekly Fire War results
task +fire end.after:today-7days status:completed count
task +fire due.before:today status:pending count  # Overdue = loss

# Alpha Score (Daily Game)
echo "=== Core 4 (28-or-Die) ==="
task alphatype:daily end.after:today-7days export | \
  jq '[.[] | .points] | add'
echo "Goal: 28/28"

echo "=== Stack (VOICE Sessions) ==="
ls VOICE/2025_Q4/*.md | grep $(date -d "last sunday" +%Y-%m-%d) | wc -l
echo "Goal: 7/7"

echo "=== Door (Hits Completed) ==="
task +hit +door end.after:today-7days status:completed count
echo "Goal: 4/4 per Door"
```

**ClaudeWarrior Auto-Report:**

`claudewarrior tent report` outputs:

```
═══════════════════════════════════════════════════════════
   GENERAL'S TENT - WEEKLY REPORT
   Week of: 2025-11-25 to 2025-12-01
═══════════════════════════════════════════════════════════

COMPONENT #1: RETURN & REPORT

FREEDOM MAPS (Annual Goals):
  ✅ Vitaltrainer Zertifikat: ON TRACK (Phase 2/5)
  ✅ Vital Dojo Community: ON TRACK (Week 2/16)

FOCUS MAPS (Monthly Mission):
  ⚠️  November Mission: LOSING STEAM (40% complete, should be 75%)

FIRE MAPS (Weekly War):
  ✅ WON (14/16 hits completed = 87.5%)
  Missed: BEING Hit 3, BALANCE Hit 4

ALPHA SCORE (Daily Game):
  Core 4: 24/28 (85.7%) ⚠️
    BODY: 6/7 ⚠️
    BEING: 5/7 ⚠️
    BALANCE: 6/7 ⚠️
    BUSINESS: 7/7 ✅

  Stack (VOICE): 3/7 ⚠️ (Irregular practice)

  Door (Hits): 4/4 ✅ (Vital Dojo Week 2 complete)

───────────────────────────────────────────────────────────

COMPONENT #2: LESSONS LEARNED

(ClaudeWarrior prompts for manual input here)
```

#### Component #2: Lessons Learned

**Manual Reflection Prompts:**

```
What worked this week?
- {user input}

What didn't work?
- {user input}

Where can I improve?
- {user input}

Cross-domain insights?
- (e.g., "BUSINESS consistency boosted BEING focus")
```

**Taskwarrior Annotation:**

Lessons get added as annotations to completed tasks:

```bash
task 42 annotate "Lesson: X blocker solved by Y approach"
task 43 annotate "Insight: BUSINESS 7/7 because morning Declare ritual"
```

**VOICE Session Creation:**

If pattern detected (e.g., "BEING inconsistent 3 weeks running"), ClaudeWarrior suggests:

```
BEING has been < 6/7 for 3 consecutive weeks.
Pattern detected: "Morning meditation skipped when X happens"

Should I create a VOICE session to address this?
- STOP: Interrupt the "skip meditation" pattern
- SUBMIT: Why is this happening? (Facts/Feelings)
- STRUGGLE: Rewrite the story ("I don't have time" → reality?)
- STRIKE: New protocol (e.g., meditation BEFORE coffee)
```

#### Component #3: Course Correction

**Taskwarrior Drift Detection:**

ClaudeWarrior analyzes:
- Overdue tasks: `task status:pending due.before:today`
- Stale tasks: `task status:pending modified.before:today-7days`
- Unbalanced domains: Did one domain get neglected?

**Example Output:**

```
DRIFT DETECTED:

BALANCE Domain: 3 weeks < 6/7
  Recommendation: Prioritize BALANCE Hits in next Fire Map

Overdue tasks: 2
  - "DEXA scan booking" (14 days overdue)
  - "Call Y for catch-up" (7 days overdue)

Stale Hot List: 5 items > 4 weeks unpromoted
  Recommendation: Archive or promote to Door
```

**Course Correction Actions:**

ClaudeWarrior suggests:
```bash
# Bump BALANCE priority in next Fire Map
task add "BALANCE focus week" domain:balance alphatype:focus due:monday +fire

# Reschedule overdue
task 42 modify due:tomorrow urgency:18.0

# Archive stale Hot List
task +warstack modified.before:today-28days delete
```

#### Component #4: New Targets

**Next Week's Fire Map Generation:**

ClaudeWarrior:
1. Reads current Focus Map (monthly mission)
2. Identifies active Door (from Freedom Map)
3. Incorporates course corrections (e.g., BALANCE priority)
4. Generates 16 new Fire tasks

**Preview:**

```
NEXT WEEK'S FIRE MAP (Preview)

BODY (4 hits):
  1. Training Pull Day
  2. DEXA scan booking (OVERDUE FIX)
  3. Supplement stack adherence
  4. Sleep protocol

BEING (4 hits):
  1. Morning meditation (NON-NEGOTIABLE - course correction)
  2. VOICE: Process BALANCE neglect pattern
  3. Evening journaling
  4. Tantra study

BALANCE (4 hits) ⚠️ PRIORITY DOMAIN
  1. Call Y (overdue fix)
  2. Gratitude to Z
  3. Family video call
  4. Social connection (new friend outreach)

BUSINESS (4 hits):
  From Door: "Vital Dojo Community Week 3"
  1. First module content drafted
  2. Community engagement (respond to all)
  3. Email sequence setup
  4. Week 3 announcement post

Create these tasks? (yes/no)
```

**User confirms → ClaudeWarrior creates all 16 tasks for next week.**

### General's Tent CLI Tool

**Location:** `/home/alpha/bin/tent`

```bash
#!/bin/bash
# General's Tent - Weekly Review Tool

tent report      # Generate Component #1 (Return & Report)
tent lessons     # Prompt for Component #2 (Lessons Learned)
tent drift       # Analyze Component #3 (Course Correction)
tent targets     # Generate Component #4 (New Targets = next Fire Map)
tent full        # Run all 4 components sequentially
```

**Integration with Obsidian:**

Creates review file:

`/home/alpha/AlphaOs-Vault/GAME/Tent/2025-W48-Review.md`

```markdown
# General's Tent - Week 48 (2025-11-25 to 2025-12-01)

## Component #1: Return & Report

{Taskwarrior auto-generated report}

## Component #2: Lessons Learned

- **What worked:** {user input}
- **What didn't:** {user input}
- **Improvements:** {user input}
- **Cross-domain insights:** {user input}

## Component #3: Course Correction

{ClaudeWarrior drift analysis}

**Actions Taken:**
- {list of task modifications}

## Component #4: New Targets

**Next Week's Fire Map:**
- BODY: {4 hits}
- BEING: {4 hits}
- BALANCE: {4 hits}
- BUSINESS: {4 hits}

**Next Week's Door:**
- Door: {name}
- War Stack: {4 hits with FACT/OBSTACLE/STRIKE}

---

**Signed:** alpha + GOD (in sacred communion)
**Next Tent:** 2025-12-08 18:00
```

---

## 📅 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)

**Goal:** Get Taskwarrior + AlphaOS UDAs working

**Tasks:**
1. ✅ Install Taskwarrior 3.x (already done)
2. **Add AlphaOS UDAs to `~/.taskrc`**
   - Copy UDA definitions from this document
   - Test: `task add "Test" domain:body pillar:core alphatype:daily points:0.5`
3. **Create AlphaOS custom reports**
   - Copy report definitions to `~/.taskrc`
   - Test each report: `task fire`, `task core`, `task hot`, `task door`, etc.
4. **Create Pillar Map files**
   - CODE_MAP.md (using template from this document)
   - CORE_MAP.md
   - DOOR_MAP.md
   - Enhance VOICE_MAP.md (add Taskwarrior section)
   - Enhance GAME_MAP.md (add Fire Map integration)

**Success Criteria:**
- Can create tasks with all UDAs
- All reports work (`task fire`, `task core`, `task 28`, etc.)
- Pillar Maps exist and link to Taskwarrior

**Estimated Time:** 3-4 hours

---

### Phase 2: ClaudeWarrior Intelligence (Week 3-4)

**Goal:** Smart TodoWrite → Taskwarrior migration

**Tasks:**
1. **Implement migration logic in ClaudeWarrior agent**
   - Threshold detection (5+ todos)
   - Pattern matching (FADARO.*, Project:*, #tw)
   - UDA inference from context
2. **Create `claudewarrior` CLI tool**
   - `claudewarrior status` (show pending migrations)
   - `claudewarrior migrate {todo_id}` (manual migration)
3. **Test with real sessions**
   - Create 10 TodoWrite items
   - Trigger migrations
   - Verify UDAs correct

**Success Criteria:**
- ClaudeWarrior auto-suggests migrations
- UDAs inferred correctly (90%+ accuracy)
- Can migrate TodoWrite → Taskwarrior in < 10 seconds

**Estimated Time:** 6-8 hours (includes testing)

---

### Phase 3: Fire Map Automation (Week 5-6)

**Goal:** Weekly Fire Map generation + tracking

**Tasks:**
1. **Create Fire Map generation script**
   - `fire-map-create.sh` (reads Focus/Freedom Maps, creates 16 tasks)
   - Test with current week
2. **Implement daily Fire tracking**
   - Morning notification (today's Fire tasks)
   - Midday check-in (if < 50% done)
   - Evening summary (Fire score)
3. **Create `fire` CLI command**
   - `fire create` (generate this week's Fire Map)
   - `fire status` (current Fire score)
   - `fire review` (weekly summary)

**Success Criteria:**
- Can generate 16 Fire tasks in < 30 seconds
- Daily notifications work
- Fire score accurate (`task +fire end.after:today-7days count`)

**Estimated Time:** 5-6 hours

---

### Phase 4: Obsidian Visualization (Week 7-8)

**Goal:** Daily Notes + Dataview queries

**Tasks:**
1. **Install Obsidian plugins**
   - Tasks (by schemar)
   - Dataview
   - Obsidian-Tasks-Calendar
2. **Create Daily Note template**
   - Copy template from this document
   - Add Dataview queries (Fire Map, Core4, 28-or-Die)
3. **Create sync script**
   - `sync-tasks-to-taskwarrior.py` (Obsidian → Taskwarrior)
   - Test with Daily Note
4. **Setup auto-sync**
   - Obsidian shell command (on file save)

**Success Criteria:**
- Daily Note shows today's Fire tasks
- Core4 tasks sync to Taskwarrior on save
- 28-or-Die score calculated correctly

**Estimated Time:** 4-5 hours

---

### Phase 5: General's Tent (Week 9)

**Goal:** Weekly review automation

**Tasks:**
1. **Create `tent` CLI tool**
   - `tent report` (Component #1: Return & Report)
   - `tent lessons` (Component #2 prompt)
   - `tent drift` (Component #3: Course Correction)
   - `tent targets` (Component #4: New Fire Map)
2. **Create Tent review template**
   - Obsidian file: `GAME/Tent/YYYY-Wxx-Review.md`
3. **Test full weekly review**
   - Run `tent full`
   - Verify all 4 components work

**Success Criteria:**
- Can complete full General's Tent review in < 30min
- Review file created in Obsidian
- Next week's Fire Map auto-generated

**Estimated Time:** 3-4 hours

---

### Phase 6: External Sync (Week 10-11) - Optional

**Goal:** TickTick import, Google Calendar sync

**Tasks:**
1. **TickTick integration**
   - Create TickTick API connector
   - Implement `+claudewarrior` tag import
   - Test one-way sync
2. **Google Calendar sync**
   - Setup OAuth for nimmsel23@gmail.com
   - Create Fire Map calendar
   - Sync +fire tasks to calendar
3. **Calcure integration**
   - Configure Calcure to show Taskwarrior tasks
   - Test terminal calendar view

**Success Criteria:**
- TickTick tasks with `+claudewarrior` import to Taskwarrior
- Fire Map tasks visible in Google Calendar
- Calcure shows this week's Fire tasks

**Estimated Time:** 6-8 hours (if pursued)

---

### Phase 7: CLAUDE.md Maintenance (Week 12) - Future

**Goal:** Auto-update CLAUDE.md files on Map changes

**Tasks:**
1. **Create Taskwarrior hooks**
   - `on-modify.claudewarrior` (detect Map-related task changes)
   - Trigger CLAUDE.md update when Frame/Freedom/Focus/Fire changes
2. **Implement CLAUDE.md update logic**
   - Parse Map files
   - Update relevant sections
   - Maintain Last Updated timestamps
3. **Test cascade updates**
   - Change Frame Map → verify Freedom/Focus/Fire adjust

**Success Criteria:**
- CLAUDE.md auto-updates when Maps change
- Cascade logic works (Frame → Freedom → Focus → Fire)
- No manual maintenance needed

**Estimated Time:** 8-10 hours (complex, future work)

---

## 🎯 SUCCESS METRICS

### How to Know This Integration is Working

**Weekly Metrics:**

1. **Fire Map Win Rate**
   - Goal: 14+/16 hits completed (87.5%+)
   - Query: `task +fire end.after:today-7days status:completed count`

2. **28-or-Die Score**
   - Goal: 26+/28 (93%+)
   - Query: `task alphatype:daily end.after:today-7days export | jq '[.[] | .points] | add'`

3. **Door Completion Rate**
   - Goal: 3+/4 Hits per Door (75%+)
   - Query: `task +door end.after:today-7days status:completed count`

4. **VOICE → Action Conversion**
   - Goal: 50%+ of VOICE sessions produce Taskwarrior strikes
   - Query: `task pillar:voice status:completed count` vs `ls VOICE/*.md | wc -l`

**Monthly Metrics:**

1. **Freedom Map Progress**
   - Are annual Doors on track?
   - Query: `task alphatype:freedom` (manual review)

2. **Focus Map Completion**
   - Did monthly mission achieve 80%+ of targets?
   - Query: `task alphatype:focus end.after:today-30days status:completed count`

3. **Domain Balance**
   - All 4 domains get attention (no domain < 20% of weekly points)
   - Query: `task domain:body domain:being domain:balance domain:business end.after:today-30days export | jq 'group_by(.domain) | map({domain: .[0].domain, points: map(.points) | add})'`

**Qualitative Metrics:**

- **No Lost Context:** User never loses a todo when sessions change
- **Minimal Friction:** Migration suggestions don't interrupt flow
- **Strategic Alignment:** Tasks clearly map to Maps (Fire → Focus → Freedom → IPW)
- **DOMINION Visibility:** Can answer "Do I have DOMINION in X domain?" via Taskwarrior query

---

## 🔚 CLOSING: THE WARRIOR'S TRUTH

**Alpha, this integration is not optional.**

Maps without execution are fantasies.
Tasks without strategy are chaos.
Taskwarrior is your execution engine.
AlphaOS is your strategic mind.
ClaudeWarrior is the bridge between vision and action.

**THE 5 PILLARS DEMAND THIS:**

- **THE CODE** → UDAs enforce Real/Raw/Relevant/Results (no bullshit tasks)
- **THE CORE** → 28-or-Die tracked daily (4 domains, measurable DOMINION)
- **THE VOICE** → Mental Mastery produces Strikes → become Taskwarrior tasks
- **THE DOOR** → Weekly Wars execute via Hit Lists (4 Hits per Door)
- **THE GAME** → Fire Maps navigate via Taskwarrior (16 weekly strikes)

**This is not a productivity hack.**
**This is DOMINION infrastructure.**

**Build it.**
**Use it.**
**Dominate with it.**

---

**Arise, Alpha. Your Fire awaits.**

**— alphaos-oracle + claudewarrior**
**2025-11-27**
