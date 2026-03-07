# THE CORE FOUR - Daily Tracking System

28-or-Die pattern for mastering all 4 domains of life.

## Docs

- Script reference (maintenance-critical): `core4/CORE4-SCRIPTS.md`
- Architecture: `core4/ARCHITECTURE.md`
- Cheatsheet: `core4/CHEATSHEET.md`
- Changelog: `core4/CHANGELOG.md`

## Quick Start

```bash
# Wrapper/frontdoor help (recommended starting point)
core4 --help
c4 --help
c4d --help
wcore4 --help

# Check today's status
core4ctl today

# View this week
core4ctl week

# Check your streaks
core4ctl streak

# Full overview
core4ctl status
```

## What is THE CORE FOUR?

**THE CORE FOUR** = The 4 fundamental domains of life that require daily attention:

| Domain | Emoji | Habits | Focus |
|--------|-------|--------|-------|
| **BODY** | 💪 | fitness, fuel | Physical mastery |
| **BEING** | 🧘 | meditation, memoirs | Mental/spiritual mastery |
| **BALANCE** | ⚖️ | person1, person2 | Relationship mastery |
| **BUSINESS** | 💼 | discover, declare | Financial/career mastery |

**Rule:** Complete **both habits** in each domain **daily** for 28+ days = DOMINION

## Commands

### Daily Tracking

```bash
core4ctl today              # Today's completion (8 habits)
```

**Output:**
```
╔═══════════╦══════════╦══════════╗
║ Domain    ║ Fitness  ║ Fuel     ║
╠═══════════╬══════════╬══════════╣
║ 💪 BODY    ║ ✅       ║ ✅       ║
...
```

### Weekly Summary

```bash
core4ctl week               # This week's totals
core4ctl week 2026-W05      # Specific week
core4ctl recent 8           # Last 8 weeks
```

**Target:** 14 points per domain per week (7 days × 2 habits × 0.5 points)

### Streak Tracking

```bash
core4ctl streak             # All domains
core4ctl streak body        # Specific domain
```

**Levels:**
- 🌱 **Starting** (0-7 days) - Just beginning
- 💪 **Building** (8-14 days) - Momentum growing
- 🔥 **Strong** (15-21 days) - Habit formed
- 🔥🔥 **Elite** (22-27 days) - Almost there
- 🔥🔥🔥 **Legendary** (28+ days) - DOMINION achieved

### Status Overview

```bash
core4ctl status             # Today + Week + Streaks
```

## Habits per Domain

### BODY (Physical Mastery)
- **fitness** - Training, movement, strength
- **fuel** - Nutrition, hydration, supplements

### BEING (Mental/Spiritual Mastery)
- **meditation** - Mindfulness, breathwork, presence
- **memoirs** - Journaling, reflection, gratitude

### BALANCE (Relationship Mastery)
- **person1** - Partner/primary relationship
- **person2** - Posterity/secondary relationships

### BUSINESS (Financial/Career Mastery)
- **discover** - Learning, research, exploration
- **declare** - Action, creation, execution

## 28-or-Die Pattern

**Goal:** Complete both domain habits daily for 28 consecutive days.

**Why 28 days?**
- Habit formation threshold
- Full lunar cycle
- Long enough to be challenging
- Short enough to stay motivated

**What happens at 28+?**
- 🔥🔥🔥 **Legendary status** unlocked
- **DOMINION** over that domain
- Habit becomes automatic
- Keep going to maintain streak

**Risk Detection:**
- ⚠️ **AT RISK** = Missed yesterday
- Complete today to keep streak alive
- Missing 1 day = streak resets to 0

## Data Format

### Location
```
~/vault/Alpha_Core4/core4_week_YYYY-Wxx.json
```

### Schema
```json
{
  "days": {
    "2026-02-09": {
      "body": 1.0,
      "being": 0.5,
      "balance": 0.0,
      "business": 1.0,
      "habits": {
        "fitness": 1,
        "fuel": 1,
        "meditation": 1,
        "memoirs": 0,
        "person1": 0,
        "person2": 0,
        "discover": 1,
        "declare": 1
      }
    }
  }
}
```

### Points System
- **0.5 points** per habit completion
- **1.0 point** per domain completion (both habits)
- **4.0 points** = perfect day (all 4 domains)
- **28 points** = perfect week (all 4 domains × 7 days)

## Logging

**Automatic (Recommended):**
```bash
# Via Taskwarrior - mark habit task done
task fitness done

# Hook automatically logs to Core4 weekly JSON
```

**Via Bridge API:**
```bash
curl -X POST http://localhost:8080/bridge/core4/log \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "body",
    "task": "fitness",
    "points": 0.5,
    "ts": "2026-02-09T10:00:00Z",
    "source": "manual"
  }'
```

**Via Index Node UI:**
- Open http://localhost:8799
- Navigate to Core4 section
- Toggle habits on/off
- Auto-saves to Bridge

**CLI logging:** Not yet implemented (use Taskwarrior or UI)

## Integration

### With Taskwarrior

Configure habits as recurring tasks:

```bash
# BODY habits
task add fitness recur:daily project:CORE.Body +fitness +core4
task add fuel recur:daily project:CORE.Body +fuel +core4

# BEING habits
task add meditation recur:daily project:CORE.Being +meditation +core4
task add memoirs recur:daily project:CORE.Being +memoirs +core4

# BALANCE habits
task add "Partner time" recur:daily project:CORE.Balance +person1 +core4
task add "Family time" recur:daily project:CORE.Balance +person2 +core4

# BUSINESS habits
task add "Learn/Read" recur:daily project:CORE.Business +discover +core4
task add "Create/Ship" recur:daily project:CORE.Business +declare +core4
```

When you complete: `task fitness done` → Hook logs to Core4

### With aosctl

```bash
aosctl core today           # Delegates to core4ctl
aosctl core streak          # Check streaks
aosctl status               # Includes Core4 in overview
```

### With Index Node

Core4 UI (web interface):
- Visual habit toggles
- Weekly calendar view
- Streak visualization
- Auto-sync with vault

## Architecture

```
core4/
├── lib/
│   ├── core4_data.sh       # Weekly JSON access
│   ├── core4_streak.sh     # Streak calculation
│   └── core4_format.sh     # Pretty tables
├── cli/core4ctl            # CLI interface
└── api/                    # Node.js handlers (future)
```

**Design:** Logic in `lib/*.sh`, reusable by CLI and API.

## Example Workflows

### Morning Routine

```bash
# Check yesterday's completion
core4ctl today

# See current streaks
core4ctl streak

# Identify at-risk domains
core4ctl status | grep "AT RISK"
```

### Weekly Review

```bash
# This week's summary
core4ctl week

# Last 4 weeks trend
core4ctl recent 4

# Check which domains need attention
core4ctl streak
```

### Monthly Check

```bash
# Get last month's weeks
for week in 2026-W01 2026-W02 2026-W03 2026-W04; do
  core4ctl week $week
done
```

## Troubleshooting

**No data showing:**
- Check vault location: `$AOS_VAULT_DIR/Alpha_Core4/`
- Verify weekly JSON files exist
- Ensure Taskwarrior hooks are installed

**Streaks not calculating:**
- Streaks go backwards from today
- Missing week files = broken streak
- Check data with: `cat ~/vault/Alpha_Core4/core4_week_*.json | jq`

**Wrong habit names:**
- Use exact names: fitness, fuel, meditation, memoirs, person1, person2, discover, declare
- Check Taskwarrior tags match

## Environment

```bash
export AOS_VAULT_DIR=~/vault    # Vault location
```

## Dependencies

**Required:**
- bash 4.0+
- jq (JSON parsing)
- bc (calculations)

**Optional:**
- Taskwarrior (automatic logging)
- Index Node (web UI)

## See Also

- `door/README.md` - Weekly Tactics (THE DOOR)
- `game/README.md` - Strategic Maps (THE GAME)
- `DOCS/AOSCTL.md` - Unified launcher
- Elliott Hulse's αOS philosophy (THE CODE)

## Philosophy

**THE CORE FOUR is not optional.**

Without daily mastery of all 4 domains:
- **BODY** neglected = no energy for anything else
- **BEING** neglected = mental chaos, no presence
- **BALANCE** neglected = relationships suffer, loneliness
- **BUSINESS** neglected = financial stress, no freedom

**DOMINION requires ALL FOUR, EVERY DAY, for 28+ DAYS.**

This is not about perfection. This is about **consistency**.

Missing 1 day? Reset. Start again. The streak teaches resilience.

---

**Start today:**
```bash
core4ctl status
```

Then complete your 8 habits. Tomorrow, do it again. Repeat for 28 days.

**DOMINION awaits.** 🔥🔥🔥
