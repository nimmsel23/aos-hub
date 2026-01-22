# GENERAL'S TENT - Strategic Intelligence System

## Overview

General's Tent is **NOT** a simple review form or aggregation dashboard. It is a **Strategic Intelligence Synthesis Engine** that operates across 3 dimensions:

1. **Cross-Domain Synthesis** - Pattern recognition across BODY/BEING/BALANCE/BUSINESS
2. **Temporal Cascade Analysis** - Frame→Freedom→Focus→Fire alignment check
3. **Pipeline Flow Diagnosis** - VOICE→DOOR→FIRE energy flow analysis

## Architecture Philosophy

**Traditional Approach (WRONG):**
```
User fills form → Manual score input → Display aggregated numbers
```

**Strategic Intelligence Approach (CORRECT):**
```
Domain States → Synthesis Engines → Emergent Pattern Recognition → Strategic Insights
```

## The 3 Synthesis Dimensions

### Dimension 1: Cross-Domain Synthesis

**Purpose:** Detect patterns ACROSS domains that aren't visible within single domains.

**Example Patterns:**
- Spiritual Bypassing: BUSINESS 7/7 Core4 while BEING 2/7 = execution without integration
- Foundation Unlocking: BALANCE 6/7 Core4 → unlocked BODY & BUSINESS capacity
- VOICE Integration Gaps: 50+ sessions but no daily practice = material without execution
- Fire without Grounding: Multiple domains low Fire completion = overcommitment
- Domino Door Opportunities: High activity in 2+ domains = synergistic War Stacks possible

**Data Sources:**
- Core4 weekly totals per domain
- Fire Map completion rates
- War Stack counts (active/completed)
- VOICE session counts vs integration status

**Output:**
```json
{
  "patterns": [
    "BUSINESS overemphasis → BEING neglect = Spiritual Bypassing ACTIVE",
    "BALANCE foundation solid → unlocked capacity in other domains"
  ],
  "domain_health": {
    "BODY": { "frame_status": "...", "fire_completion": 0.75, "blocking_pattern": "none" },
    "BEING": { "frame_status": "...", "fire_completion": 0.50, "blocking_pattern": "no_daily_ritual" },
    "BALANCE": { "frame_status": "...", "fire_completion": 1.0, "blocking_pattern": "none" },
    "BUSINESS": { "frame_status": "...", "fire_completion": 1.0, "blocking_pattern": "bypassing_being" }
  },
  "insights": [
    {
      "type": "spiritual_bypass",
      "severity": "high",
      "description": "BUSINESS execution (Core4: 7/7) is high while BEING practice (Core4: 5/7) is low.",
      "recommendation": "Reduce BUSINESS Fire Hits from 4 to 3. Add BEING Fire Hit: 'Meditation 20min daily'."
    }
  ],
  "overall_balance": 0.82
}
```

### Dimension 2: Temporal Cascade Analysis

**Purpose:** Check alignment across time horizons (weekly → quarterly → annual → 10-year).

**Cascade Levels:**
1. **Fire → Focus:** Do weekly Hits serve monthly mission?
2. **Focus → Freedom:** Does monthly mission serve 10-year vision (IPW)?
3. **Freedom → Frame:** Does 10-year vision align with current reality?

**Cascade Breakdown Detection:**
```
Example: BUSINESS Domain
├─ Fire Hits (weekly): 4/4 completed ✓
├─ Focus Mission (Q1-2026): "Platform Setup" ✓
├─ Freedom Vision: "Teaching Platform + Financial Freedom" ✓
└─ Frame Reality: "Executing (shifted from Planning Nov 2025)" ✓

Cascade Health: ALIGNED (Fire serves Focus, Focus serves Freedom, Freedom matches Frame)
```

**Blocked Cascade Example:**
```
Example: BEING Domain
├─ Fire Hits (weekly): 2/4 completed ⚠️
├─ Focus Mission (Q1-2026): "Daily Practice" ✗ NOT SERVED
├─ Freedom Vision: "Integration through Teaching" ✗ BLOCKED
└─ Frame Reality: "Material rich, practice poor" ✗ MISALIGNED

Cascade Health: BLOCKED at Fire→Focus level
Impact: Long-term vision cannot manifest
Correction: Add BEING Fire Hit "Meditation 20min daily" to serve Focus mission
```

**Frame Shift Detection:**

When Frame shifts (e.g., BUSINESS "Planning" → "Executing"), cascade updates cascade:
1. Frame shift detected (date, new status)
2. Freedom Map needs update (new Frame context)
3. Focus mission needs realignment
4. Fire Hits need re-prioritization

**Output:**
```json
{
  "cascade_health": {
    "BODY": { "fire_to_focus": "aligned", "focus_to_freedom": "aligned", "freedom_to_frame": "partial" },
    "BEING": { "fire_to_focus": "blocked", "focus_to_freedom": "blocked", "freedom_to_frame": "blocked" },
    "BALANCE": { "fire_to_focus": "aligned", "focus_to_freedom": "aligned", "freedom_to_frame": "aligned" },
    "BUSINESS": { "fire_to_focus": "aligned", "focus_to_freedom": "aligned", "freedom_to_frame": "aligned" }
  },
  "blockers": [
    {
      "domain": "BEING",
      "level": "fire_to_focus",
      "description": "BEING Fire Hits this week do NOT serve Focus mission 'Daily Practice'",
      "impact": "Focus mission will not progress",
      "correction": "Add BEING Fire Hit: 'Meditation 20min daily'"
    }
  ],
  "frame_shifts": [
    {
      "domain": "BUSINESS",
      "date": "2025-11-20",
      "days_ago": 59,
      "new_status": "Executing",
      "cascade_updates_needed": ["Update Freedom Map", "Adjust Focus mission", "Re-align Fire Hits"]
    }
  ],
  "overall_alignment": 0.75
}
```

### Dimension 3: Pipeline Flow Diagnosis

**Purpose:** Analyze VOICE → DOOR → FIRE energy flow (mental insights → tactical plans → physical execution).

**Pipeline Stages:**
1. **VOICE → DOOR:** STRIKE insights converting to War Stacks?
2. **DOOR → FIRE:** War Stack Hits converting to Fire Map execution?

**Healthy Pipeline:**
```
VOICE (STRIKE) → War Stack (4 Hits) → Fire Map (4/4 completed)
Example: BUSINESS Domain
├─ VOICE: "Platform Setup NOW" (Nov 20 session)
├─ DOOR: War Stack "FADARO Launch" (4 Hits)
└─ FIRE: 4/4 Hits completed this week

Pipeline Health: 90% (VOICE→DOOR: 90%, DOOR→FIRE: 90%)
```

**Blocked Pipeline:**
```
VOICE (50+ sessions) → No War Stacks → No Fire Hits
Example: BEING Domain
├─ VOICE: 50+ sessions accumulated
├─ DOOR: 0 active War Stacks
└─ FIRE: 2/4 Hits (none from VOICE insights)

Pipeline Health: 20% (VOICE→DOOR: 20%, DOOR→FIRE: 0%)
Issue: Mental insights not converting to execution
Correction: Create War Stack "BEING Daily Foundation" from VOICE sessions
```

**Output:**
```json
{
  "pipeline_health": {
    "BODY": { "voice_to_door": 0.5, "door_to_fire": 0.9, "overall": 0.7 },
    "BEING": { "voice_to_door": 0.2, "door_to_fire": 0.0, "overall": 0.1 },
    "BALANCE": { "voice_to_door": 0.9, "door_to_fire": 0.9, "overall": 0.9 },
    "BUSINESS": { "voice_to_door": 0.9, "door_to_fire": 0.9, "overall": 0.9 }
  },
  "issues": [
    {
      "domain": "BEING",
      "stage": "voice_to_door",
      "severity": "high",
      "description": "BEING has 50 VOICE sessions but 0 active War Stacks",
      "impact": "VOICE material remains theoretical. No execution channel.",
      "correction": "Create War Stack from latest VOICE STRIKE. Extract 4 Hits from VOICE insights."
    }
  ],
  "flow": [
    {
      "domain": "BUSINESS",
      "voice_strike": "Platform Setup NOW...",
      "war_stacks_active": 2,
      "fire_hits_count": 4,
      "fire_completion": 100,
      "pipeline_health": 90
    }
  ],
  "overall_health": 0.65
}
```

## Domain-State System

### Purpose

Track strategic state for each domain (BODY/BEING/BALANCE/BUSINESS) across all centres (Frame/Freedom/Focus/Fire).

**Storage:** `~/AlphaOS-Vault/.states/{DOMAIN}.json`

**Schema:** `domain-state-schema.json` (see separate file)

### Domain-State Structure

```json
{
  "domain": "BUSINESS",
  "version": "1.0.0",
  "updated_at": "2026-01-18T...",
  "week": "2026-W03",

  "frame": {
    "file": "Game/Frame/BUSINESS_frame.md",
    "title": "BUSINESS Frame Map",
    "status": "Executing (5 Doors active)",
    "last_shift": "2025-11-20",
    "updated_at": "2025-12-15T..."
  },

  "freedom": {
    "file": "Game/Freedom/BUSINESS_freedom.md",
    "title": "BUSINESS Freedom Map",
    "ipw": "Teaching Platform + Financial Freedom + Authority",
    "alignment": "aligned",
    "updated_at": "2025-11-15T..."
  },

  "focus": {
    "file": "Game/Focus/BUSINESS_focus.md",
    "title": "BUSINESS Focus Q1-2026",
    "mission": "FADARO Platform Live (Platform + Content + SEO)",
    "quarter": "Q1-2026",
    "serves_freedom": true,
    "updated_at": "2026-01-01T..."
  },

  "fire": {
    "file": "Game/Fire/BUSINESS_fire_2026-W03.md",
    "week": "2026-W03",
    "hits": [
      { "title": "FADARO content creation", "taskwarrior_uuid": "...", "completed": true },
      { "title": "SEO foundation", "taskwarrior_uuid": "...", "completed": true },
      { "title": "Platform optimization", "taskwarrior_uuid": "...", "completed": true },
      { "title": "Launch announcement prep", "taskwarrior_uuid": "...", "completed": false }
    ],
    "completion": 0.75,
    "serves_focus": true,
    "updated_at": "2026-01-18T..."
  },

  "voice": {
    "latest_session": "VOICE/VOICE-2025-11-20.md",
    "latest_strike": "Platform Setup NOW (from Nov 20 session)",
    "session_count": 12,
    "integrated": true,
    "updated_at": "2025-11-20T..."
  },

  "war_stacks": [
    {
      "file": "Door/War-Stacks/FADARO_Launch.md",
      "title": "FADARO Launch",
      "status": "active",
      "hits_completed": 3,
      "created_at": "2025-11-25"
    },
    {
      "file": "Door/War-Stacks/Vitaltrainer_Ausbildung.md",
      "title": "Vitaltrainer Ausbildung",
      "status": "active",
      "hits_completed": 2,
      "created_at": "2025-10-15"
    }
  ],

  "core4": {
    "week_total": 7,
    "daily_streak": 5,
    "trend": "improving"
  },

  "synthesis": {
    "patterns": ["BUSINESS execution without BEING integration"],
    "blockers": ["Spiritual bypassing active"],
    "cascade_health": {
      "fire_to_focus": "aligned",
      "focus_to_freedom": "aligned",
      "freedom_to_frame": "aligned"
    },
    "pipeline_health": {
      "voice_to_door": 0.9,
      "door_to_fire": 0.9
    }
  }
}
```

### Initial State Generation

When domain-states don't exist, `generateInitialDomainState()` scans vault for:

1. **Frame/Freedom/Focus Maps:** Reads YAML front matter from `Game/{MapType}/{DOMAIN}_{maptype}.md`
2. **Fire Maps:** Finds weekly Fire Map by domain + week in YAML
3. **VOICE Sessions:** Counts sessions mentioning domain, extracts latest STRIKE
4. **War Stacks:** Finds War Stacks with `domain: {DOMAIN}` in YAML
5. **Core4 Metrics:** Reads from `Alpha_Core4/core4_week_{week}.json`

## API Architecture

### Initialization

**POST /api/tent/init**

Generates initial domain-states for all 4 domains if they don't exist.

```bash
curl -X POST http://localhost:8799/api/tent/init
```

Response:
```json
{
  "ok": true,
  "generated": ["BODY", "BEING", "BALANCE", "BUSINESS"],
  "errors": [],
  "message": "Generated 4 domain states"
}
```

### State Access

**GET /api/tent/state/:domain**

Get single domain state.

```bash
curl http://localhost:8799/api/tent/state/BUSINESS
```

**GET /api/tent/states**

Get all domain states.

```bash
curl http://localhost:8799/api/tent/states
```

### Synthesis Engines

**GET /api/tent/synthesis/domains?week=2026-W03**

Cross-domain pattern recognition.

**GET /api/tent/synthesis/temporal?week=2026-W03**

Temporal cascade analysis.

**GET /api/tent/synthesis/pipeline?week=2026-W03**

Pipeline flow diagnosis.

**GET /api/tent/synthesis/complete?week=2026-W03**

All 3 synthesis engines combined + overall scores.

Response:
```json
{
  "ok": true,
  "week": "2026-W03",
  "synthesis": {
    "cross_domain": { ... },
    "temporal_cascade": { ... },
    "pipeline_flow": { ... }
  },
  "domains_analyzed": ["BODY", "BEING", "BALANCE", "BUSINESS"],
  "overall_scores": {
    "domain_balance": 0.82,
    "cascade_alignment": 0.75,
    "pipeline_health": 0.65
  }
}
```

### Component Data (for UI)

**GET /api/tent/component/return-report?week=2026-W03**

Component #1: Return & Report (auto-populated intelligence).

**GET /api/tent/component/lessons?week=2026-W03**

Component #2: Lessons Learned (auto-lessons + VOICE insights).

**GET /api/tent/component/corrections?week=2026-W03**

Component #3: Course Correction (strategic pivots + recommendations).

**GET /api/tent/component/targets?week=2026-W03**

Component #4: New Targets (cascade-aligned Focus/Fire targets + War Stacks needed).

### Persistence

**POST /api/tent/save-weekly**

Save complete weekly Tent session to `~/AlphaOS-Vault/Alpha_Tent/tent_{week}.md`.

```bash
curl -X POST http://localhost:8799/api/tent/save-weekly \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2026-W03",
    "markdown": "# General Tent - 2026-W03\n\n..."
  }'
```

## The 4 Components (UI Structure)

### Component #1: RETURN & REPORT

**NOT:** Manual score input
**BUT:** Automated intelligence synthesis display

**Data Sources:**
- `/api/tent/component/return-report`
- Includes: domain synthesis, temporal synthesis, pipeline synthesis, weekly metrics

**UI Display:**
```
┌─────────────── RETURN & REPORT ────────────────┐
│ DOMAIN STATUS (Cross-Domain Synthesis):        │
│                                                 │
│ 🏋  BODY:     [Frame: Training inconsistent    │
│                Fire: 3/4 ✓ (75% completion)]   │
│                                                 │
│ 🧘 BEING:    [Frame: 50+ VOICE Q3/Q4          │
│                Fire: 2/4 ⚠️ (50% completion)]   │
│                [⚠️ Blocking: No daily ritual]   │
│                                                 │
│ ⚖️  BALANCE:  [Frame: Wien-Sanctuary achieved   │
│                Fire: 4/4 ✓✓✓✓ (100%)]          │
│                                                 │
│ 💼 BUSINESS: [Frame: Executing (5 Doors)      │
│                Fire: 4/4 ✓✓✓✓ (100%)]          │
│                [⚠️ Blocking: Bypassing BEING]   │
│                                                 │
├─────────────── WEEKLY METRICS ────────────────┤
│ Core4:      23/28 this week (82%) ████████░░  │
│ Fire Hits:  13/16 this week (81%) ████████░░  │
│ War Stacks: 3 active, 1 completed              │
│                                                 │
├─────────────── CASCADE HEALTH ────────────────┤
│ Overall Alignment: 75% ███████░░░             │
│                                                 │
│ BEING: Fire ✗→ Focus ✗→ Freedom ✗→ Frame ✗   │
│ [BLOCKED: Fire Hits don't serve Focus]         │
│                                                 │
├─────────────── PIPELINE FLOW ─────────────────┤
│ Overall Health: 65% ██████░░░░                │
│                                                 │
│ BEING: VOICE (50 sessions) → DOOR (0) → FIRE │
│ [BLOCKED: No War Stacks from VOICE]            │
└─────────────────────────────────────────────────┘
```

### Component #2: LESSONS LEARNED

**NOT:** Empty textarea
**BUT:** Auto-populated from synthesis + manual notes

**Data Sources:**
- `/api/tent/component/lessons`
- Auto-lessons from cross-domain/temporal synthesis
- VOICE insights (latest STRIKE per domain)
- Fire reflections (from YAML front matter if exists)

**UI Display:**
```
┌─────────────── LESSONS LEARNED ────────────────┐
│ AUTO-DETECTED PATTERNS:                         │
│                                                  │
│ 1. BEING discipline creates BUSINESS execution  │
│    Evidence: BUSINESS 7/7 Core4 but forced.     │
│    Week with BEING 7/7 (past) = effortless flow.│
│    Source: Cross-domain synthesis                │
│                                                  │
│ 2. Wien-Sanctuary (BALANCE) unlocked capacity   │
│    Evidence: Oct 2025 Frame shift → Nov-Dec     │
│    productivity spike across all domains.       │
│    Source: Temporal cascade analysis             │
│                                                  │
├─────────────── VOICE INSIGHTS ────────────────┤
│ BUSINESS (Nov 20): "Platform Setup NOW"         │
│ Lesson: Action without preparation = bypass.    │
│ Need BEING grounding BEFORE BUSINESS expansion. │
│                                                  │
├─────────────── MANUAL NOTES ──────────────────┤
│ [User adds additional lessons here]             │
│ [Textarea]                                       │
└──────────────────────────────────────────────────┘
```

### Component #3: COURSE CORRECTION

**NOT:** Textarea for corrections
**BUT:** Strategic pivot recommendations + manual input

**Data Sources:**
- `/api/tent/component/corrections`
- Frame shift triggers (cascade updates needed)
- Cascade corrections (alignment issues)
- Domain corrections (cross-domain patterns)
- Pipeline corrections (flow blockages)

**UI Display:**
```
┌─────────────── COURSE CORRECTION ──────────────┐
│ FRAME SHIFT TRIGGERS:                           │
│ BUSINESS (Nov 20, 59 days ago):                 │
│ "Planning" → "Executing"                        │
│ ✓ Freedom updated                               │
│ ✓ Focus updated                                 │
│ ✓ Fire executing                                │
│                                                  │
├─────────────── CASCADE CORRECTIONS ────────────┤
│ BEING: Fire → Focus BLOCKED                     │
│ Issue: Fire Hits don't serve Focus "Daily       │
│ Practice"                                        │
│ Impact: Long-term vision blocked                │
│ Correction: Add BEING Fire Hit "Meditation      │
│ 20min daily" (7-day streak = 1 Hit)             │
│                                                  │
├─────────────── DOMAIN CORRECTIONS ─────────────┤
│ BUSINESS: Overemphasis pattern                  │
│ Issue: 7/7 Core4 = forcing execution            │
│ Correction: Reduce BUSINESS Fire Hits from 4    │
│ to 3 next week. Add buffer for emergence.       │
│ Why: Forcing execution = BEING bypass mechanism │
│                                                  │
├─────────────── RECOMMENDED TARGETS ────────────┤
│ Next Week Fire:                                 │
│ BODY: 4 hits, BEING: 4 hits (+2 from this week)│
│ BALANCE: 3 hits (-1, create buffer)             │
│ BUSINESS: 3 hits (-1, reduce forcing)           │
│                                                  │
├─────────────── MANUAL CORRECTIONS ─────────────┤
│ [User adds strategic pivots here]               │
│ [Textarea]                                       │
└──────────────────────────────────────────────────┘
```

### Component #4: NEW TARGETS

**NOT:** Textarea for targets
**BUT:** Cascade-aligned target generation + manual input

**Data Sources:**
- `/api/tent/component/targets`
- Focus targets (monthly/quarterly aligned to Freedom)
- Fire targets (next week aligned to Focus)
- War Stacks needed (VOICE → DOOR conversion)

**UI Display:**
```
┌─────────────── NEW TARGETS ────────────────────┐
│ FOCUS TARGETS (Aligned Freedom → Focus):       │
│                                                 │
│ BEING (Q1-2026): "Daily meditation 20min →     │
│ Weekly VOICE → Monthly integration"            │
│ Alignment: Freedom "Integration through        │
│ Teaching" → unlocks Vital Dojo delivery        │
│                                                 │
│ BUSINESS (Q1-2026): "FADARO Platform Live      │
│ (content + SEO, delay Launch to Q2)"           │
│ Alignment: Freedom "Teaching Platform" → step  │
│ toward Financial Freedom                        │
│                                                 │
├─────────────── FIRE TARGETS (Next Week) ───────┤
│ BODY:                                           │
│ - Mobility session (3×/week)                    │
│ - Strength training (2×/week)                   │
│ - Nutrition tracking (7 days)                   │
│ - Recovery protocol                             │
│                                                 │
│ BEING:                                          │
│ - Meditation 20min daily (7-day streak)         │
│ - Weekly VOICE session                          │
│ - BEING War Stack creation                      │
│ - Monthly integration review                    │
│                                                 │
├─────────────── WAR STACKS NEEDED ──────────────┤
│ BEING Daily Foundation                          │
│ Why: 50+ VOICE sessions need execution channel │
│ Suggested Hits:                                 │
│ 1. Morning meditation 20min                     │
│ 2. Evening reflection                           │
│ 3. Weekly VOICE                                 │
│ 4. Monthly integration                          │
│                                                 │
├─────────────── MANUAL TARGETS ─────────────────┤
│ [User adds specific targets aligned Focus →    │
│ Freedom]                                        │
│ [Textarea]                                      │
└──────────────────────────────────────────────────┘
```

## Usage Flow

### 1. First-Time Setup

```bash
# Start server
cd ~/aos-hub/index-node
node server.js

# Initialize domain states (generates from vault data)
curl -X POST http://localhost:8799/api/tent/init
```

### 2. Weekly Tent Session

```bash
# Get complete synthesis for this week
curl http://localhost:8799/api/tent/synthesis/complete?week=2026-W03 | jq

# Get Component #1 data (Return & Report)
curl http://localhost:8799/api/tent/component/return-report?week=2026-W03 | jq

# Get Component #2 data (Lessons)
curl http://localhost:8799/api/tent/component/lessons?week=2026-W03 | jq

# Get Component #3 data (Corrections)
curl http://localhost:8799/api/tent/component/corrections?week=2026-W03 | jq

# Get Component #4 data (Targets)
curl http://localhost:8799/api/tent/component/targets?week=2026-W03 | jq
```

### 3. UI Workflow

1. User opens `/game/tent` (General's Tent Centre)
2. UI loads week (current or selected)
3. Fetch all 4 components data via API
4. Display Component #1 (auto-populated intelligence)
5. Display Component #2 (auto-lessons + manual textarea)
6. Display Component #3 (recommendations + manual textarea)
7. Display Component #4 (cascade-aligned targets + manual textarea)
8. User reviews, adds manual notes
9. Click "Save Weekly Tent Session"
10. POST to `/api/tent/save-weekly` with markdown
11. Markdown saved to `~/AlphaOS-Vault/Alpha_Tent/tent_{week}.md`

## Key Principles

### 1. **Intelligence, Not Aggregation**

General's Tent doesn't just show numbers. It detects emergent patterns across domains, time horizons, and energy flows that aren't visible when looking at individual components.

### 2. **Synthesis Over Summation**

```
WRONG: Sum(Core4) = 23/28
RIGHT: BUSINESS 7/7 + BEING 5/7 = Spiritual Bypassing Pattern
```

The value is in the RELATIONSHIP between metrics, not the metrics themselves.

### 3. **Causality Over Correlation**

```
WRONG: BALANCE high Core4, BUSINESS high Core4 (both high, correlation)
RIGHT: BALANCE foundation → unlocked BUSINESS capacity (causality chain)
```

### 4. **Actionable Over Descriptive**

Every insight includes:
- **Description:** What's happening
- **Impact:** What will happen if unchanged
- **Correction:** What to do about it

### 5. **Cascade-Aware**

Everything connects: Fire → Focus → Freedom → Frame. Changes at one level cascade up and down. Frame shifts trigger updates across all levels.

## Future Enhancements

### Phase 1 (Current):
- ✅ Domain-state system
- ✅ 3 Synthesis engines
- ✅ Component APIs
- ✅ Persistence

### Phase 2 (Next):
- [ ] Tent UI rebuild with intelligence display
- [ ] Real-time domain-state updates (from Fire Centre, Focus Centre, etc.)
- [ ] Historical trend analysis (week-over-week comparison)
- [ ] Domain-state auto-sync on Map YAML changes

### Phase 3 (Future):
- [ ] Machine learning pattern detection
- [ ] Predictive recommendations (what will likely happen next week)
- [ ] Multi-week planning (4-week rolling strategic plan)
- [ ] Integration with Voice Centre (auto-extract STRIKE → War Stack suggestions)

## Debugging & Troubleshooting

### Check Domain States

```bash
# List all domain states
curl http://localhost:8799/api/tent/states | jq '.states | keys'

# Inspect single domain
curl http://localhost:8799/api/tent/state/BUSINESS | jq '.state'
```

### Test Synthesis Engines

```bash
# Cross-domain patterns
curl http://localhost:8799/api/tent/synthesis/domains | jq '.synthesis.patterns'

# Cascade health
curl http://localhost:8799/api/tent/synthesis/temporal | jq '.synthesis.cascade_health'

# Pipeline issues
curl http://localhost:8799/api/tent/synthesis/pipeline | jq '.synthesis.issues'
```

### Check Logs

```bash
# Server logs show synthesis engine execution
tail -f server.log | grep synthesize
```

### Re-initialize States

If domain-states are corrupt or outdated:

```bash
# Backup existing states
cp -r ~/AlphaOS-Vault/.states ~/AlphaOS-Vault/.states.backup

# Remove states
rm ~/AlphaOS-Vault/.states/*.json

# Re-generate
curl -X POST http://localhost:8799/api/tent/init
```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    GENERAL'S TENT                            │
│                Strategic Intelligence System                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    DOMAIN-STATE LAYER                        │
│  ~/AlphaOS-Vault/.states/{BODY,BEING,BALANCE,BUSINESS}.json│
│                                                              │
│  Each domain-state tracks:                                  │
│  - Frame/Freedom/Focus/Fire Maps (references + metadata)    │
│  - VOICE sessions (count + latest STRIKE)                   │
│  - War Stacks (active/completed)                            │
│  - Core4 metrics (weekly total + trend)                     │
│  - Synthesis results (patterns + blockers + health scores)  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    SYNTHESIS ENGINES                         │
│                                                              │
│  1. Cross-Domain Synthesis                                  │
│     → Pattern recognition across BODY/BEING/BALANCE/BUSINESS│
│     → Spiritual bypassing, foundation unlocking, etc.       │
│                                                              │
│  2. Temporal Cascade Analysis                               │
│     → Fire→Focus→Freedom→Frame alignment check             │
│     → Cascade breakdowns, Frame shifts                      │
│                                                              │
│  3. Pipeline Flow Diagnosis                                 │
│     → VOICE→DOOR→FIRE energy flow                          │
│     → Conversion ratios, pipeline blockages                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    COMPONENT GENERATORS                      │
│                                                              │
│  Component #1: Return & Report                              │
│  → Auto-populated from all 3 synthesis engines              │
│  → Domain health + metrics + cascade + pipeline             │
│                                                              │
│  Component #2: Lessons Learned                              │
│  → Auto-lessons from synthesis + VOICE insights             │
│                                                              │
│  Component #3: Course Correction                            │
│  → Recommendations from synthesis + manual input            │
│                                                              │
│  Component #4: New Targets                                  │
│  → Cascade-aligned targets + War Stacks needed              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    UI LAYER (tent.html)                      │
│                                                              │
│  Fetch component data → Display intelligence → User review  │
│  → Add manual notes → Save to Vault                         │
└──────────────────────────────────────────────────────────────┘
```

---

**Version:** 1.0.0
**Last Updated:** 2026-01-18
**Author:** AlphaOS Index Node Development Team
