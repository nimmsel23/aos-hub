# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**aos-hub** is the central infrastructure for the AlphaOS ecosystem - a Hub-and-Spoke architecture combining a local Node.js server (Index Node), a Python Telegram router bot, an aiohttp bridge service, and Google Apps Script fallback centres.

## Component-Specific Guidelines

**IMPORTANT:** When working on a specific component, always read its AGENTS.md first:

| Component | Guidelines | Purpose |
|-----------|------------|---------|
| **Index Node** | `index-node/AGENTS.md` | Build commands, coding style, smoke tests |
| **Router Bot** | `router/AGENTS.md` | routerctl usage, extension patterns |
| **Bridge** | `bridge/AGENTS.md` | bridgectl, selftest.py, handler patterns |
| **GAS HQ** | `gas/AGENTS.md` | **Scope isolation** - work only in gas/ |
| **War Stack Bot** | `python-warstack-bot/AGENTS.md` | Idle timeout, resume flow |
| **Fire Map Bot** | `python-firemap-bot/AGENTS.md` | On-demand usage, tele fallback |

**Pattern:** Each component has focused guidelines. This CLAUDE.md provides the high-level architecture, component AGENTS.md files provide detailed implementation notes.

**Critical Architectural Principle:** This is NOT a monolith. It's a coordinated multi-service system where:
- **Index Node (8799)** = Primary HQ (local web UI + API server)
- **Router Bot** = Telegram interface that routes commands to centres
- **Bridge (8080)** = Data flow service for Core4/Fruits/Tent/Tasks
- **GAS** = Cloud fallback when laptop is offline

## Development Commands

### Index Node (Node.js)
```bash
cd ~/aos-hub/index-node
npm install
node server.js                    # Start on http://127.0.0.1:8799
npm run core4                     # Core4 TTY utility
```

### Router Bot (Python/aiogram)
```bash
cd ~/aos-hub/router
pip install -r requirements.txt
python router_bot.py             # Run router bot
./routerctl status               # Check systemd status
./routerctl restart              # Restart service
./routerctl heartbeat install    # Install heartbeat timer
```

### Bridge Service (Python/aiohttp)
```bash
cd ~/aos-hub/bridge
sudo pacman -S python-aiohttp    # Arch install (no pip)
python app.py --host 0.0.0.0 --port 8080
./bridgectl status               # Check status
./bridgectl health               # Health check
./bridgectl flush                # Flush queue
```

### System Health
```bash
./scripts/aos-doctor             # Unified health report
./hubctl doctor                  # Alternative wrapper
```

## Architecture Deep Dive

### Hub-and-Spoke Pattern

```
User (Telegram/Browser)
    ↓
GAS Bot (24/7 cloud, always reachable)
    ↓
Status Check (Bridge 8080)
    ↓
Laptop online?
    ├─ YES → Router Bot → Index Node (localhost) → Services
    └─ NO  → GAS Web Apps (fallback)
```

**Why Router Bot exists:** Security boundary between Telegram and PC services. Without it, Telegram users would need direct PC access.

### Single Source of Truth: menu.yaml

`index-node/menu.yaml` defines ALL centre routes. This JSON file is consumed by:
- Index Node web UI (browser)
- Router Bot via `/api/centres` (Telegram)
- CLI tools (fish/python)

**Critical Rule:** NEVER hardcode centre URLs in application code. Always read from menu.yaml.

### Configuration Separation (Common Mistake)

**menu.yaml (Index Node)** = Centre URLs for routing
```json
{"cmd": "door", "label": "Door Centre", "url": "/door"}
```

**config.yaml (Router Bot)** = Extension configs (NOT centre URLs)
```yaml
extensions:
  - door_flow
door_flow:
  api_base: http://127.0.0.1:8799
```

These files serve DIFFERENT purposes. Don't confuse them.

### Command Resolution Flow

When user sends `/door` in Telegram:
1. Router Bot receives command
2. Checks if extension handles it (door_flow)
3. If not, fetches from Index API (`/api/centres`)
4. Index API reads menu.yaml
5. Returns URL to user

Three command types:
- **Core commands** (hardcoded): `/start`, `/menu`, `/reload`, `/help`
- **Dynamic commands** (from Index API): `/voice`, `/door`, `/game`, `/fire`, etc.
- **Extension commands** (from extensions): `/war`, `/facts` (added by extensions)

### Extension System (Router Bot)

Extensions live in `router/extensions/` and inherit from `extensions/base.py`. They're loaded via `config.yaml`.

**Active Extensions:**
- `door_flow` - War Stack creation flow (local API)
- `fruits_daily` - Daily Fruits facts
- `firemap_commands` - Fire Map trigger
- `core4_actions` - Taskwarrior shortcuts (disabled by default)

**Creating Extension:**
1. Create `extensions/my_extension.py`
2. Subclass `Extension` from `base.py`
3. Implement `setup()` to register handlers
4. Add to `config.yaml`:
```yaml
extensions:
  - my_extension
my_extension:
  # config here
```

### Data Flow Patterns

**War Stack Creation** has 3 independent interfaces:
1. Telegram (War Stack Bot conversation)
2. Web UI (Index Node `/door`)
3. GAS Web App (cloud fallback)

All output same format:
- Markdown in `~/AlphaOS-Vault/Door/War-Stacks/`
- Taskwarrior commands

**Core4 Logging:**
- UI → Bridge `/bridge/core4/log`
- Bridge writes JSON to `~/AlphaOS-Vault/Alpha_Core4/core4_week_YYYY-Wxx.json`
- Weekly summary exported to `~/AlphaOS-Vault/Alpha_Tent/`

**Fruits/Facts:**
- Questions in `index-node/data/fruits_questions.json`
- Answers in `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`
- Export to `~/AlphaOS-Vault/Game/Fruits/*.md`

## Storage Conventions

### Vault Structure
```
~/AlphaOS-Vault/
├── Door/
│   ├── 1-Potential/         # Hot List
│   ├── 2-Plan/              # Door War
│   ├── War-Stacks/          # War Stacks
│   ├── 3-Production/        # Hit List
│   └── 4-Profit/            # Profit reflections
├── Game/
│   ├── Frame/               # Frame Maps
│   ├── Freedom/             # Freedom Maps
│   ├── Focus/               # Focus Maps
│   ├── Fire/                # Fire Maps
│   ├── Fruits/              # Fruits/Facts
│   └── Tent/                # General's Tent
├── VOICE/                   # Voice sessions (or ~/Voice)
├── Alpha_Core4/             # Core4 weekly JSON
└── Alpha_Tent/              # Weekly summaries
```

### Local Data Cache
```
~/.local/share/alphaos/
├── task_export.json         # Taskwarrior export
├── task_sync_map.json       # UUID bridge (TickTick)
├── core4_today.json         # Core4 fallback
└── vault-backups/           # rclone backup dir
```

## Environment Variables

### Index Node
```bash
HOST=0.0.0.0
PORT=8799
MENU_YAML=./menu.yaml
AOS_BRIDGE_URL=http://127.0.0.1:8080    # Core4 bridge
DOOR_HITS_TICKTICK=1                    # Push to TickTick
TERMINAL_ENABLED=1
TERMINAL_ALLOW_REMOTE=0                 # Security: localhost only
```

### Router Bot
```bash
TELEGRAM_BOT_TOKEN=<from @BotFather>
ALLOWED_USER_ID=<optional user restriction>
ROUTER_CONFIG=./config.yaml
```

### Bridge
```bash
AOS_BRIDGE_HOST=0.0.0.0
AOS_BRIDGE_PORT=8080
AOS_TZ=Europe/Vienna
AOS_VAULT_DIR=~/AlphaOS-Vault
AOS_GAS_WEBHOOK_URL=<GAS webhook>
AOS_GAS_CHAT_ID=<Telegram chat>
AOS_TASK_EXECUTE=1                      # Allow task execution
```

## systemd Services

**User Units** (recommended):
```bash
systemctl --user status alphaos-router.service
systemctl --user status aos-bridge.service
```

**System Units** (optional):
```bash
sudo systemctl status aos-index.service
sudo systemctl status aos-router.service
sudo systemctl status aos-bridge.service
```

**Timers:**
```bash
systemctl --user status alphaos-vault-sync-pull.timer    # Daily pull
systemctl --user status alphaos-vault-sync-push.timer    # Daily push
systemctl --user status alphaos-heartbeat.timer          # Router heartbeat
```

**Config Location:** `/etc/alphaos-hub/env` (system) or `~/.env/*.env` (user)

## API Endpoints Reference

### Index Node (8799)

**Menu & Health:**
- `GET /menu` - Raw menu.yaml as JSON
- `GET /api/centres` - Normalized for Router Bot
- `GET /health` - Service health

**Door:**
- `GET /api/door/flow` - Door flow state
- `GET /api/door/hotlist` - Hot List items
- `POST /api/door/hotlist` - Add Hot List item
- `POST /api/door/doorwar` - Run Door War
- `POST /api/door/warstack/start` - Start War Stack
- `POST /api/door/warstack/answer` - Answer step
- `GET /api/door/warstack/:id` - Fetch War Stack
- `POST /api/door/export` - Export markdown to vault

**Game:**
- `POST /api/game/export` - Export Game map markdown
- `GET /api/game/chapters?source=alphaos|blueprints` - Chapters

**Voice:**
- `POST /api/voice/export` - Save session markdown
- `GET /api/voice/history?limit=50` - Recent files
- `GET /api/voice/file?path=...` - Read file
- `POST /api/voice/autosave` - Autosave section

**Fruits:**
- `GET /api/fruits` - Questions + answers
- `POST /api/fruits/next` - Next unanswered
- `POST /api/fruits/answer` - Submit answer
- `POST /api/fruits/export` - Export markdown

**Core4:**
- `POST /api/core4` - Toggle subtask
- `GET /api/core4/today` - Today's totals

**Taskwarrior:**
- `GET /api/taskwarrior/tasks?status=pending&tags=door` - Filtered tasks
- `POST /api/taskwarrior/add` - Add task
- `POST /api/taskwarrior/push` - Push to TickTick

### Bridge (8080)

**Health:**
- `GET /health` - Bridge health

**Core4:**
- `POST /bridge/core4/log` - Log Core4 event
- `GET /bridge/core4/today` - Today's totals
- `GET /bridge/core4/week?week=YYYY-Wxx` - Weekly JSON

**Fruits:**
- `POST /bridge/fruits/answer` - Submit Fruits answer

**Tent:**
- `POST /bridge/tent/summary` - Save weekly summary

**Task:**
- `POST /bridge/task/operation` - Forward to GAS
- `POST /bridge/task/execute` - Execute local Taskwarrior

**War Stack:**
- `POST /bridge/warstack/draft` - Save draft for /resume

**Queue & Sync:**
- `POST /bridge/queue/flush` - Flush failed operations
- `POST /bridge/sync/push?dry_run=1` - Push to Drive
- `POST /bridge/sync/pull?dry_run=1` - Pull from Drive

## Testing & Verification

### Smoke Test Checklist
```bash
# 1. Index Node
curl http://127.0.0.1:8799/health
curl http://127.0.0.1:8799/api/centres | jq
open http://127.0.0.1:8799

# 2. Bridge
curl http://127.0.0.1:8080/health

# 3. Router Bot (Telegram)
# Send: /start, /menu, /door, /game

# 4. Web UI Navigation
# Open: /game, /game/tent, /door, /voice, /facts

# 5. Door Export Test
# Create Hot List → Export → Check ~/AlphaOS-Vault/Door/1-Potential/

# 6. Core4 Bridge
# Toggle task → Check Bridge logs
```

### Common Issues

**"Index API unreachable"** (Router Bot)
- Check Index Node is running: `curl http://127.0.0.1:8799/health`
- Verify `config.yaml` has correct `index_api.base`

**"Unknown command"** (Router Bot)
- Send `/reload` to refresh centre list
- Check menu.yaml has the command
- Verify extension isn't disabled

**Extension not loading**
- Check router logs for errors
- Ensure extension is listed in `config.yaml`
- Restart router after config changes

**Terminal websocket rejected**
- Set `TERMINAL_ENABLED=1`
- For remote: `TERMINAL_ALLOW_REMOTE=1` (security risk!)

**Vault files not saving**
- Check `~/AlphaOS-Vault` exists
- Verify permissions on vault directories
- Check env vars point to correct paths

## Security Notes

- **Terminal access:** Restricted to localhost by default. NEVER enable remote access in production.
- **Bot tokens:** Store in `.env` files, NEVER commit to git
- **User restriction:** Set `ALLOWED_USER_ID` in Router Bot to restrict access
- **Bridge forwarding:** GAS webhook URLs should use Apps Script security
- **Tailscale:** Recommended for remote access (100.76.197.55 = laptop Tailscale IP)

## Git Workflow

Repo uses standard git flow:
- Commit messages: Imperative, short, scoped (e.g., "Add Fruits export API")
- Modified files show as unstaged (see `git status` output above)
- Untracked files: Many runtime configs/scripts in root

**Don't commit:**
- `.env` files (tokens/secrets)
- `node_modules/`
- Local data caches (`data/*.json` runtime state)
- Vault symlinks or actual vault content

## Troubleshooting Tools

```bash
# System health
./scripts/aos-doctor                    # Complete status report
./hubctl doctor                         # Alternative wrapper

# Component-specific
./router/routerctl status               # Router systemd
./router/routerctl heartbeat status     # Heartbeat timer
./bridge/bridgectl health               # Bridge health
./bridge/bridgectl debug                # Bridge debug info
./bridge/bridgectl tailscale            # Show Tailscale IPs

# Logs
journalctl --user -u alphaos-router -f
journalctl --user -u aos-bridge -f
journalctl -u aos-index -f             # If system service
```

## Integration Points

**Taskwarrior Hooks:**
- `scripts/taskwarrior/on-add.alphaos.py`
- `scripts/taskwarrior/on-modify.alphaos.py`

**TickTick Sync:**
- Token in `~/.alpha_os/tick.env`
- UUID bridge in `~/.local/share/alphaos/task_sync_map.json`
- Scripts: `scripts/task_sync_map_update.py`

**Vault Sync (rclone):**
- Script: `index-node/scripts/vault-sync.sh`
- Modes: `pull`, `push`, `bisync`
- Timers: `alphaos-vault-sync-pull.service`, `alphaos-vault-sync-push.service`

## Component Work Guidelines

**Before editing any component:**

1. **Read its AGENTS.md** - Contains component-specific gotchas, patterns, coding style
2. **Follow scope isolation** - Especially important for GAS (work only in gas/)
3. **Use component tools** - routerctl (Router), bridgectl (Bridge), indexctl (Index Node)
4. **Test appropriately** - Each component has different test patterns

**Component AGENTS.md files:**
- `index-node/AGENTS.md` - Repository guidelines, build commands, smoke tests
- `router/AGENTS.md` - Router bot patterns, extension system
- `bridge/AGENTS.md` - Bridge patterns, non-throwing handlers
- `gas/AGENTS.md` - **CRITICAL:** Scope isolation - do NOT edit other components in GAS session
- `python-warstack-bot/AGENTS.md` - War Stack bot specific patterns
- `python-firemap-bot/AGENTS.md` - Fire Map bot specific patterns

## Future Directions

See `ROADMAP.md` for planned features. Current focus:
- Stabilize HQ UI with inline centres
- Harden data flow between components
- Improve Telegram automation
- Multi-user support (later)
