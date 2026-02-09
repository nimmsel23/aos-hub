# AlphaOS Pillar Tools

Complete guide to doorctl, gamectl, core4ctl, and aosctl.

## Overview

AlphaOS implements the 5 Pillars as CLI tools:

| Pillar | Tool | Purpose | Status |
|--------|------|---------|--------|
| **THE DOOR** | `doorctl` | Weekly Tactics (4P Flow) | ✅ v2.0 |
| **THE GAME** | `gamectl` | Strategic Maps (Cascade) | ✅ v2.0 |
| **THE VOICE** | `voicectl` | Mental Mastery (4-Step) | ✅ v2.0 |
| **THE CORE FOUR** | `core4ctl` | Daily Tracking (28-or-Die) | ✅ v2.0 |
| **THE CODE** | `aosctl code` | Philosophy Viewer | ✅ v1.0 |
| **Meta** | `aosctl` | Unified Launcher | ✅ v1.0 |

## Quick Start

```bash
# Interactive menu
aosctl

# Direct pillar access
aosctl door list
aosctl game cascade
aosctl core status

# Or use direct commands
doorctl health
gamectl review
voicectl start
core4ctl streak
```

## Architecture

### Shared Pattern

All pillar tools follow the same architecture:

```
<pillar>/
├── lib/              # Core logic (bash libraries)
│   ├── data.sh       # Data access
│   ├── logic.sh      # Business logic
│   └── format.sh     # Pretty printing
├── cli/<pillar>ctl   # CLI interface
├── api/              # Node.js handlers
└── README.md         # User docs
```

**Benefits:**
- **Single source of truth** - Logic in lib/*.sh
- **Reusable** - CLI and API use same libs
- **Testable** - Each lib can be tested independently
- **Maintainable** - Update once, affects all consumers

### Shared UI Library

All tools use `scripts/ctl-lib.sh`:

```bash
ui_title "Title"          # Styled header
ui_info "Message"         # Info message
ui_ok "Success"           # Success message
ui_err "Error"            # Error message
ui_warn "Warning"         # Warning message
ui_confirm "Question?"    # Yes/no prompt
ui_input "Prompt"         # Text input
ui_choose "Select" opt1 opt2  # Multi-choice
```

**Features:**
- Auto-detects gum/fzf for enhanced UI
- Falls back gracefully to plain text
- Consistent styling across all tools

## THE DOOR (doorctl)

**Purpose:** Weekly Tactics - Potential → Plan → Production → Profit

### Key Commands

```bash
doorctl list                    # All doors overview
doorctl show <door>             # Detail view
doorctl hits <door>             # List hits for door
doorctl next                    # What to work on?
doorctl done <uuid>             # Mark hit complete
doorctl health                  # Check door health
doorctl war <door>              # View war stack
doorctl edit <door>             # Edit war stack
```

### Features

- **4P Flow tracking** - Potential/Plan/Production/Profit phases
- **War Stack management** - FACT/OBSTACLE/STRIKE/RESPONSIBILITY
- **Hit tracking** - 4 hits per war stack
- **Health checks** - Stalled detection (7+ days no activity)
- **Taskwarrior integration** - Uses door.* UDAs
- **Pretty tables** - Progress bars, completion %

### Data Model

**Taskwarrior UDAs:**
```bash
door.name           # Door name
door.phase          # potential|plan|production|profit
door.type           # door|hit|strike|bigrock
door.domain         # body|being|balance|business
door.warstack       # War Stack ID
door.hit            # Hit number (1-4)
door.domino         # yes|no
```

**Vault storage:**
```
~/AlphaOS-Vault/Door/
├── 1-Potential/      # Hot List
├── 2-Plan/           # Door War
├── War-Stacks/       # War Stack markdown
├── 3-Production/     # Hit List
└── 4-Profit/         # Reflections
```

### See Also

- `door/README.md` - Full documentation
- `door/AGENTS.md` - Development guidelines
- `door/taskrc.template` - Taskwarrior config

## THE GAME (gamectl)

**Purpose:** Strategic Maps - Frame → Freedom → Focus → Fire

### Key Commands

```bash
gamectl list                    # All maps overview
gamectl show <level> [domain]   # View map
gamectl edit <level> [domain]   # Edit map
gamectl cascade [domain]        # Check cascade status
gamectl tent [action]           # General's Tent
gamectl review                  # Weekly review
```

### Features

- **Map hierarchy** - Frame/IPW/Freedom/Focus/Fire/Daily
- **4 domains** - body, being, balance, business
- **Cascade detection** - Parent changed → child needs update
- **General's Tent** - Weekly reflection template
- **Auto-templates** - Per level + domain
- **Markdown viewing** - glow/bat rendering

### Map Levels

| Level | Emoji | Description | Timeframe |
|-------|-------|-------------|-----------|
| **Frame** | 🗺️ | Where am I? | Current reality |
| **IPW** | 🔮 | Ideal Parallel World | 10 years |
| **Freedom** | 🦅 | Annual vision | 1 year |
| **Focus** | 🎯 | Monthly mission | 1 month |
| **Fire** | 🔥 | Weekly war | 1 week |
| **Daily** | 📅 | Daily game | Today |

### Cascade Logic

```
Frame changes
  ↓
IPW needs update (depends on Frame)
  ↓
Freedom needs update (depends on IPW)
  ↓
Focus needs update (depends on Freedom)
  ↓
Fire needs update (depends on Focus)
```

**Status indicators:**
- ✅ **Current** - Map is up to date
- ⚠️ **Stale** - Parent changed, needs update
- ❌ **Missing** - Map doesn't exist yet

### Vault Storage

```
~/AlphaOS-Vault/GAME/
├── Frame/
│   ├── BODY-Frame.md
│   ├── BEING-Frame.md
│   ├── BALANCE-Frame.md
│   └── BUSINESS-Frame.md
├── IPW/
├── Freedom/
├── Focus/
├── Fire/
├── Daily/
└── Tent/
    └── Tent-YYYY-Wxx.md
```

### See Also

- `game/README.md` - Full documentation
- Elliott Hulse's THE GAME philosophy

## THE VOICE (voicectl)

**Purpose:** Mental Mastery - Pattern interruption through 4-step process

### Key Commands

```bash
voicectl start                  # Interactive 4-step session
voicectl list [limit]           # List sessions
voicectl recent [count]         # Recent N sessions
voicectl show <id>              # View session
voicectl edit <id>              # Edit session
voicectl search <query>         # Search content
voicectl stats                  # Statistics
voicectl strike <id>            # Extract STRIKE
```

### Features

- **4-Step Process** - STOP → SUBMIT → STRUGGLE → STRIKE
- **Interactive facilitation** - gum integration for enhanced prompts
- **Session management** - List, search, view with glow/bat
- **Pattern interruption** - Systematic mental mastery
- **Integration ready** - STRIKE feeds Door War Stacks
- **Markdown storage** - Sessions in `~/AlphaOs-Vault/VOICE/` or `~/Voice/`

### 4-Step Process

| Step | Emoji | Purpose |
|------|-------|---------|
| **STOP** | 🛑 | Interrupt destructive pattern |
| **SUBMIT** | 🙏 | Face truth, surrender |
| **STRUGGLE** | ⚔️ | Rewrite narrative |
| **STRIKE** | ⚡ | Decisive action |

### Session File Format

```markdown
# VOICE Session - YYYY-MM-DD HH:MM

## STOP - Pattern Interrupt
**What pattern needs interrupting?**
[content]

## SUBMIT - Face Truth
**What truth must be faced?**
[content]

## STRUGGLE - Rewrite Story
**What story needs rewriting?**
[content]

## STRIKE - Decisive Action
**What action follows?**
[content]
```

### Integration Points

**With THE DOOR:**
```bash
# Extract STRIKE from session
voicectl strike 2026-02-09

# Use as War Stack input
doorctl war create  # Paste STRIKE content
```

**With THE GAME:**
```bash
# Review sessions for Frame insights
voicectl recent 10

# Update Frame Map
gamectl edit frame being
```

### Vault Storage

```
~/AlphaOs-Vault/VOICE/
└── VOICE-YYYY-MM-DD_HHMM.md
```

Or fallback:
```
~/Voice/
└── VOICE-YYYY-MM-DD_HHMM.md
```

### See Also

- `voice/README.md` - Full documentation
- Elliott Hulse's THE VOICE philosophy

## THE CORE FOUR (core4ctl)

**Purpose:** Daily Tracking - 28-or-Die for 4 Domains

### Key Commands

```bash
core4ctl today                  # Today's status
core4ctl week [YYYY-Wxx]        # Weekly summary
core4ctl streak [domain]        # Streak tracking
core4ctl status                 # Full overview
core4ctl recent [count]         # Recent weeks
```

### Features

- **8 habits** - 2 per domain
- **Daily tracking** - Complete both habits per domain
- **Streak calculation** - Consecutive days
- **28-or-Die pattern** - DOMINION at 28+ days
- **Risk detection** - Missed yesterday = at risk
- **Weekly summaries** - Points per domain

### Habits

| Domain | Habit 1 | Habit 2 |
|--------|---------|---------|
| **BODY** 💪 | fitness | fuel |
| **BEING** 🧘 | meditation | memoirs |
| **BALANCE** ⚖️ | person1 | person2 |
| **BUSINESS** 💼 | discover | declare |

### Streak Levels

- 🌱 **Starting** (0-7 days)
- 💪 **Building** (8-14 days)
- 🔥 **Strong** (15-21 days)
- 🔥🔥 **Elite** (22-27 days)
- 🔥🔥🔥 **Legendary** (28+ days) = **DOMINION**

### Data Format

Weekly JSON files in `~/AlphaOS-Vault/Alpha_Core4/`:

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
        ...
      }
    }
  }
}
```

### See Also

- `core4/README.md` - Full documentation
- Elliott Hulse's THE CORE FOUR philosophy

## Meta Tool (aosctl)

**Purpose:** Unified launcher for all pillars

### Usage

```bash
# Interactive menu
aosctl

# Direct pillar access
aosctl door <command>
aosctl game <command>
aosctl core <command>
aosctl voice <command>

# Global commands
aosctl status           # All pillars status
aosctl doctor           # Health check
aosctl code             # View philosophy
```

### Features

- **Interactive menu** - Choose pillar with gum/fzf
- **Delegation** - Routes to pillar-specific tools
- **System status** - Overview of all pillars
- **Health checks** - Vault, Taskwarrior, tools
- **Philosophy viewer** - THE CODE with glow

### Status Command

Shows health across all pillars:

```bash
aosctl status

# Output:
═══ DOOR (Weekly Tactics) ═══
✅ Ausbildung: Healthy (2h ago)
⚠️  FADARO: Needs attention (3d ago)

═══ GAME (Strategic Maps) ═══
● rclone-alpha-game.service - active

═══ CORE FOUR (4 Domains) ═══
💪 BODY: 🔥🔥🔥 28 days
🧘 BEING: 🔥 15 days
...
```

### Doctor Command

Complete health check:

```bash
aosctl doctor

# Checks:
✅ Vault found
✅ Taskwarrior installed
✅ Door UDAs configured
✅ doorctl available
✅ gamectl available
✅ core4ctl available
ℹ️  glow installed (optional)
ℹ️  bat installed (optional)
```

## Common Patterns

### Morning Routine

```bash
# 1. Check Core4 status
core4ctl today

# 2. Check door health
doorctl health

# 3. See today's focus
doorctl focus

# 4. Check game cascade
gamectl cascade
```

### Weekly Review

```bash
# 1. General's Tent
gamectl tent edit

# 2. Core4 week summary
core4ctl week

# 3. Door progress
doorctl list

# 4. Fire Maps
gamectl fire
```

### Daily Workflow

```bash
# Morning: Check
aosctl status

# During day: Execute
doorctl next
task <uuid> done

# Evening: Reflect
core4ctl today
gamectl tent edit
```

## Integration Points

### Taskwarrior

All pillars integrate with Taskwarrior:

**Door:** Uses `door.*` UDAs for task tracking
**Game:** Fire Maps reference Taskwarrior hits
**Core4:** Automatic logging via hooks

### Index Node

API handlers available for web UI:

```
door/api/list.js
door/api/show.js
game/api/cascade.js
core4/api/today.js
```

### Vault

All data stored in markdown/JSON:

```
~/AlphaOS-Vault/
├── Door/           # doorctl data
├── GAME/           # gamectl maps
└── Alpha_Core4/    # core4ctl data
```

## Configuration

### Environment

```bash
# Vault location
export AOS_VAULT_DIR=~/AlphaOS-Vault

# Editor preference
export EDITOR=micro

# Door health thresholds
export AOS_DOOR_STALLED_DAYS=7
export AOS_DOOR_ATTENTION_DAYS=3

# Taskwarrior binary
export TASK_BIN=task
```

### Aliases (Optional)

Add to `~/.zshrc` or `~/.config/fish/config.fish`:

```bash
alias aos='aosctl'
alias door='aosctl door'
alias game='aosctl game'
alias core='aosctl core'
```

## Development

### Adding New Features

1. **Add to lib/** - Core logic in bash
2. **Use in CLI** - Source lib, add command
3. **Expose in API** - Node.js wrapper
4. **Update docs** - README + this file

### Testing

```bash
# Smoke test each tool
doorctl list
gamectl list
core4ctl status
aosctl doctor

# Check lib functions
bash -c 'source door/lib/door_data.sh && get_doors'
```

### Code Style

- Use `set -euo pipefail`
- Shellcheck clean
- Functions return JSON when possible
- Error handling with `|| return 1`
- Comments for complex logic

## Troubleshooting

### Tool not found

```bash
# Check if executable
ls -la scripts/*ctl

# Make executable
chmod +x scripts/*ctl game/cli/gamectl door/cli/doorctl core4/cli/core4ctl
```

### No data showing

```bash
# Check vault
ls $AOS_VAULT_DIR

# Check Taskwarrior
task export door.name:Ausbildung

# Check weekly JSON
cat ~/AlphaOS-Vault/Alpha_Core4/core4_week_*.json | jq
```

### UI not pretty

```bash
# Install optional tools
yay -S gum fzf glow bat micro

# Check availability
which gum fzf glow bat micro
```

## Roadmap

### Pillar Tools

- [x] doorctl v2.0 - Full features
- [x] gamectl v2.0 - Full features
- [x] core4ctl v2.0 - Full features
- [x] aosctl v1.0 - Meta launcher
- [ ] voicectl v2.0 - VOICE session management

### Integration

- [ ] Index Node API handlers
- [ ] Web UI for all pillars
- [ ] Mobile access via Telegram
- [ ] Desktop notifications

### Features

- [ ] Export all data to PDF
- [ ] Import/export between systems
- [ ] Multi-user support
- [ ] Cloud sync

## See Also

- `door/README.md` - THE DOOR documentation
- `game/README.md` - THE GAME documentation
- `core4/README.md` - THE CORE FOUR documentation
- `DOCS/AOSCTL.md` - Meta launcher
- `AlphaOS-Vault/ALPHA_OS/` - Elliott Hulse's philosophy
