# alphaos-router

**Dumb Telegram router bot for AlphaOS centres** with modular extension system.

The core bot is a simple URL router that fetches centre links from the local AlphaOS Index Node and routes Telegram commands (`/game`, `/door`, `/voice`, etc.) to the appropriate URLs. Additional functionality can be added via extensions without modifying the core routing logic.

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
- `menu.yaml` (in AlphaOS Index Node) remains the single source of truth for centre routes
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

## Extensions

Extensions are optional modules that add functionality beyond URL routing.

**Available Extensions:**
- `warstack_commands` - War Stack creation trigger (/war, /warstack) ✅ **Active**
- `core4_actions` - Core4 Taskwarrior shortcuts (/fit, /fue, etc.) ⚠️ **Available (disabled by default)**

**Creating Extensions:**
See `extensions/base.py` for the Extension base class and `ARCHITECTURE.md` for details.

## Files

- `router_bot.py` - Dumb core router
- `config.yaml` - Configuration file
- `extensions/` - Extension modules
  - `base.py` - Extension base class
  - `__init__.py` - Extension loader
- `.env` - Environment variables (create from `.env.example`)
- `requirements.txt` - Python dependencies

## Docs

- `ARCHITECTURE.md` - Hub-and-Spoke pattern, design decisions
- `OPERATIONS.md` - Setup, troubleshooting, deployment
