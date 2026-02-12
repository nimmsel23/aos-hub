# Door Management Component

Complete door lifecycle management for αOS - from Potential to Profit.

## Quick Start

```bash
# List all active doors
doorctl list

# Show detail for specific door
doorctl show Ausbildung

# Check door health
doorctl health

# Today's focus (top 3 hits)
doorctl focus

# Mark hit done
doorctl done 123abc
```

## What is a Door?

**Door** = Project that opens opportunities (potential → IPW)

**Key Concepts:**
- **4P Flow**: Potential → Plan → Production → Profit
- **War Stack**: FACT/OBSTACLE/STRIKE/RESPONSIBILITY framework
- **Hits**: Actionable tasks (4 per War Stack)
- **Domino Doors**: One door opens many others

## Architecture

```
door/
├── lib/           # Core logic (shell libraries)
├── cli/           # CLI interface (doorctl)
├── api/           # Node.js API (for Index Node)
└── AGENTS.md      # Developer guidelines
```

**Design:** Logic in `lib/*.sh`, consumed by both CLI and API.

## Commands

### List & Overview

```bash
doorctl list              # All active doors
doorctl show <door>       # Detail view
doorctl health            # Health check
doorctl stalled           # Only stalled doors
```

### Hit Management

```bash
doorctl hits [door]       # List hits for door (or all)
doorctl hitlist           # All pending hits
doorctl next [door]       # Next hit to work on
doorctl done <uuid>       # Mark hit complete
doorctl focus             # Top 3 priorities
```

## Door Phases

| Phase | Emoji | Description |
|-------|-------|-------------|
| **Potential** | 💡 | Ideas in Hot List, no plan yet |
| **Plan** | 📋 | War Stack created, ready to execute |
| **Production** | 🔨 | Active work, hitting hits |
| **Profit** | 💰 | Achieved, reflection time |

**Phase Detection:**
- Tags `+potential` → Potential
- Tags `+plan` → Plan
- Tags `+hit` or `+strike` → Production
- Tags `+profit` or `+done` → Profit

## Health Status

| Status | Emoji | Threshold |
|--------|-------|-----------|
| **Healthy** | ✅ | Activity within 3 days |
| **Needs Attention** | ⚠️ | No activity for 3+ days |
| **Stalled** | 🔥 | No activity for 7+ days |

**Configuration:**
```bash
export AOS_DOOR_STALLED_DAYS=7
export AOS_DOOR_ATTENTION_DAYS=3
```

## Taskwarrior Integration

**Required UDA:**
```bash
task config uda.door_name.type string
task config uda.door_name.label Door
```

**Creating Door Tasks:**
```bash
# Add hit to door
task add "Theorieblock 1" +hit +door door_name:Ausbildung project:BUSINESS.Ausbildung due:2026-03-15

# Mark door task done
task 123 done
```

**Tags:**
- `+door` - Door-related task
- `+hit` - Specific hit from War Stack
- `+strike` - Critical action from STRIKE
- `+potential` - In Potential phase
- `+plan` - In Plan phase

## Output Examples

### `doorctl list`

```
╔═══════════════════╦═══════════╦══════╦══════╦══════╦═══════════════╗
║ DOOR              ║ PHASE     ║ HITS ║ DONE ║  %   ║ LAST ACTIVITY ║
╠═══════════════════╬═══════════╬══════╬══════╬══════╬═══════════════╣
║ Ausbildung        ║ 🔨 Prod   ║  12  ║   8  ║ 67%  ║ 2h ago        ║
║ FADARO            ║ 📋 Plan   ║   4  ║   1  ║ 25%  ║ 3d ago ⚠️      ║
║ Vital Dojo        ║ 💡 Pot    ║   0  ║   0  ║  -   ║ 8d ago 🔥      ║
╚═══════════════════╩═══════════╩══════╩══════╩══════╩═══════════════╝
```

### `doorctl show Ausbildung`

```
Door: Ausbildung
Phase: 🔨 Prod
Project: BUSINESS.Ausbildung
Tags: door, focus, hit, business
Hits: 12 total, 8 done, 4 pending

Progress: [████████████░░░░░░░░] 67%

Pending Hits:
  🔲 [123abc7] Trainingsplanerstellung (due: 20260314T230000Z, priority: H)
  🔲 [456def9] Praktikum Phase 2 (due: 20260320T120000Z, priority: H)

Completed Hits:
  ✅ [789ghi2] Theorieblock 1 (done: 20251201T150000Z)
  ✅ [abc123d] Theorieblock 2 (done: 20251215T140000Z)
```

### `doorctl health`

```
Door Health Check:
✅ Ausbildung: Healthy (2h ago)
⚠️  FADARO: Needs attention (3d ago)
🔥 Vital Dojo: STALLED (8d ago)

Stalled = no activity in 7+ days
Needs attention = no activity in 3+ days
```

## Index Node Integration

**API Endpoints** (for web UI):

```javascript
// List all doors
GET /api/door/list
// → [{name, count, done, pending, phase, modified}, ...]

// Show door detail
GET /api/door/show/:name
// → {name, tasks: [...], metadata: {...}}

// Health check
GET /api/door/health
// → [{name, health, activity}, ...]
```

**Implementation:**
```javascript
// door/api/list.js
const doorAPI = require('../../door/api');

router.get('/api/door/list', doorAPI.list);
```

Calls `door/lib/door_data.sh` functions via `spawn()`.

## Configuration

**Environment Variables:**

```bash
# Task binary location
export TASK_BIN=task

# Vault directory
export AOS_VAULT_DIR=~/AlphaOS-Vault

# Health thresholds
export AOS_DOOR_STALLED_DAYS=7
export AOS_DOOR_ATTENTION_DAYS=3
```

**Location:**
- Global: `~/.env/aos.env`
- Project: `.env` (git-ignored)

## Dependencies

**Required:**
- bash 4.0+
- Taskwarrior 2.6+ (with `door_name` UDA)
- jq (JSON parsing)
- bc (calculations)

**Optional:**
- Node.js 18+ (for API)
- gum (enhanced CLI UI)

## Development

**Adding New Features:**

1. Add function to `door/lib/*.sh`
2. Use in `door/cli/doorctl`
3. Expose via `door/api/*.js`
4. Update this README
5. Test with real data

**Testing:**

```bash
# CLI smoke test
doorctl list
doorctl health
doorctl show Ausbildung

# API test (if Index Node running)
curl localhost:8799/api/door/list | jq
```

**See AGENTS.md for detailed development guidelines.**

## Roadmap

**Phase 1 (Current):** ✅
- [x] List doors
- [x] Show detail
- [x] Health checks
- [x] Hit management
- [x] Focus view

**Phase 2 (Next):**
- [ ] War Stack integration
- [ ] 4P Flow tracking
- [ ] Velocity reports
- [ ] Door creation wizard

**Phase 3 (Future):**
- [ ] Domino Door detection
- [ ] Weekly reports
- [ ] Vault export/import
- [ ] Fire Map integration

## Troubleshooting

**No doors found:**
```bash
# Check Taskwarrior has tasks with door_name
task door_name:Ausbildung list

# Verify UDA is configured
task show | grep door_name
```

**Stalled detection not working:**
```bash
# Check modified timestamps exist
task export | jq '.[].modified'

# Adjust threshold
export AOS_DOOR_STALLED_DAYS=14
```

**API not loading:**
```bash
# Verify lib/ files are executable
chmod +x door/lib/*.sh

# Test lib directly
bash -c 'source door/lib/door_data.sh && get_doors'
```

## Examples

**Daily Workflow:**

```bash
# Morning: Check health
doorctl health

# See what to work on
doorctl focus

# Work on next hit
doorctl next Ausbildung

# Mark done when finished
doorctl done 123abc

# End of day: Review progress
doorctl show Ausbildung
```

**Weekly Review:**

```bash
# Check all doors
doorctl list

# Identify stalled doors
doorctl stalled

# Review specific door
doorctl show FADARO

# Check pending hits
doorctl hitlist
```

## Support

- **Documentation:** `door/AGENTS.md`
- **CLI Help:** `doorctl help`
- **Issues:** Create codex session with `doorctl codex`
