# THE GAME - Strategic Maps & Cascade System

Life structure with focus and adaptability - Frame to Fire.

## Quick Start

```bash
# See all maps
gamectl list

# Check cascade status
gamectl cascade

# Edit your Frame
gamectl edit frame body

# Weekly review
gamectl tent edit
```

## What is THE GAME?

**THE GAME** = Strategic life structure using hierarchical maps that cascade from vision to daily execution.

### Map Hierarchy

```
FRAME (Where am I?)           ← Current reality
  ↓
IPW (10-year Vision)          ← Ideal Parallel World
  ↓
FREEDOM (Annual)              ← Yearly vision
  ↓
FOCUS (Monthly)               ← Monthly mission
  ↓
FIRE (Weekly)                 ← Weekly war (4 hits)
  ↓
DAILY (Today)                 ← Today's strikes
```

**Critical Rule:** When parent changes → child must update (cascade)

### 4 Domains

Every map level exists for **each of the 4 domains:**

| Domain | Emoji | Focus |
|--------|-------|-------|
| **BODY** | 💪 | Physical mastery |
| **BEING** | 🧘 | Mental/spiritual mastery |
| **BALANCE** | ⚖️ | Relationship mastery |
| **BUSINESS** | 💼 | Financial/career mastery |

**DOMINION** = Having clear, aligned maps for all 4 domains.

## Commands

### Map Management

```bash
gamectl list [level] [domain]      # List maps
gamectl show <level> [domain]      # View map (glow)
gamectl edit <level> [domain]      # Edit map
```

**Levels:** frame, ipw, freedom, focus, fire, daily

**Examples:**
```bash
gamectl list                       # All maps overview
gamectl list frame                 # Frame maps all domains
gamectl show frame body            # View BODY Frame
gamectl edit fire business         # Edit BUSINESS Fire
```

### Cascade Checking

```bash
gamectl cascade [domain]           # Check cascade
```

**Output:**
```
╔════════════╦═══════════╦══════════════╗
║ Map Level  ║ Status    ║ Action       ║
╠════════════╬═══════════╬══════════════╣
║ 🗺️  FRAME   ║ ✅ Current ║ -            ║
║ 🔮 IPW      ║ ✅ Current ║ -            ║
║ 🦅 FREEDOM  ║ ⚠️  Stale   ║ Update needed║
║ 🎯 FOCUS    ║ ⚠️  Stale   ║ Update needed║
║ 🔥 FIRE     ║ ✅ Current ║ -            ║
║ 📅 DAILY    ║ ❌ Missing ║ Create       ║
╚════════════╩═══════════╩══════════════╝

Recommended: update_freedom
```

**Status:**
- ✅ **Current** - Map is up to date
- ⚠️ **Stale** - Parent changed after this, needs update
- ❌ **Missing** - Map doesn't exist

### General's Tent

```bash
gamectl tent [action]              # Weekly reflection
```

**Actions:**
- `show` - View this week's tent (default)
- `edit` - Edit this week's tent
- `create` - Create new tent
- `list` - List all tent sessions

**Tent = Weekly review** covering:
- Fire review per domain
- Domino Doors progress
- DOMINION status
- Cascade check
- Insights & patterns
- Next week intentions

### Quick Access

```bash
gamectl frame [domain]             # Show Frame
gamectl fire [domain]              # Show Fire
gamectl review                     # Weekly review
```

## Map Levels Explained

### Frame (🗺️ Where Am I?)

**Purpose:** Current reality snapshot

**Questions:**
- Where am I right now?
- What are my strengths?
- What are my challenges?
- What resources do I have?

**Timeframe:** Current (update quarterly or when major life change)

**Example:**
```markdown
# Frame Map: BODY

## Current Reality
- Weight: 85kg
- Training: 3x/week inconsistent
- Diet: Mostly clean, weekends rough

## Strengths
- Know how to train
- Have gym access
- Motivated

## Challenges
- Genetic risk (HbA1c borderline)
- Travel disrupts routine
- Evening fatigue

## Resources
- Gym membership
- Nutrition knowledge
- Vitaltrainer certification in progress
```

### IPW (🔮 10-Year Vision)

**Purpose:** Ideal Parallel World - who you become

**Questions:**
- What does DOMINION look like?
- Who have I become?
- What have I achieved?
- How does life feel?

**Timeframe:** 10 years

**Example:**
```markdown
# IPW: BUSINESS

## Vision
I am a recognized authority in fitness philosophy integration. I teach thousands through Vital Dojo. My content helps men escape Fitness Influenza.

## Who I've Become
- Authority figure (Mars 9H manifested)
- Teacher who integrates deeply
- Content creator with SEO dominance

## Achieved
- Vital Dojo: 500+ members
- FADARO blog: 100k+ monthly visits
- YouTube: 50k+ subscribers
- Books published on ATP-to-Tao

## How It Feels
Freedom to create. Impact that matters. Teaching = integration. Financial abundance. Time sovereignty.
```

### Freedom (🦅 Annual)

**Purpose:** This year's vision toward IPW

**Questions:**
- How do I move toward IPW this year?
- What are key milestones?
- Which Domino Doors open the path?

**Timeframe:** 1 year (updated annually, usually January)

### Focus (🎯 Monthly)

**Purpose:** This month's mission

**Questions:**
- What must happen this month?
- What are key projects?
- What are success metrics?

**Timeframe:** 1 month (updated monthly)

### Fire (🔥 Weekly)

**Purpose:** This week's war

**Structure:**
- **4 Hits** from War Stacks (specific, actionable)
- **Non-Negotiables** (must complete)

**Connection to DOOR:**
- Fire Map = execution layer for Door Pillar
- 4 Hits typically come from War Stacks (THE DOOR)
- War Stack (DOOR) → generates 4 Hits → populate Fire Map (GAME)

**Timeframe:** 1 week (updated weekly, usually Sunday/Monday)

**Example:**
```markdown
# Fire Map: BUSINESS

**Week:** 2026-W06

## 4 Hits (from War Stacks)
1. [ ] Theorieblock 3 absolvieren (Ausbildung WS)
2. [ ] Blog post: "Feuer ohne Erdung" (FADARO WS)
3. [ ] Vital Dojo landing page design (VitalDojo WS)
4. [ ] Steuer Q4 2025 prep (Steuer WS)

## Non-Negotiables
- 15h Ausbildung time blocked
- 3x blog drafting sessions
- 2x design iterations
```

### Daily (📅 Today)

**Purpose:** Today's strikes

**Structure:**
- Top 3 strikes for today
- Must align with Fire Map

**Timeframe:** Daily

## Cascade System

### What is Cascade?

**Cascade** = When parent map changes, children become "stale" and need updating.

**Why?**
- Frame change = life circumstances shifted → all downstream maps may need adjustment
- Freedom change = annual vision pivoted → monthly/weekly plans need realignment
- Keeps maps aligned from top (vision) to bottom (execution)

### Cascade Rules

1. **Parent change** → All children marked stale
2. **Stale child** → Needs review and update
3. **Broken cascade** → Can't update child without parent existing

### Example Cascade Flow

```
User edits Frame (BODY):
  "Added: New genetic risk identified (HbA1c rising)"

System detects:
  Frame modified timestamp > IPW timestamp
  → IPW marked STALE

User updates IPW (BODY):
  "Vision adjusted: Now includes longevity focus, genetic risk management"

System detects:
  IPW modified > Freedom timestamp
  → Freedom marked STALE

User updates Freedom (BODY):
  "This year: Establish genetic risk monitoring, A1C target <5.7"

... and so on down to Fire, Daily
```

### Checking Cascade

```bash
# All domains
gamectl cascade

# Specific domain
gamectl cascade business
```

**Next action recommendation:**
- `create_frame` - Start with Frame
- `update_freedom` - Freedom needs realignment
- `review_fire` - All good, just review weekly Fire

## General's Tent

**Purpose:** Weekly reflection & strategic review

**When:** Sunday evening or Monday morning

**Template sections:**
1. **Fire Review** - What got done per domain
2. **Domino Doors Progress** - Active doors status
3. **DOMINION Status** - Frame current? Maps aligned?
4. **Cascade Check** - Any stale maps?
5. **Insights & Patterns** - What worked/didn't
6. **Next Week Intentions** - Top 3 priorities

**File location:**
```
~/AlphaOS-Vault/GAME/Tent/Tent-YYYY-Wxx.md
```

**Auto-created with template** when you run:
```bash
gamectl tent edit
```

## File Structure

```
~/AlphaOS-Vault/GAME/
├── Frame/
│   ├── BODY-Frame.md
│   ├── BEING-Frame.md
│   ├── BALANCE-Frame.md
│   └── BUSINESS-Frame.md
├── IPW/
│   ├── BODY-IPW.md
│   └── ...
├── Freedom/
│   ├── BODY-Freedom-2026.md       # Year stamped
│   └── ...
├── Focus/
│   ├── BODY-Focus-2026-02.md      # Month stamped
│   └── ...
├── Fire/
│   ├── BODY-Fire-2026-W06.md     # Week stamped
│   └── ...
├── Daily/
│   ├── BODY-Daily-2026-02-09.md  # Date stamped
│   └── ...
└── Tent/
    ├── Tent-2026-W05.md
    ├── Tent-2026-W06.md
    └── ...
```

## Integration

### With THE DOOR

**Connection:** Fire Maps get populated with hits from War Stacks

```
THE DOOR (Weekly Tactics):
  War Stack created → generates 4 Hits

THE GAME (Strategic Maps):
  Fire Map → displays those 4 Hits for execution
```

**Workflow:**
1. `doorctl war Ausbildung` - Create War Stack
2. War Stack generates 4 Hits
3. `gamectl fire business` - Fire Map shows those hits
4. Execute hits during week
5. `gamectl tent edit` - Reflect on completion

### With THE CORE FOUR

**Connection:** Daily Game can reference Core4 habits

```markdown
# Daily Game: BODY

## Today's Strikes
- [ ] Fitness (Core4 habit)
- [ ] Fuel (Core4 habit)
- [ ] Fire Hit #1: Theorieblock 3
```

### With aosctl

```bash
aosctl game list            # Delegates to gamectl
aosctl game cascade         # Check cascade
aosctl status               # Includes GAME status
```

## Architecture

```
game/
├── lib/
│   ├── game_data.sh        # Map file access
│   ├── game_maps.sh        # Cascade logic
│   ├── game_tent.sh        # Tent operations
│   └── game_format.sh      # Pretty tables
├── cli/gamectl             # CLI interface
└── api/                    # Node.js handlers (future)
```

**Design:** Logic in `lib/*.sh`, reusable by CLI and API.

## Example Workflows

### Quarterly Frame Update

```bash
# 1. Review current Frame
gamectl show frame body

# 2. Update if life changed
gamectl edit frame body

# 3. Check cascade
gamectl cascade body

# 4. Update downstream maps if stale
gamectl edit ipw body
gamectl edit freedom body
# ... etc
```

### Monthly Focus Setting

```bash
# 1. Check Freedom (annual vision)
gamectl show freedom business

# 2. Set this month's mission
gamectl edit focus business

# 3. Verify cascade
gamectl cascade business
```

### Weekly Fire Planning

```bash
# 1. Check Focus (monthly mission)
gamectl show focus business

# 2. Set this week's 4 hits
gamectl edit fire business

# 3. Populate from War Stacks (doorctl)
doorctl hits Ausbildung    # See available hits

# 4. Add hits to Fire Map
gamectl edit fire business
# (Copy 4 hits from War Stacks)
```

### Weekly Review (Tent)

```bash
# Sunday evening / Monday morning

# 1. Review this week's Fire Maps
gamectl fire body
gamectl fire being
gamectl fire balance
gamectl fire business

# 2. Open Tent for reflection
gamectl tent edit

# 3. Fill out:
#    - What got done (Fire review)
#    - Door progress
#    - Cascade check
#    - Insights
#    - Next week intentions

# 4. Check cascade before next week
gamectl cascade
```

## Troubleshooting

**Maps not found:**
```bash
# Check vault location
ls $AOS_VAULT_DIR/GAME

# Create missing directories
mkdir -p ~/AlphaOS-Vault/GAME/{Frame,IPW,Freedom,Focus,Fire,Daily,Tent}
```

**Cascade not detecting changes:**
- Cascade uses file modification timestamps
- Editing a file updates its mtime
- Parent mtime > child mtime = stale

**Templates not creating:**
- Templates auto-create when you edit non-existent map
- Check editor is set: `echo $EDITOR`
- Set if needed: `export EDITOR=micro`

## Environment

```bash
export AOS_VAULT_DIR=~/AlphaOS-Vault    # Vault location
export EDITOR=micro                      # Preferred editor
```

## Dependencies

**Required:**
- bash 4.0+
- jq (JSON parsing)

**Optional:**
- glow (markdown rendering)
- bat (syntax highlighting)
- micro/nano (editors)

## Philosophy

**THE GAME is about alignment.**

Without clear maps:
- No vision (IPW missing)
- No direction (Freedom unclear)
- No focus (Monthly mission vague)
- Random execution (Fire hits disconnected)

**With clear, cascaded maps:**
- Vision → Strategy → Tactics → Execution
- Everything flows from Frame to Daily
- Changes propagate systematically
- DOMINION emerges through alignment

**The cascade ensures you never drift.**

When life changes (Frame update), the system alerts you to realign everything downstream. This prevents:
- Working on outdated goals
- Executing tactics disconnected from strategy
- Grinding without purpose

**Weekly Tent = compass check.**

Every week, you reflect:
- Am I on track?
- Are maps current?
- What needs adjustment?

**Start with Frame. Build up. Maintain with Tent.**

---

**Begin:**
```bash
gamectl edit frame body
```

Then build IPW → Freedom → Focus → Fire → Daily.

Review weekly in Tent.

**DOMINION through alignment.** 🗺️🔮🦅🎯🔥
