# aos-hub Agent Registry

**Last Updated:** 2026-01-15
**Total Agents:** 11 (11 Active, 0 Planned)
**Repository:** aos-hub - AlphaOS Hub & Spoke Infrastructure

---

## Overview

The aos-hub agent system provides specialized agents for developing, maintaining, and operating the complete AlphaOS Hub-and-Spoke architecture. This is a multi-layer system spanning:

1. **LAYER 1: LOCAL PC** - index-node (8799), bridge (8080), router bot, python bots
2. **LAYER 2: CLOUD (GAS)** - Google Apps Script fallback centres
3. **LAYER 3: DATA LAYER** - AlphaOS-Vault (rclone + systemd sync)
4. **LAYER 4: NOTIFICATION** - Telegram (multi-bot ecosystem)

Each Centre Agent understands BOTH index-node (Node.js) and gas (Apps Script) implementations, plus associated bots, data structures, and deployment workflows.

---

## Agent Categories

### TIER 1: CENTRE AGENTS (7 agents)
Specialists for each AlphaOS Centre. Develop web UIs, debug bots, implement features across all interfaces.

### TIER 2: INFRASTRUCTURE AGENTS (3 agents)
Specialists for infrastructure services (router, bridge, sync).

### TIER 3: META-ORCHESTRATOR (1 agent)
Coordinator of all centres and services.

---

## TIER 1: CENTRE AGENTS

### 1. door-centre-agent ⭐ CRITICAL

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** CRITICAL
**Category:** centre

**Purpose:** Door Centre development + operations (4P Flow: Potential→Plan→Production→Profit)

**Description:**
Complete specialist for Door Centre ecosystem. Understands index-node, gas, python-warstack, and router extensions. Facilitates weekly tactical flow from idea capture (Hot List) to execution completion (Profit).

**Components:**
- **index-node:** `/api/door/*`, `public/door/`
- **gas:** `door.gs`, `door_main.gs`, `door_profit.gs`, `door_warstack.gs`, `Door_*.html`
- **Bots:** `python-warstack/warstack_bot.py`, `router/extensions/door_flow.py`
- **Data:** `~/AlphaOS-Vault/Door/` (1-Potential, 2-Plan, War-Stacks, 3-Production, 4-Profit)

**Triggers:**
- "Door Centre"
- "War Stack"
- "Hot List"
- "Door War"
- "4P Flow"
- "Potential/Plan/Production/Profit"
- "Domino Door"

**Capabilities:**
- Develop Door Centre web UI (index-node + gas)
- Create/debug War Stack flows (all 3 interfaces: Telegram, web, GAS)
- Build Hot List capture interfaces
- Implement Door War selection logic
- Develop Hit List execution tracking
- Debug python-warstack (idle timeout, /resume flow)
- Export markdown to vault (all 4P phases)
- Integrate Taskwarrior for Hit creation

**Config:** `.agents/configs/door-centre-agent.json`
**Prompt:** `.agents/prompts/door-centre-agent.md` (23KB - comprehensive)

**Notes:**
- War Stack has 3 independent interfaces (python bot, web UI, GAS)
- python-warstack: idle timeout 900s, /resume via bridge drafts
- 4P Flow: Potential (capture) → Plan (select) → Production (execute) → Profit (reflect)

---

### 2. game-centre-agent ⭐ CRITICAL

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** CRITICAL
**Category:** centre

**Purpose:** Game Centre development + operations (Strategic Maps: Frame→IPW→Freedom→Focus→Fire)

**Description:**
Complete specialist for Game Centre ecosystem. Manages strategic navigation through Map hierarchy. Understands cascade principle (Frame change affects all downstream Maps).

**Components:**
- **index-node:** `/api/game/*`, `public/game/fire.html`, `public/game/tent.html`
- **gas:** `game_main.gs`, `game_fire.gs`, `game_focus.gs`, `game_frame.gs`, `game_freedom.gs`, `game_tent.gs`, `game_shared.gs`, `Game_*.html`
- **Bots:** `python-firemap/firemap_bot.py`, `router/extensions/firemap_commands.py`
- **Data:** `~/AlphaOS-Vault/Game/` (Frame, IPW, Freedom, Focus, Fire), `~/AlphaOS-Vault/Alpha_Tent/`

**Triggers:**
- "Game Centre"
- "Frame Map"
- "Fire Map"
- "Freedom Map"
- "Focus Map"
- "Strategic Maps"
- "General's Tent"
- "IPW"
- "Map cascade"
- "Where am I now"

**Capabilities:**
- Develop Map interfaces (Frame/Freedom/Focus/Fire)
- Implement cascade logic (Frame change → update downstream)
- Fire Map integration (4 War Stacks × 4 Hits = 16 weekly Hits)
- Debug python-firemap (daily/weekly/listen modes)
- Build General's Tent weekly review tools
- Export Maps to vault markdown
- Integrate Taskwarrior → Fire Map snapshot pipeline

**Config:** `.agents/configs/game-centre-agent.json`
**Prompt:** `.agents/prompts/game-centre-agent.md` (3.5KB)

**Notes:**
- Maps Hierarchy: Frame → IPW → Freedom → Focus → Fire → Daily Game
- Cascade Principle: Frame determines all downstream Maps
- Fire Map = 4 War Stacks × 4 Hits each = 16 weekly Hits
- python-firemap: 3 modes (daily, weekly, listen)

---

### 3. voice-centre-agent

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** HIGH
**Category:** centre

**Purpose:** Voice Centre development (STOP→SUBMIT→STRUGGLE→STRIKE sessions)

**Description:**
Specialist for Voice Centre (AlphaOS PILLAR #3: THE VOICE - Mental Mastery). Develops session interfaces for pattern interruption and narrative rewriting.

**Components:**
- **index-node:** `/api/voice/*`, `public/voice/index.html`
- **gas:** `voice.gs`, `voice_*.html`, `voicecentre.html`
- **Data:** `~/AlphaOS-Vault/VOICE/`

**Triggers:**
- "Voice Centre"
- "Voice session"
- "STOP SUBMIT STRUGGLE STRIKE"
- "Mental Mastery"
- "Pattern interruption"

**Capabilities:**
- Develop Voice session interface (4-step process)
- Implement autosave for in-progress sessions
- Build session history/archive viewer
- Export sessions to vault markdown
- Create chapter/phase navigation

**Config:** `.agents/configs/voice-centre-agent.json`
**Prompt:** `.agents/prompts/voice-centre-agent.md` (1KB)

---

### 4. core4-centre-agent ⭐ CRITICAL

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** CRITICAL
**Category:** centre

**Purpose:** Core4 Centre development (28-or-Die tracking, Taskwarrior↔TickTick integration)

**Description:**
Complete specialist for Core4 Centre (AlphaOS PILLAR #2: THE CORE). Manages 28-or-Die daily tracking, Taskwarrior↔TickTick sync, Core4 TTY utility, and future Journaling Modules per habit.

**Components:**
- **index-node:** `/api/python-core4/*`, `core4-tty.js`
- **gas:** `core4.gs`, `Core4_Index.html`
- **bridge:** `/bridge/python-core4/log`, `/bridge/python-core4/today`, `/bridge/python-core4/week`
- **Bots:** `router/extensions/core4_actions.py` (disabled by default)
- **Data:** `~/AlphaOS-Vault/Alpha_Core4/`, `~/.local/share/alphaos/task_export.json`, `~/.local/share/alphaos/task_sync_map.json`

**Triggers:**
- "Core4"
- "28-or-Die"
- "Core4 tracker"
- "Taskwarrior sync"
- "TickTick"
- "Daily habits"

**Capabilities:**
- Develop Core4 tracking UI (28-or-Die daily completion)
- Implement Taskwarrior↔TickTick sync (UUID bridge)
- Build Core4 TTY utility enhancements
- Create weekly Core4 JSON exports
- Debug bridge Core4 endpoints
- Plan future Journaling Modules per habit

**Config:** `.agents/configs/core4-centre-agent.json`
**Prompt:** `.agents/prompts/core4-centre-agent.md` (1.5KB)

**Notes:**
- 28-or-Die = 7 subtasks × 4 domains = 28 daily checkboxes
- UUID bridge: task_sync_map.json for Taskwarrior↔TickTick
- Future: Journaling Module per habit (not yet implemented)

---

### 5. fruits-centre-agent

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** MEDIUM
**Category:** centre

**Purpose:** Fruits/Facts Centre development (Daily questions + answers)

**Description:**
Specialist for Fruits Centre (daily knowledge capture). Manages both gas single project and fruits-standalone (codex deployed).

**Components:**
- **index-node:** `/api/fruits/*`, `public/facts.html`, `data/fruits_questions.json`
- **gas:** `fruits.gs` (single) + `fruits-standalone/` (codex deployed)
- **bridge:** `/bridge/fruits/answer`
- **Bots:** `router/extensions/fruits_daily.py`
- **Data:** `~/AlphaOS-Vault/Game/Fruits/` (fruits_store.json, *.md)

**Triggers:**
- "Fruits Centre"
- "Daily Facts"
- "Fruits questions"

**Capabilities:**
- Develop Fruits UI (index-node + gas single + standalone)
- Manage question rotation (daily unanswered questions)
- Implement answer capture + storage (fruits_store.json)
- Export answers to markdown
- Debug fruits-standalone (codex deployed)

**Config:** `.agents/configs/fruits-centre-agent.json`
**Prompt:** `.agents/prompts/fruits-centre-agent.md` (1.4KB)

**Notes:**
- 2 implementations: single project + fruits-standalone (codex deployed)
- fruits-standalone: appsscript.json (no .clasp.json yet)

---

### 6. tent-centre-agent

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** HIGH
**Category:** centre

**Purpose:** General's Tent Centre development (Weekly review, summaries)

**Description:**
Specialist for General's Tent (weekly review centre). Consolidates all 4 domains for strategic weekly reflection. Currently in development.

**Components:**
- **index-node:** `public/game/tent.html` (in development)
- **gas:** `game_tent.gs`, `tent_weekly_review.gs`, `Game_Tent_Index.html`
- **bridge:** `/bridge/tent/summary`
- **Data:** `~/AlphaOS-Vault/Alpha_Tent/`, `~/AlphaOS-Vault/Alpha_Core4/`

**Triggers:**
- "General's Tent"
- "Tent Centre"
- "Weekly review"
- "Weekly summary"

**Capabilities:**
- Develop General's Tent UI (index-node + gas)
- Build weekly review flow (consolidate all domains)
- Implement summary export to vault
- Integrate Core4 + Game Maps + Door War Stacks
- Create standalone deployment (future - like fruits-standalone)

**Config:** `.agents/configs/tent-centre-agent.json`
**Prompt:** `.agents/prompts/tent-centre-agent.md` (1.3KB)

**Notes:**
- General's Tent = weekly review consolidating all 4 domains
- Currently in development (needs enhancement before standalone)
- Future: tent-standalone/ with clasp deployment

---

### 7. creatorking-centre-agent ⚠️ SEPARATE DIMENSION

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** MEDIUM
**Category:** centre

**Purpose:** CreatorKing Centre (OUTSIDE AlphaOS - Creator King Assets Map)

**Description:**
Specialist for CreatorKing Centre - SEPARATE DIMENSION outside AlphaOS. Manages daily Creator King Assets Map via standalone GAS app with own Telegram bot (polling), daily 08:00 questions, 20:00 Gemini insights.

**Components:**
- **index-node:** Link only (not integrated)
- **gas:** `creatorking-standalone/` (clasp deployed): Code.js, client.html, .clasp.json
- **Bot:** Own Telegram bot (polling mode)
- **Data:** Drive AlphaOS/Centres/Alpha_CreatorKing/creatorking_store.json

**Triggers:**
- "CreatorKing"
- "Creator King Centre"
- "CKA"
- "Creator assets"

**Capabilities:**
- Develop CreatorKing standalone app
- Debug Telegram bot (polling mode, daily triggers)
- Implement question rotation + answer capture
- Build Gemini AI analysis integration (20:00 insights)
- Deploy via clasp

**Config:** `.agents/configs/creatorking-centre-agent.json`
**Prompt:** `.agents/prompts/creatorking-centre-agent.md` (1.5KB)

**Notes:**
- ⚠️ SEPARATE DIMENSION - NOT part of AlphaOS proper
- Own Telegram bot with polling (not webhook)
- Script Properties: TELEGRAM_BOT_TOKEN, TG_DEFAULT_CHAT_ID, GEMINI_API_KEY
- Daily flow: 08:00 question → user replies → 20:00 Gemini insights
- Storage: Drive creatorking_store.json (NOT AlphaOS-Vault)

---

## TIER 2: INFRASTRUCTURE AGENTS

### 8. alphaos-router-system-agent

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** HIGH
**Category:** infrastructure

**Purpose:** Router Bot operations (router_bot.py + extensions)

**Description:**
Specialist for Telegram router bot (aiogram) + extension system. Manages routerctl, systemd services, heartbeat timers, extension loading, command routing to centres.

**Components:**
- **router:** `router_bot.py`, `extensions/*.py`, `config.yaml`, `routerctl`, `.env`
- **systemd:** `alphaos-router.service`, `alphaos-heartbeat.timer`

**Triggers:**
- "Router bot"
- "Telegram router"
- "routerctl"
- "Extension system"
- "Bot not responding"

**Capabilities:**
- Debug router bot issues
- Create new extensions (inherit from extensions/base.py)
- Manage systemd services (routerctl)
- Configure heartbeat timer
- Debug command routing (Index API integration)

**Config:** `.agents/configs/alphaos-router-system-agent.json`
**Prompt:** `.agents/prompts/alphaos-router-system-agent.md` (1.3KB)

**Notes:**
- Router is dispatcher only (doesn't create War Stacks itself)
- Extensions: door_flow, fruits_daily, firemap_commands, core4_actions
- Fetches centre URLs from Index API /api/centres (menu.yaml source)

---

### 9. alphaos-bridge-agent

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** HIGH
**Category:** infrastructure

**Purpose:** Bridge service operations (bridge/app.py, Port 8080)

**Description:**
Specialist for aiohttp bridge service. Manages Tailscale↔GAS connection, Core4/Fruits/Tent/Task/WarStack endpoints, queue management, sync operations.

**Components:**
- **bridge:** `app.py`, `bridgectl`, `selftest.py`, `.env`
- **Endpoints:** `/health`, `/bridge/python-core4/*`, `/bridge/fruits/answer`, `/bridge/tent/summary`, `/bridge/task/*`, `/bridge/warstack/draft`, `/bridge/queue/flush`, `/bridge/sync/*`
- **systemd:** `aos-bridge.service`

**Triggers:**
- "Bridge not working"
- "Bridge 8080"
- "Tailscale connection"
- "Bridge sync"
- "Bridge queue"

**Capabilities:**
- Debug bridge endpoints (400 errors, invalid payloads)
- Handle queue flush operations
- Manage Tailscale↔GAS connection
- Implement new bridge endpoints
- Run selftest when port unavailable

**Config:** `.agents/configs/alphaos-bridge-agent.json`
**Prompt:** `.agents/prompts/alphaos-bridge-agent.md` (1.2KB)

**Notes:**
- Non-throwing handlers (never crash on bad input)
- bridgectl: health, flush, debug, tailscale commands
- Tailscale enables remote GAS access to bridge

---

### 10. alphaos-sync-orchestrator

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** HIGH
**Category:** infrastructure

**Purpose:** Wurmloch management (rclone + systemd sync between local and cloud)

**Description:**
Specialist for rclone + systemd vault sync. Manages bidirectional sync between ~/AlphaOS-Vault (local) and GDrive (cloud). Handles pull/push/bisync modes.

**Components:**
- **scripts:** `index-node/scripts/vault-sync.sh` (pull, push, bisync)
- **systemd:** `alphaos-vault-sync-pull.timer/service`, `alphaos-vault-sync-push.timer/service`
- **rclone:** mount, config (remote: gdrive)

**Triggers:**
- "Vault sync"
- "rclone"
- "Sync not working"
- "GDrive mount"
- "systemd vault sync"

**Capabilities:**
- Debug rclone sync issues
- Manage systemd timers (pull/push schedules)
- Handle mount operations
- Implement bisync (bidirectional)
- Resolve sync conflicts

**Config:** `.agents/configs/alphaos-sync-orchestrator.json`
**Prompt:** `.agents/prompts/alphaos-sync-orchestrator.md` (1.2KB)

**Notes:**
- vault-sync.sh modes: pull (cloud→local), push (local→cloud), bisync (bidirectional)
- Daily timers: pull (morning), push (evening)
- GAS writes to Drive, rclone syncs to local vault

---

## TIER 3: META-ORCHESTRATOR

### 11. alphaos-hub-orchestrator ⭐ CRITICAL

**Version:** 1.0.0
**Status:** ✅ Active
**Priority:** CRITICAL
**Category:** meta

**Purpose:** Overall aos-hub coordination (menu.yaml, server health, cross-centre routing, clasp deployments)

**Description:**
Meta-orchestrator for complete aos-hub ecosystem. Coordinates all centres, manages menu.yaml (Single Source of Truth), monitors service health, handles clasp deployments, ensures API contracts. The general that coordinates all specialists.

**Components:**
- **All:** index-node/, gas/, router/, bridge/, python-*-bot/, systemd/, scripts/
- **Config:** menu.yaml (Single Source of Truth), config.yaml, .env files, appsscript.json, .clasp.json

**Triggers:**
- "aos-hub not working"
- "menu.yaml"
- "Centre routing"
- "Server health"
- "clasp deployment"
- "Hub architecture"
- "Cross-centre issue"

**Capabilities:**
- Coordinate all centre agents
- Manage menu.yaml (centre route registry)
- Monitor service health (index-node, bridge, router, bots)
- Debug cross-centre data flow
- Handle clasp deployments (standalone apps)
- Ensure API contracts between components
- Run aos-doctor health checks

**Config:** `.agents/configs/alphaos-hub-orchestrator.json`
**Prompt:** `.agents/prompts/alphaos-hub-orchestrator.md` (1.5KB)

**Dependencies:**
- All centre agents
- All infrastructure agents

**Notes:**
- Meta-orchestrator delegates to specialist agents
- menu.yaml is Single Source of Truth (never hardcode URLs)
- aos-doctor provides unified health report
- clasp for standalone deployments (fruits, creatorking, future: door, tent)
- Understands complete Hub-and-Spoke architecture (4 layers)

---

## Statistics

**By Category:**
- Centre Agents: 7
- Infrastructure Agents: 3
- Meta Agents: 1

**By Priority:**
- CRITICAL: 4 (door, game, core4, hub-orchestrator)
- HIGH: 4 (voice, tent, router, bridge)
- MEDIUM: 3 (fruits, creatorking, sync)

**By Status:**
- Active: 11
- Planned: 0
- Deprecated: 0

---

## Agent Invocation Pattern

Agents are invoked automatically based on trigger keywords. When user mentions:

- **"War Stack"** → door-centre-agent
- **"Frame Map"** → game-centre-agent
- **"Voice session"** → voice-centre-agent
- **"Core4 tracker"** → core4-centre-agent
- **"Fruits questions"** → fruits-centre-agent
- **"General's Tent"** → tent-centre-agent
- **"CreatorKing"** → creatorking-centre-agent
- **"Router bot"** → alphaos-router-system-agent
- **"Bridge not working"** → alphaos-bridge-agent
- **"Vault sync"** → alphaos-sync-orchestrator
- **"aos-hub health"** → alphaos-hub-orchestrator

---

## Agent Dependencies

```
alphaos-hub-orchestrator (meta)
  ├─ Coordinates all agents
  │
  ├─ CENTRE AGENTS (7)
  │   ├─ door-centre-agent
  │   │   └─ Depends on: alphaos-bridge-agent (warstack draft)
  │   ├─ game-centre-agent
  │   │   └─ Depends on: door-centre-agent (War Stacks → Fire Map)
  │   ├─ voice-centre-agent
  │   ├─ core4-centre-agent
  │   ├─ fruits-centre-agent
  │   ├─ tent-centre-agent
  │   │   └─ Depends on: core4, game, door (weekly review data)
  │   └─ creatorking-centre-agent (standalone, no dependencies)
  │
  └─ INFRASTRUCTURE AGENTS (3)
      ├─ alphaos-router-system-agent
      ├─ alphaos-bridge-agent
      └─ alphaos-sync-orchestrator
```

---

## Development Workflow

### Creating New Agents

1. Copy `.agents/templates/agent-config-template.json`
2. Fill in all fields (name, purpose, components, triggers, etc.)
3. Copy `.agents/templates/system-prompt-template.md`
4. Write comprehensive system prompt
5. Save config to `.agents/configs/[agent-name].json`
6. Save prompt to `.agents/prompts/[agent-name].md`
7. Update this AGENTS.md registry
8. Test agent with test prompts from config

### Updating Existing Agents

1. Read current config: `.agents/configs/[agent-name].json`
2. Update config (increment version, update timestamp)
3. Update prompt if needed: `.agents/prompts/[agent-name].md`
4. Update this AGENTS.md registry
5. Document changes in agent notes

### Deleting Agents

1. Remove config: `.agents/configs/[agent-name].json`
2. Remove prompt: `.agents/prompts/[agent-name].md`
3. Update this AGENTS.md registry (remove entry, update statistics)
4. Check for dependencies (warn if other agents depend on it)

---

## Key Principles

1. **Centre agents** understand BOTH index-node + gas implementations
2. **menu.yaml** is Single Source of Truth for centre routes
3. **Non-throwing handlers** in bridge (never crash on bad input)
4. **Component AGENTS.md** files provide detailed guidelines (read before editing)
5. **clasp** is used for standalone GAS deployments
6. **Wurmloch** (rclone + systemd) bridges local vault ↔ cloud storage
7. **Hub-and-Spoke** architecture: Index Node (hub), Centres (spokes), Router (bridge)

---

## Version History

- **1.0.0** (2026-01-15): Initial agent system creation
  - Created 11 agents (7 centre, 3 infrastructure, 1 meta)
  - Established templates, configs, prompts, registry
  - Ready for production use

---

**Maintained by:** agent-orchestrator (meta-agent)
**Location:** `/home/alpha/aos-hub/.agents/`
**Last Registry Update:** 2026-01-15
