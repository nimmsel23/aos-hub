# door/ - Door Management Component

Component for Door lifecycle, War Stacks, Hit tracking, and 4P Flow.

## Architecture

```
door/
├── lib/                      # Core logic (reusable)
│   ├── door_data.sh          # Task export parsing, door fetching
│   ├── door_phase.sh         # Phase detection (potential/plan/production/profit)
│   ├── door_health.sh        # Health checks, stalled detection, time ago
│   └── door_format.sh        # Pretty printing, tables, progress bars
├── cli/
│   └── doorctl               # CLI interface (sources lib/*)
├── api/                      # Node.js API handlers (for Index Node)
│   ├── list.js               # GET /api/door/list
│   ├── show.js               # GET /api/door/show/:name
│   └── health.js             # GET /api/door/health
└── AGENTS.md                 # This file
```

## Design Principles

### 1. Separation of Concerns

**Shell Libraries (lib/\*):**
- Pure data/logic functions
- No UI dependencies
- Reusable by CLI + Node.js API
- Testable in isolation

**CLI (cli/doorctl):**
- User interface layer
- Sources lib/* for logic
- Uses ctl-lib.sh for UI helpers
- Handles user interaction

**API (api/\*):**
- Node.js wrappers
- Calls shell libs via child_process.spawn()
- Returns JSON for web UI
- No business logic (delegates to lib/*)

### 2. Data Flow

```
Taskwarrior
    ↓
door_data.sh (task export → JSON)
    ↓
door_phase.sh (phase detection)
    ↓
door_health.sh (stalled/attention checks)
    ↓
door_format.sh (pretty printing)
    ↓
CLI (doorctl) OR API (Index Node)
```

### 3. No Duplication

**BAD:**
- Parsing logic in both doorctl and Node.js
- Health checks duplicated in CLI and API
- Phase detection hardcoded in multiple places

**GOOD:**
- One source of truth (lib/*.sh)
- CLI and API both source the same libs
- Update once, affects all consumers

## Usage Patterns

### CLI Usage

```bash
# Direct invocation
door/cli/doorctl list

# Via wrapper (backwards compat)
scripts/doorctl list

# Sources:
# - door/lib/door_data.sh
# - door/lib/door_phase.sh
# - door/lib/door_health.sh
# - door/lib/door_format.sh
```

### API Usage (Node.js)

```javascript
// door/api/list.js
const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');

async function getDoors() {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', `
      source ${LIB_DIR}/door_data.sh
      get_doors
    `]);

    let stdout = '';
    proc.stdout.on('data', data => stdout += data);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Failed'));
      resolve(JSON.parse(stdout));
    });
  });
}

// Express route
app.get('/api/door/list', async (req, res) => {
  const doors = await getDoors();
  res.json(doors);
});
```

### Index Node Integration

```javascript
// index-node/routes/door.js
const doorAPI = require('../../door/api');

router.get('/api/door/list', doorAPI.list);
router.get('/api/door/show/:name', doorAPI.show);
router.get('/api/door/health', doorAPI.health);
```

## Adding New Features

### 1. Add to lib/ first

```bash
# door/lib/door_velocity.sh
get_door_velocity() {
  local door_name="$1"
  local weeks="${2:-4}"

  # Calculate hits per week for last N weeks
  # ...
}
```

### 2. Use in CLI

```bash
# door/cli/doorctl
source "$DOOR_DIR/lib/door_velocity.sh"

cmd_velocity() {
  local door_name="$1"
  get_door_velocity "$door_name"
}
```

### 3. Use in API

```javascript
// door/api/velocity.js
async function getVelocity(doorName, weeks = 4) {
  const proc = spawn('bash', ['-c', `
    source ${LIB_DIR}/door_velocity.sh
    get_door_velocity "${doorName}" ${weeks}
  `]);
  // ...
}
```

## Testing

### Unit Test (lib/)

```bash
# Test door_health.sh functions
source door/lib/door_health.sh

# Test time_ago
result=$(time_ago "20260209T100000Z")
echo "Time ago: $result"

# Test is_stalled
if is_stalled "20260101T000000Z"; then
  echo "✅ Stalled detection works"
fi
```

### Integration Test (CLI)

```bash
# Smoke test
door/cli/doorctl list
door/cli/doorctl show Ausbildung
door/cli/doorctl health
```

### API Test (Node.js)

```bash
# Start Index Node
npm start

# Test API
curl http://localhost:8799/api/door/list | jq
curl http://localhost:8799/api/door/health | jq
```

## Environment Variables

```bash
# Task binary
export TASK_BIN=task

# Vault location
export AOS_VAULT_DIR=~/AlphaOS-Vault

# Health thresholds
export AOS_DOOR_STALLED_DAYS=7      # Days before stalled
export AOS_DOOR_ATTENTION_DAYS=3    # Days before needs attention
```

## Coding Style

### Shell (lib/ + cli/)

- Use `set -euo pipefail`
- Shellcheck clean (no errors)
- Functions return JSON when possible
- No hardcoded paths (use env vars)
- Error handling with `|| return 1`
- Comments for complex logic

### Node.js (api/)

- Async/await for all I/O
- Spawn bash with explicit source
- Parse JSON from stdout
- Return 500 on errors
- No business logic (delegate to lib/)

## Dependencies

**Required:**
- bash 4.0+
- jq (JSON parsing)
- bc (percentage calculations)
- Taskwarrior 2.6+ (with door_name UDA)

**Optional:**
- Node.js 18+ (for API)
- gum (enhanced UI in CLI)

## Future Additions

**Phase 2:**
- War Stack integration (lib/door_war.sh)
- 4P Flow tracking (lib/door_flow.sh)
- Velocity reports (lib/door_velocity.sh)
- Forecast calculations (lib/door_forecast.sh)

**Phase 3:**
- Domino Door detection (lib/door_domino.sh)
- Weekly reports (lib/door_report.sh)
- Export to vault (lib/door_export.sh)
- Import from vault (lib/door_import.sh)

## Common Gotchas

1. **jq parsing**: Always check for null/empty arrays
2. **Timestamp formats**: Taskwarrior uses `20260209T105635Z` format
3. **Door name spaces**: Use `door_name:"Name With Spaces"` in task commands
4. **Subshell isolation**: Variables in while loops are scoped (use `mapfile` instead)
5. **Phase detection**: Tags determine phase (hit = production, potential = potential, etc.)

## Claude Code Guidelines

**When working on this component:**

1. **Read AGENTS.md first** (this file)
2. **Modify lib/ for logic changes** (never put logic in CLI/API)
3. **Test with real Taskwarrior data** before committing
4. **Keep CLI and API in sync** (both should support same features)
5. **Document new env vars** in this file
6. **Update README.md** for user-facing changes

**Don't:**
- Duplicate logic between CLI and API
- Hardcode paths or configs
- Skip error handling
- Break backwards compatibility without reason
