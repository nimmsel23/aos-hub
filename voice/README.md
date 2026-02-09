# THE VOICE - Mental Mastery System

4-Step pattern interruption for mind control: STOP → SUBMIT → STRUGGLE → STRIKE

## Quick Start

```bash
# Start new interactive session
voicectl start

# List recent sessions
voicectl list

# View session
voicectl show 2026-02-09

# Search sessions
voicectl search "pattern"

# Statistics
voicectl stats
```

## What is THE VOICE?

**THE VOICE** = Mental Mastery through 4-step pattern interruption and narrative rewriting.

### The 4 Steps

```
🛑 STOP    - Interrupt destructive pattern
   ↓
🙏 SUBMIT  - Face truth, surrender
   ↓
⚔️  STRUGGLE - Rewrite narrative
   ↓
⚡ STRIKE  - Decisive action
```

**Rule:** Every session must move through all 4 steps. No skipping. No shortcuts.

## Commands

### Session Management

```bash
voicectl start                  # Interactive 4-step session
voicectl list [limit]           # List sessions (default: 50)
voicectl recent [count]         # Recent sessions (default: 10)
```

**Output:**
```
ID                   Date             Size     Title
-------------------- ---------------- -------- ----------------------------------------
VOICE-2026-02-09_... 2026-02-09 14:30   12KB   Pattern: Spiritual Bypassing
VOICE-2026-02-08_... 2026-02-08 10:15    8KB   Frame Shift: Wien Sanctuary
```

### Viewing & Editing

```bash
voicectl show <id>              # View with glow/bat
voicectl edit <id>              # Edit in micro/nano
```

### Search & Analysis

```bash
voicectl search <query>         # Search by content
voicectl stats                  # Session statistics
voicectl strike <id>            # Extract STRIKE for Door
voicectl dir                    # Show VOICE directory
```

**Stats Output:**
```
📊 Total Sessions:     61
📅 This Week:          2
📆 This Month:         8
📈 Avg per Month:      ~5
```

## Session Flow

### Interactive Start

```bash
voicectl start
```

**Guides you through:**

1. **STOP** - What pattern needs interrupting?
   - Describes destructive pattern
   - Names the loop

2. **SUBMIT** - What truth must be faced?
   - Surrenders to reality
   - Admits what's being avoided

3. **STRUGGLE** - What story needs rewriting?
   - Old narrative vs new narrative
   - Rewrites limiting belief

4. **STRIKE** - What decisive action follows?
   - Concrete next steps
   - Becomes War Stack input

### Template Creation

```bash
voicectl start  # Choose "template only"
```

Creates markdown template with 4-step structure, then opens in editor.

## File Format

### Location
```
~/AlphaOs-Vault/VOICE/VOICE-YYYY-MM-DD_HHMM.md
```

Or:
```
~/Voice/VOICE-YYYY-MM-DD_HHMM.md
```

### Structure
```markdown
# VOICE Session - 2026-02-09 14:30

## STOP - Pattern Interrupt

**What pattern needs interrupting?**

[Your response]

## SUBMIT - Face Truth

**What truth must be faced?**

[Your response]

## STRUGGLE - Rewrite Story

**What story needs rewriting?**

[Your response]

## STRIKE - Decisive Action

**What action follows?**

[Your response]

---

**Session Complete:** 2026-02-09 15:00
```

## Integration

### With THE DOOR

**VOICE → DOOR Pipeline:**

```
VOICE Session
    ↓ STRIKE extracted
doorctl war create
    ↓ War Stack created
Fire Map (4 Hits)
```

**Extract STRIKE:**
```bash
voicectl strike 2026-02-09
```

Output becomes War Stack input.

### With THE GAME

**VOICE → GAME Pipeline:**

```
VOICE Sessions (61 accumulated)
    ↓ Insights extracted
Frame Map Update
    ↓ Cascade triggered
Freedom/Focus/Fire Update
```

**Process VOICE material:**
1. Review recent sessions: `voicectl recent 10`
2. Extract patterns for Frame Map
3. Update Frame: `gamectl edit frame being`
4. Check cascade: `gamectl cascade being`

### With aosctl

```bash
aosctl voice start              # Delegates to voicectl
aosctl voice list               # List sessions
aosctl status                   # Includes VOICE stats
```

## Architecture

```
voice/
├── lib/
│   ├── voice_data.sh           # Session access
│   ├── voice_session.sh        # 4-step facilitation
│   └── voice_format.sh         # Pretty printing
├── cli/voicectl                # CLI interface
└── api/                        # Node.js handlers (future)
```

**Design:** Logic in `lib/*.sh`, reusable by CLI and API.

## Example Workflows

### Morning Pattern Interrupt

```bash
# Feeling stuck?
voicectl start

# Guides through:
# STOP: "Procrastinating on Ausbildung"
# SUBMIT: "I'm avoiding failure"
# STRUGGLE: "Old: I'm not qualified. New: I'm learning."
# STRIKE: "Block 3h for Theorieblock 3"

# Strike becomes War Stack
doorctl war create  # Use strike as input
```

### Weekly Frame Review

```bash
# Review this week's sessions
voicectl recent 7

# Extract common patterns
voicectl search "bypassing"
voicectl search "erdung"

# Update Frame Map
gamectl edit frame being
```

### Monthly Integration

```bash
# Statistics check
voicectl stats

# If 8+ sessions/month:
# → Rich material for Frame updates
# → Patterns emerging

# Process insights:
voicectl list 30
# Open each, extract STRIKEs
# Update Maps accordingly
```

## Troubleshooting

**Sessions not found:**
- Check vault location: `voicectl dir`
- Verify directory exists: `ls $(voicectl dir)`
- Create if needed: `mkdir -p $(voicectl dir)`

**Interactive mode not working:**
- Install gum: `yay -S gum` (optional, enhances UX)
- Falls back to simple prompts if gum unavailable

**Editor not opening:**
- Set EDITOR: `export EDITOR=micro`
- Or use default nano

**Search not finding:**
- Uses case-insensitive grep
- Check spelling
- Try broader terms

## Environment

```bash
export AOS_VAULT_DIR=~/AlphaOs-Vault    # Vault location
export EDITOR=micro                      # Preferred editor
```

## Dependencies

**Required:**
- bash 4.0+
- jq (JSON parsing)

**Optional:**
- gum (enhanced interactive prompts)
- glow (markdown rendering)
- bat (syntax highlighting)
- micro/nano (editors)

## Philosophy

**THE VOICE is about reclaiming mental sovereignty.**

Without VOICE:
- Prisoner to destructive patterns
- Unconscious narrative loops
- No agency, just reaction

**With VOICE:**
- Pattern interrupt (STOP)
- Truth facing (SUBMIT)
- Narrative rewriting (STRUGGLE)
- Decisive action (STRIKE)

**The 4 steps are non-negotiable.**

Skip SUBMIT? You haven't faced truth = fake STRIKE.
Skip STRUGGLE? Old story still running = pattern returns.
Skip STRIKE? Just insight porn = no change.

**All 4 steps, every time.**

**VOICE = upstream of everything.**

VOICE feeds DOOR (STRIKE → War Stack)
VOICE updates GAME (insights → Frame Map)
VOICE IS mental mastery that enables all other DOMINION.

**61 sessions Q3/Q4 = rich material waiting.**

Process them. Update Frame Maps. Build DOMINION from your own mental clarity.

---

**Start now:**
```bash
voicectl start
```

Face the pattern. Rewrite the story. Take action.

**Mental mastery through THE VOICE.** 🛑🙏⚔️⚡
