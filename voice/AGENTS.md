# AGENTS.md - VOICE Component Development

Guidelines for Claude Code when working on THE VOICE component.

## Architecture Overview

THE VOICE follows the standard αOS component architecture:

```
voice/
├── lib/                # Bash libraries (core logic)
│   ├── voice_data.sh       # Session file access & listing
│   ├── voice_session.sh    # 4-step facilitation
│   └── voice_format.sh     # Pretty printing
├── cli/voicectl        # CLI interface (sources libs)
├── api/                # Node.js handlers (future, spawn bash libs)
├── README.md           # User documentation
└── AGENTS.md           # This file (dev guidelines)
```

**Design Principle:** Single source of truth in bash libs. CLI and API both use same libs.

## Blueprint-First Rule

- Voice development should begin from local blueprint/chapter/spec artifacts in this pillar.
- Treat these artifacts as intent, then implement in canonical Voice paths (`voice/lib/*`, `voice/cli/voicectl`, future `voice/api/*`).
- If files are named as chapters/specs (not `blueprint`), they still count as blueprint sources.
- Primary chapter references are local symlinks in `voice/` (e.g. `19 - The Voice Intro.md` ... `24 - The Voice Summary.md`) pointing to `AlphaOS-blueprints/`.
- Record blueprint-to-code mapping in commit/PR notes when behavior changes.

## Lint In Plain Language

- `scripts/scripts-lint.sh` validates ctl naming/wiring conventions.
- `ERROR` means breakage that must be fixed before considering the refactor done.
- `WARN` means migration/legacy reminders; handle iteratively after errors are zero.

## Bash Library Guidelines

### voice_data.sh

**Purpose:** Session file access, listing, search

**Key Functions:**
- `get_voice_dir()` - Determines VOICE directory (vault or fallback)
- `get_session_file(id)` - Resolves session file path
- `list_sessions([limit])` - Returns JSON array of sessions
- `search_sessions(query)` - Grep-based search, returns JSON
- `session_exists(id)` - Boolean check
- `create_session()` - Creates template, returns file path
- `get_stats()` - Returns JSON with total/week/month counts

**JSON Output Format:**
```json
[
  {
    "id": "VOICE-2026-02-09_1430",
    "path": "/home/alpha/AlphaOs-Vault/VOICE/VOICE-2026-02-09_1430.md",
    "mtime": "2026-02-09 14:30",
    "size": 12345,
    "title": "Pattern: Spiritual Bypassing"
  }
]
```

**Important:**
- Always return valid JSON (empty array if no results)
- Use `jq -n` for JSON construction
- Handle missing directories gracefully
- Sort by modification time (newest first)

### voice_session.sh

**Purpose:** Interactive 4-step session facilitation

**Key Functions:**
- `interactive_session()` - Guides user through 4 steps with prompts
- `quick_session()` - Creates template without interaction
- `get_phase_content(file, phase)` - Extracts specific phase from markdown
- `extract_strike(file)` - Extracts STRIKE content (for Door integration)

**4-Step Prompts:**
```bash
STOP_PROMPT="🛑 STOP - What pattern needs interrupting?"
SUBMIT_PROMPT="🙏 SUBMIT - What truth must be faced?"
STRUGGLE_PROMPT="⚔️  STRUGGLE - What story needs rewriting?"
STRIKE_PROMPT="⚡ STRIKE - What decisive action follows?"
```

**gum Integration:**
- Use `gum write` for multi-line input if available
- Fall back to simple `read -rp` if gum not installed
- Never fail if gum missing

**Session File Structure:**
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

---
**Session Complete:** YYYY-MM-DD HH:MM
```

### voice_format.sh

**Purpose:** Pretty printing and display

**Key Functions:**
- `draw_sessions_table(json)` - Formatted table of sessions
- `draw_search_results(json, query)` - Search results table
- `draw_stats(json)` - Statistics summary with emoji
- `format_session(file)` - Display with glow/bat/cat fallback

**UI Guidelines:**
- Use `ui_title`, `ui_info`, `ui_ok`, `ui_warn`, `ui_err` from ctl-lib.sh
- Emoji for visual structure: 🛑🙏⚔️⚡ (4 steps), 📊📅📆📈 (stats)
- Table formatting: Fixed-width columns, truncate long values
- Graceful fallbacks: glow → bat → cat

## CLI Guidelines (voicectl)

### Command Structure

```bash
voicectl start              # Interactive session
voicectl list [limit]       # List sessions
voicectl recent [count]     # Recent N sessions
voicectl show <id>          # View session
voicectl edit <id>          # Edit session
voicectl search <query>     # Search content
voicectl stats              # Statistics
voicectl strike <id>        # Extract STRIKE
voicectl dir                # Show directory
voicectl help               # Help text
```

### Error Handling

```bash
# Always check if session exists before operations
if ! session_exists "$id"; then
  ui_err "Session not found: $id"
  return 1
fi

# Always validate required arguments
if [[ $# -eq 0 ]]; then
  ui_err "Usage: voicectl show <session-id>"
  exit 1
fi
```

### Integration Points

**With doorctl:**
```bash
# Extract STRIKE for War Stack input
voicectl strike 2026-02-09 | doorctl war create
```

**With gamectl:**
```bash
# After VOICE sessions, update Frame Map
voicectl recent 10
gamectl edit frame being
gamectl cascade being
```

**With aosctl:**
```bash
aosctl voice start          # Routes to voicectl start
aosctl voice list           # Routes to voicectl list
```

## File Naming Conventions

**Session Files:**
```
VOICE-YYYY-MM-DD_HHMM.md
```

Examples:
- `VOICE-2026-02-09_1430.md`
- `VOICE-2026-02-09_2115.md`

**Rationale:**
- Sortable by name
- Easy to identify by date
- Unique per minute (collisions unlikely)

## Storage Locations

**Primary:**
```
~/AlphaOs-Vault/VOICE/
```

**Fallback:**
```
~/Voice/
```

**Detection Logic:**
```bash
get_voice_dir() {
  if [[ -d "$VOICE_DIR" ]]; then
    echo "$VOICE_DIR"
  elif [[ -d "$VOICE_FALLBACK_DIR" ]]; then
    echo "$VOICE_FALLBACK_DIR"
  else
    echo "$VOICE_DIR"  # Default to vault
  fi
}
```

## Testing Checklist

### Smoke Tests

```bash
# 1. Directory detection
voicectl dir

# 2. Create session (template)
voicectl start  # Choose template only

# 3. List sessions
voicectl list

# 4. Show session
voicectl show <id>

# 5. Search
voicectl search "test"

# 6. Statistics
voicectl stats

# 7. Extract STRIKE
voicectl strike <id>

# 8. aosctl integration
aosctl voice list
```

### Edge Cases

1. **Empty VOICE directory:**
   - `voicectl list` → Should show "No sessions found"
   - Not fail or error

2. **Missing directory:**
   - `voicectl dir` → Shows expected path
   - `voicectl start` → Creates directory + file

3. **No gum installed:**
   - `voicectl start` → Falls back to simple prompts
   - Still functional, just less pretty

4. **Session ID ambiguous:**
   - `voicectl show 2026-02-09` → Should find first match
   - Uses `find` with pattern matching

5. **No glow/bat:**
   - `voicectl show <id>` → Falls back to cat
   - Still readable

## API Design (Future)

**Node.js handlers will spawn bash libs:**

```javascript
// voice/api/list.js
const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '../lib');

async function listSessions(limit = 50) {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [
      '-c',
      `source ${LIB_DIR}/voice_data.sh && list_sessions ${limit}`
    ]);

    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error('list_sessions failed'));
      resolve(JSON.parse(stdout));
    });
  });
}

module.exports = { listSessions };
```

**Endpoints:**
- `GET /api/voice/list?limit=50` → list_sessions
- `GET /api/voice/show?id=...` → format_session
- `GET /api/voice/search?q=...` → search_sessions
- `GET /api/voice/stats` → get_stats
- `POST /api/voice/start` → interactive_session (websocket?)
- `GET /api/voice/strike?id=...` → extract_strike

## Integration with αOS Agents

### voice-pillar-agent

**Relationship:** voicectl is the **CLI implementation** of THE VOICE pillar. The voice-pillar-agent is the **Claude Code agent** that facilitates VOICE sessions.

**Division of Labor:**
- **voicectl** (this component): File management, listing, search, display
- **voice-pillar-agent**: Deep facilitation, psychological inquiry, Elliott Hulse voice

**When to use what:**
- `voicectl start` → Basic 4-step template + prompts (fast, offline)
- Claude + voice-pillar-agent → Deep transformative session (slow, online, Elliott voice)

**Integration Pattern:**
```
User: "I need a VOICE session"
Claude: [detects trigger, invokes voice-pillar-agent]
voice-pillar-agent: [deep inquiry, warrior voice, psychological depth]
voice-pillar-agent: [saves to vault via voicectl conventions]
User: "List my sessions"
voicectl list  # CLI shows all sessions (including agent-created)
```

## Common Pitfalls

### ❌ Don't hardcode paths
```bash
# BAD
cat ~/AlphaOs-Vault/VOICE/session.md

# GOOD
local vdir=$(get_voice_dir)
cat "$vdir/session.md"
```

### ❌ Don't fail on missing tools
```bash
# BAD
gum write --placeholder "..."  # Fails if no gum

# GOOD
if command -v gum >/dev/null 2>&1; then
  gum write --placeholder "..."
else
  read -rp "> " input
  echo "$input"
fi
```

### ❌ Don't return invalid JSON
```bash
# BAD
echo "$sessions"  # Could be empty or malformed

# GOOD
echo "$sessions" | jq -s '.'  # Always valid array
```

### ❌ Don't skip error handling
```bash
# BAD
local file=$(get_session_file "$id")
cat "$file"  # Fails if not found

# GOOD
if ! session_exists "$id"; then
  ui_err "Session not found: $id"
  return 1
fi
local file=$(get_session_file "$id")
cat "$file"
```

## Design Philosophy

**THE VOICE component is minimal by design.**

- **No AI/LLM integration here** - That's voice-pillar-agent's job
- **Just file management + display** - Create, list, show, search
- **Offline-first** - Works without internet
- **Fast** - No heavy processing, just bash + jq
- **Integration-ready** - JSON output, clear APIs

**Complex transformation = agent. Simple CRUD = voicectl.**

## Performance Notes

- `list_sessions` with large counts (500+): Use `head -n $limit` to avoid slowness
- `search_sessions`: grep on 61+ markdown files is fast enough (<1s)
- `interactive_session`: User input is bottleneck, not code
- No caching needed (files change rarely)

## Maintenance

**When to update:**
1. Session file format changes → Update `get_phase_content()`, templates
2. New search features needed → Extend `search_sessions()`
3. API integration → Create `api/` handlers following pattern above
4. Statistics enhancements → Extend `get_stats()`

**What NOT to change:**
- File naming format (tools may depend on it)
- JSON output structure (API compatibility)
- 4-step order (philosophical reason)

---

**Version:** v2.0 (Feb 2026)
**Status:** Production Ready
**Next:** API handlers + Index Node integration
