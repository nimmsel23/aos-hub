# Architecture

## Overview

`alphaos-router` is a **dumb Telegram router bot** that routes commands to αOS centre URLs. It follows a **modular extension pattern** where the core is minimal (routing only) and additional functionality is provided by loadable extensions.

The bot is part of a larger **Hub-and-Spoke** architecture where a GAS (Google Apps Script) bot acts as the primary interface and delegates to the router bot when the laptop is online.

## Important: The Ecosystem

**This bot is ONE PART of a larger system:**

1. **GAS Projects** (Cloud, 24/7 - Original)
   - Voice Centre, Door Centre, Frame/Freedom/Focus/Fire Centres
   - Google Apps Script web apps
   - Always accessible (even when laptop offline)

2. **Index Node** (Local Node.js on 8799)
   - Serves HTML frontends (Door Centre, Game Centre, General's Tent)
   - Provides `/api/centres` endpoint for Router Bot
   - Reads `menu.yaml` (single source of truth for centre URLs)

3. **Router Bot** (This project - Python/Aiogram)
   - Routes Telegram commands to centre URLs
   - Fetches centre list from Index Node API
   - Extensions add commands (e.g., `/war` trigger)

4. **War Stack Bot** (Separate Python/Telegram bot)
   - Standalone conversation bot for War Stack creation
   - NOT part of Router Bot (Router just triggers it)

**Critical Distinction:**
- **menu.yaml** (Index Node) = Centre URLs (GAS + local web UIs)
- **config.yaml** (Router Bot) = Extension configs (NOT centre URLs)

## Hub-and-Spoke Pattern

```
User (Telegram)
    ↓
GAS Bot (always online, 24/7)
    ↓
Check: Status Bot (8080 via Tailscale)
    ↓
Laptop online?
    ├─ YES → Route to Router Bot (local, fast, full features)
    │         ├─ Dumb Core → Centre URL routing
    │         └─ Extensions → Core4 actions, War Stacks, etc.
    │
    └─ NO  → GAS Web Apps (fallback, slower, limited features)
             ├─ Voice Centre (GAS)
             ├─ Door Centre (GAS)
             ├─ Game Centre (GAS)
             └─ etc.
```

**Why this pattern?**
- **GAS Bot**: Always reachable from mobile, acts as smart router
- **Status Bot (8080)**: Quick health check via Tailscale
- **Router Bot**: Runs on laptop, provides full features (local API access, Taskwarrior, etc.)
- **GAS Web Apps**: Fallback when laptop is offline (read-only, limited functionality)

**Security Layer (Critical!):**

The Router Bot exists primarily as a **security boundary** between Telegram and your PC:

```
Telegram User → GAS Bot → Router Bot → Index Node/Services
                           ↑
                    Security Layer
```

**Why Router Bot is needed:**
1. **No Direct PC Access**: Telegram users never get direct access to your PC
2. **Controlled Interface**: Only Router Bot talks to Index Node (localhost)
3. **Command Filtering**: Router Bot validates and sanitizes all commands
4. **Extension Isolation**: Extensions run in controlled environment
5. **Fail-Safe**: If Router Bot is compromised, Index Node is still protected

**Without Router Bot:**
- ❌ GAS Bot would need direct PC access (security risk)
- ❌ Telegram commands could directly hit localhost services
- ❌ No validation layer between internet and local services

**With Router Bot:**
- ✅ GAS Bot only knows about Router Bot (via Tailscale)
- ✅ Router Bot validates all input before forwarding
- ✅ Local services (Index Node, Taskwarrior) are isolated
- ✅ Extensions can add functionality without exposing internals

### PC Access Paths

**There are exactly 3 ways to reach the PC:**

1. **Node → Aiogram → Web**
   ```
   Index Node (8799) → Router Bot (Aiogram) → Telegram
   ```
   - Index Node serves web UIs locally
   - Router Bot provides Telegram interface
   - User interacts via browser OR Telegram

2. **Node → Tailscale → Web**
   ```
   Index Node (8799) → Tailscale IP (100.76.197.55) → Remote browser
   ```
   - Index Node accessible via Tailscale VPN
   - Direct web access from remote devices
   - No Router Bot needed for web UIs

3. **Termux SSH**
   ```
   Phone (Termux) → SSH → PC
   ```
   - Direct SSH access from Android
   - Full shell access
   - Bypass all other layers (emergency access)

**Normal Flow (For Telegram Users):**
```
User (mobile) → GAS Bot → Router Bot (via Tailscale) → Index Node (localhost) → Services
```

**Web UI Flow (For Browser Users):**
```
User (laptop) → http://localhost:8799 → Index Node → Web UI
User (remote) → http://100.76.197.55:8799 → Index Node → Web UI (via Tailscale)
```

**Emergency Access:**
```
User (phone) → Termux → SSH → Direct shell access
```

## Data Flow

### 1. Centre URL Resolution (Dynamic Commands from Index)

```
User sends /game
    ↓
Router Bot receives command
    ↓
Fetch from Index Cache (TTL-based)
    ├─ Cache fresh? → Return cached centres
    └─ Cache stale? → Fetch from Index API (http://100.76.197.55:8799/api/centres)
         ↓
Index Node reads menu.yaml
    ↓
Returns centres list [{cmd, label, url}, ...]
    ↓
Router Bot caches and returns URL to user
         ↓
User clicks link
    ├─ GAS URL → Opens cloud web app (e.g., Voice Centre)
    └─ Local URL → Opens Index Node UI (e.g., /door → Door Centre)
```

**Example menu.yaml entry:**
```json
{"cmd": "voice", "label": "Voice Centre", "url": "https://script.google.com/GAS_URL"}
{"cmd": "door", "label": "Door Centre", "url": "/door"}  // Local Index Node
{"cmd": "tent", "label": "General's Tent", "url": "/game/tent"}  // Local
```

### 2. Extension Command Handling (Router's Own Commands)

```
User sends /war (War Stack extension command)
    ↓
Router Bot dispatcher routes to WarStack extension
    ↓
WarStack extension sends response:
    "Click to start War Stack Bot" → Button with link to @WarStackBot
    ↓
User clicks → Opens SEPARATE War Stack Bot
    ↓
War Stack Bot conversation flow (standalone service)
```

**Key Difference:**
- Dynamic commands (/voice, /door) → URLs from menu.yaml
- Extension commands (/war) → Logic in extension, NOT in menu.yaml

### 3. War Stack Creation - 3 Interfaces

```
User wants to create War Stack:

Option 1: Telegram (War Stack Bot)
    /war in Router Bot → Link to War Stack Bot → Interactive conversation

Option 2: Web UI (Index Node - Local)
    Open http://localhost:8799/door → War Stack form

Option 3: Web UI (GAS - Remote fallback)
    Open GAS Door Centre → War Stack form
```

**All 3 create the same output:**
- Markdown file in ~/AlphaOS-Vault/Weekly/
- Taskwarrior commands

## Components

### Core Router (`router_bot.py` + `router_app/`)

**Responsibilities:**
- Fetch centre list from Index API
- Cache centres (configurable TTL)
- Route `/start`, `/menu`, `/reload`, `/help` commands
- Route dynamic commands (e.g., `/voice`, `/door`) to centre URLs
- Load and manage extensions

**Does NOT:**
- Execute business logic (Taskwarrior, git, etc.)
- Store state beyond cache
- Modify centre URLs (menu.yaml is SSOT)

### Extension System (`extensions/`)

**Design:**
- Abstract base class `Extension` (`extensions/base.py`)
- Extension loader with fail-soft behavior (`extensions/__init__.py`)
- Extensions register handlers during `setup()`
- Extensions can access bot, dispatcher, and config

**Built-in Extensions:**
- `warstack_commands` - War Stack creation trigger (DOOR Pillar) ✅ **Default**
- `core4_actions` - Taskwarrior shortcuts for Core4 domains (optional, disabled by default)
- *(more to come)*

### Index API (αOS Index Node)

**Endpoint:** `http://100.76.197.55:8799/api/centres`

**Response Format:**
```json
{
  "updated_at": "2025-12-25T10:30:00.000Z",
  "centres": [
    {"cmd": "game", "label": "Game Centre", "url": "/game"},
    {"cmd": "door", "label": "Door Centre", "url": "/door"},
    {"cmd": "tent", "label": "General's Tent", "url": "/game/tent"},
    {"cmd": "voice", "label": "Voice Centre", "url": "https://script.google.com/GAS_VOICE"}
  ]
}
```

**SSOT:** `menu.yaml` in the Index Node

**What this API provides:**
- Centre URLs (mix of local `/door` and remote GAS URLs)
- Commands for dynamic routing (/voice, /door, /tent, etc.)

**What this API does NOT provide:**
- Router Bot extension commands (/war, /fit)
- Router Bot core commands (/start, /menu)

**Index Node serves TWO purposes:**
1. **Web UI** - HTML frontends for Door/Game/Tent centres (local browser)
2. **API** - Centre list for Router Bot (Telegram)

### Configuration (`config.yaml`)

**Purpose:** Router Bot extensions and settings (NOT centre URLs)

**Structure:**
```yaml
index_api:
  base: http://100.76.197.55:8799  # Tailscale IP
  path: /api/centres
  cache_ttl: 60

extensions:
  - warstack_commands  # Load War Stack trigger extension

warstack_commands:
  bot_username: "@WarStackBot"  # Separate Telegram bot
  fallback_url: "https://t.me/WarStackBot"
```

**What config.yaml defines:**
- ✅ Which extensions to load
- ✅ Extension-specific configs (bot usernames, tags, etc.)
- ✅ Index API connection settings

**What config.yaml does NOT define:**
- ❌ Centre URLs (those are in menu.yaml on Index Node)
- ❌ Dynamic commands (/voice, /door) - those come from Index API

## Design Principles

### 1. Single Responsibility
- **Router Bot Core** = URL routing only (dynamic commands from Index API)
- **Router Bot Extensions** = Additional commands (/war, /fit) - NOT in Index
- **Index Node** = Centre registry (SSOT for URLs) + Web UI server
- **War Stack Bot** = Standalone War Stack creation (separate service)

### 2. Configuration Separation
- **menu.yaml** (Index Node) = Centre URLs for Web UI + Router Bot API
- **config.yaml** (Router Bot) = Extension configs, NOT centre URLs
- These files serve DIFFERENT purposes, don't confuse them!

### 3. Fail-Soft
- If Index API is down, cache serves stale data
- If extension fails to load, core routing still works
- If extension crashes, other extensions continue

### 4. Configuration Over Code
- Extensions enabled/disabled via `config.yaml`
- Centre URLs defined in `menu.yaml` (Index Node)
- No hardcoded URLs in bot code

### 5. Modular Extensions
- Extensions are independent Python modules
- Extensions don't know about each other
- Extensions can be added/removed without touching core
- Extensions add NEW commands, don't override Index commands

### 6. Local + Remote Hybrid
- Local URLs (`/door`, `/game`) for on-laptop use (Index Node serves HTML)
- GAS URLs (public) for remote access when offline
- Status check determines routing in Hub-and-Spoke

## Command Sources (Critical Understanding)

**Three types of commands in Router Bot:**

### Type 1: Core Commands (Core handlers in router code)
- `/start` - Initialize bot
- `/menu` - Show all centres
- `/reload` - Refresh centre list
- `/help` - Show help

**Source:** `router_app/handlers/core.py` (wired by `router_bot.py`)
**Purpose:** Bot management

### Type 2: Dynamic Commands (From Index API)
- `/voice`, `/door`, `/game`, `/tent`, `/frame`, `/fire`, etc.
- Fetched from Index Node API (`/api/centres`)
- Defined in `menu.yaml` (Index Node)

**Source:** `menu.yaml` (Index Node) → Index API → Router Bot
**Purpose:** Route to centres (GAS or local)

**Example flow:**
```
User: /door
Router: Checks Index API
Index API: Returns {"cmd": "door", "url": "/door"}
Router: Sends user link to /door (local Index Node UI)
```

### Type 3: Extension Commands (From Extensions)
- `/war`, `/warstack` - War Stack trigger
- `/fit`, `/fue`, `/med` - Core4 shortcuts (disabled by default)

**Source:** `config.yaml` extensions
**Purpose:** Additional functionality (NOT centres)

**Example flow:**
```
User: /war
Router: WarStack extension handles it
Extension: Sends button "Start War Stack Bot" → Link to @WarStackBot
User clicks → Opens SEPARATE Telegram bot
```

**Key Insight:**
Extension commands like `/war` do NOT appear in menu.yaml!
They are added by the Router Bot itself via extensions.

## Extension API

**Creating a new extension:**

1. Create `extensions/my_extension.py`
2. Subclass `Extension` from `extensions/base.py`
3. Implement `setup()` to register handlers
4. (Optional) Implement `teardown()` for cleanup
5. Add to `config.yaml`:
   ```yaml
   extensions:
     - my_extension
   my_extension:
     # extension config here
   ```

**Example:**
```python
from aiogram.filters import Command
from aiogram.types import Message
from .base import Extension

class MyExtension(Extension):
    async def setup(self):
        @self.dp.message(Command("hello"))
        async def hello(m: Message):
            await m.answer("Hello from extension!")
```

## Security

- **User Restriction**: Set `ALLOWED_USER_ID` to restrict bot access
- **Local Network**: Index API accessible only via Tailscale
- **No Secrets in Config**: Bot token in `.env`, not in `config.yaml`

## Performance

- **Cache**: TTL-based cache reduces Index API calls
- **Async**: All I/O operations are async (aiohttp, aiogram)
- **Fail-Fast**: Extensions load in parallel (future optimization)

## Future Enhancements

1. **Smart URL Resolution**: Detect remote vs local context, return appropriate URL
2. **GAS Integration**: Router Bot → GAS Bot communication for seamless handoff
3. **Extension Dependencies**: Allow extensions to depend on each other
4. **Hot Reload**: Reload extensions without restarting bot
5. **Metrics**: Track command usage, extension performance

## War Stack Creation - 3 Separate Interfaces

**Important:** There are THREE ways to create a War Stack, all independent:

### 1. War Stack Bot (Telegram - Standalone)
- **Location:** `python-warstack/warstack_bot.py`
- **Type:** Separate Python/Telegram bot (NOT part of Router Bot)
- **Trigger:** Router Bot `/war` command (just sends a link)
- **Interface:** Interactive conversation (22 states, full Q&A)
- **Output:** Markdown + Taskwarrior commands

**How Router Bot interacts:**
```python
# Router Bot Extension just sends a trigger:
@dp.message(Command("war"))
async def war_command(m: Message):
    await m.answer(
        "Click to start War Stack Bot",
        reply_markup=button_to_warstack_bot
    )
```

### 2. Door Centre (Index Node - Local Web UI)
- **Location:** `http://localhost:8799/door`
- **Type:** HTML form served by Index Node
- **Trigger:** `/door` command → Opens web UI
- **Interface:** Web form (fill all fields, submit)
- **Output:** Same as Telegram bot

### 3. Door Centre (GAS - Remote Fallback)
- **Location:** `https://script.google.com/GAS_DOOR_CENTRE`
- **Type:** Google Apps Script web app
- **Trigger:** When laptop offline, GAS bot routes here
- **Interface:** Web form (same structure as local)
- **Output:** Same as others

**All three create:**
- War Stack markdown in `~/AlphaOS-Vault/Weekly/`
- Taskwarrior commands (ready to execute)

**Key Point:**
Router Bot's `/war` command does NOT create War Stacks!
It only TRIGGERS the War Stack Bot (separate service).

## Related Systems

- **αOS Index Node** (`alphaos-index-node/`) - Local centre registry + web UI server
- **GAS Centres** - Cloud-based web apps for Voice, Door, Game, etc. (fallback)
- **Status Bot (8080)** - Laptop online/offline health check (Hub-and-Spoke)
- **War Stack Bot** - Dedicated Telegram bot for War Stack creation (standalone, 1200 lines)

---

**Version:** 2.0 (Dumb Core + Extensions)
**Last Updated:** 2025-12-25
