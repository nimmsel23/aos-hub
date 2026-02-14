# alphaos-router

**Dumb Telegram router bot for αOS centres** with modular extension system.

The core bot is a simple URL router that fetches centre links from the local αOS Index Node and routes Telegram commands (`/game`, `/door`, `/voice`, etc.) to the appropriate URLs. Additional functionality can be added via extensions without modifying the core routing logic.

## Architecture

**Dumb Core:**
- Fetches centre list from Index API (`/api/centres`)
- Routes commands to centre URLs
- Handles `/start`, `/menu`, `/reload`, `/help`
- No business logic beyond routing

**Extension System:**
- Extensions live in `extensions/` directory
- Each extension is a Python module with an `Extension` subclass
- Extensions are loaded via `config.yaml`
- Extensions can register additional handlers, commands, or modify bot behavior
- Fail-soft: If an extension fails to load, the core router still works

## Why this exists

- Local web apps (`http://127.0.0.1`) are not reachable from outside the laptop
- The bot provides remote access to centre URLs (GAS links for remote, local links for on-laptop)
- `menu.yaml` (in αOS Index Node) remains the single source of truth for centre routes
- Part of the **Hub-and-Spoke** pattern: GAS Bot → Status Check → Router Bot (if online) → Local Centres

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your TELEGRAM_BOT_TOKEN
   ```

3. **Configure bot:**
   ```bash
   # Edit config.yaml to:
   # - Set Index API URL (default: http://100.76.197.55:8799)
   # - Enable/disable extensions
   # - Configure extension-specific settings
   ```

4. **Run the bot:**
   ```bash
   python router_bot.py
   ```

## routerctl (systemd user + heartbeat)

`routerctl` manages a systemd *user* unit for the router and optional heartbeat timers.

- Default `ROUTER_DIR` is the directory that contains `routerctl` (so it works from any CWD).
- `.env` must be a *file* (not a directory), otherwise the systemd unit will fail to load `EnvironmentFile`.
- If you already keep a shared env like `~/.env/aos.env`, `routerctl unit` will include it as an optional `EnvironmentFile` (recommended).
- `routerctl` reads all config from `~/.env/aos.env` (single source).

Common commands:
```bash
./routerctl unit
./routerctl edit-env
./routerctl enable
./routerctl restart
./routerctl status
./routerctl heartbeat install
```

Install into `PATH` (optional):
```bash
./routerctl install-cli
```

## Configuration

**Environment Variables:**
- `TELEGRAM_BOT_TOKEN` (required) - From @BotFather
- `ALLOWED_USER_ID` (optional) - Restrict bot to specific user
- `ROUTER_CONFIG` (optional) - Custom config.yaml path

**config.yaml Structure:**
```yaml
# Index API settings
index_api:
  base: http://100.76.197.55:8799  # Tailscale IP
  path: /api/centres
  cache_ttl: 60  # seconds

# Extensions to load
extensions:
  # - core4_actions  # Uncomment to enable

# Extension-specific config
# core4_actions:
#   tags:
#     fit: fitness
#     fue: fuel
```

## Commands

**Core Commands (always available):**
- `/start` - Initialize bot, show menu
- `/menu` - Show all available centres
- `/reload` - Refresh centre list from Index API
- `/help` - Show help message

**Dynamic Commands (from Index API):**
- `/voice`, `/door`, `/game`, `/frame`, `/freedom`, `/focus`, `/fire`, etc.
- Available commands depend on `menu.yaml` in the Index Node

**Extension Commands:**
- `/war` or `/warstack` - Start War Stack creation bot (DOOR Pillar - strategic weekly planning)
- Depends on loaded extensions (see `/help` for full list)

## Command Routing Cheatsheet

**How a command is resolved:**
1. **Core handler** (always): `/start`, `/menu`, `/reload`, `/help`, `/health`, `/commands`
2. **Extension handler** (if enabled in `config.yaml`): e.g. `/war`, `/facts`, `/fit`
3. **Dynamic router** (fallback): any other `/command` is looked up via Index API (`/api/centres`)

**Key rule:** if an extension is enabled, its commands are excluded from the dynamic router to avoid double replies or "Unknown command" responses.

**Enable extensions:**
```yaml
extensions:
  - door_flow
  - fruits_daily
  - core4_actions
```

**Example mapping:**
- `/war` (extension) -> Door Flow API or War Stack trigger
- `/voice` (dynamic) -> URL from Index Node `menu.yaml`

## Extensions

Extensions are optional modules that add functionality beyond URL routing.

**Available Extensions:**
- `door_flow` - Integrated War Stack flow via local Index Node Door API (/war, /warstack, answers in chat)
- `warstack_commands` - External War Stack bot trigger (/war, /warstack) via Telegram link
- `firemap_commands` - Local Fire Map trigger (/fire, /fireweek)
- `core4_actions` - Core4 Taskwarrior shortcuts (/fit, /fue, etc.), supports `/fit <text>` journal note via Index Node

**Door Flow vs. War Stack Trigger (choose one):**
- `door_flow` uses the local Index Node (`/api/door/warstack/*`) and runs the full War Stack Q&A inside this bot chat.
- `warstack_commands` only sends a link to a separate War Stack bot; no local API calls.

**Creating Extensions:**
See `extensions/base.py` for the Extension base class and `ARCHITECTURE.md` for details.

## Files

- `router_bot.py` - Bot entrypoint (wiring + startup)
- `router_app/` - Core implementation (settings/cache/handlers)
- `config.yaml` - Configuration file
- `extensions/` - Extension modules
  - `base.py` - Extension base class
  - `__init__.py` - Extension loader
- `.env` - Environment variables (create from `.env.example`)
- `requirements.txt` - Python dependencies
- `door/python-warstack/` - War Stack bot (referenced by warstack_commands when enabled)
- `game/python-firemap/` - Fire Map bot (referenced by firemap_commands)

## Docs

- `ARCHITECTURE.md` - Hub-and-Spoke pattern, design decisions
- `OPERATIONS.md` - Setup, troubleshooting, deployment
