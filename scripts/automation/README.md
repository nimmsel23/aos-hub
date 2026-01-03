# Door Automation Scripts (DEPRECATED)

**Status:** ⚠️ DEPRECATED - Replaced by systemd services + Router Bot + Bridge

## Overview

These scripts implemented the old Door Centre automation pattern using file watchers and tag polling.

## Why Deprecated

**Old Pattern (these scripts):**
```
inotify watches ~/AlphaOS-Vault/Door/2-Plan/
    ↓
New War Stack file detected
    ↓
door_file_watcher.sh triggers war_stack_create.sh
    ↓
TickTick tag changes (#potential → #plan)
    ↓
ticktick_tag_watcher.py triggers door_lifecycle.sh
    ↓
Files moved between 1-Potential/ 2-Plan/ 3-Production/ 4-Profit/
```

**New Pattern (current system):**
```
User creates War Stack (Telegram/Web UI/CLI)
    ↓
Index Node API / GAS / War Stack Bot
    ↓
Bridge /bridge/task/execute
    ↓
Taskwarrior tasks created with UUIDs
    ↓
State tracked via Taskwarrior (not file location)
    ↓
systemd services handle sync/backup
```

**Key Improvements:**
1. **UUID-first:** Taskwarrior UUIDs are source of truth (not file paths)
2. **API-driven:** REST endpoints instead of file watchers
3. **Event-based:** systemd timers instead of polling
4. **Multi-interface:** Telegram/Web/CLI all use same backend

---

## Scripts

### door_file_watcher.sh

**Purpose:** inotify daemon watching `/Door/2-Plan/` for new War Stack files

**What it did:**
1. Monitor `~/AlphaOS-Vault/Door/2-Plan/` for file creation
2. Detect new War Stack markdown files
3. Trigger `war_stack_create.sh` automatically
4. Log to `~/.dotfiles/logs/door-automation.log`

**Configuration:**
```bash
export VAULT_PATH="$HOME/Dokumente/AlphaOs-Vault"
export WAR_STACK_CREATE="$HOME/.dotfiles/bin/war_stack_create.sh"
```

**Why deprecated:**
- File creation is now handled by API endpoints
- War Stacks are created via UI/Bot, not manual file drops
- systemd services handle automation (not inotify daemons)

**Replacement:**
```bash
# Old: File watcher triggers automation
door_file_watcher.sh &

# New: API endpoint handles creation
curl -X POST http://127.0.0.1:8799/api/door/export \
  -d '{"warstack_guid":"..."}'
```

---

### door_lifecycle.sh

**Purpose:** Handle 4P Flow state transitions (file moves)

**What it did:**
1. Receive transition signal: `door_lifecycle.sh POTENTIAL PLAN task_42 "My Door"`
2. Find markdown file in source directory
3. Move file to destination directory
4. Update file frontmatter with new state
5. Update Taskwarrior task tags

**State Transitions:**
- `POTENTIAL → PLAN` - Move `1-Potential/ → 2-Plan/`
- `PLAN → PRODUCTION` - Move `2-Plan/ → 3-Production/`
- `PRODUCTION → PROFIT` - Move `3-Production/ → 4-Profit/`

**Why deprecated:**
- File location no longer determines state
- Taskwarrior task status is source of truth
- markdown files stay in original location (UUID-linked)

**Replacement:**
```bash
# Old: Move files between directories
door_lifecycle.sh POTENTIAL PLAN task_42 "My Door"

# New: Update Taskwarrior task state
task 42 modify +plan -potential
# File stays in place, linked via UUID
```

---

## Migration Guide

If you were using these scripts:

**1. Stop watchers:**
```bash
# Kill any running watchers
pkill -f door_file_watcher
pkill -f ticktick_tag_watcher
```

**2. Remove systemd services (if any):**
```bash
systemctl --user stop door-watcher.service
systemctl --user disable door-watcher.service
```

**3. Use new workflow:**
```fish
# Create Hot List item
hot "My idea"

# Create War Stack (Telegram)
# /war in Telegram bot

# Or use Index Node UI
open http://127.0.0.1:8799/door
```

**4. Check current state:**
```bash
# Old: Check file location
ls ~/AlphaOS-Vault/Door/2-Plan/

# New: Check Taskwarrior
task project:HotList list
task +plan list
```

---

## Keep These Scripts?

**Reasons to keep:**
- Historical reference for old automation pattern
- Educational value (shows evolution of system)
- Could be useful for file-based workflows

**Reasons to remove:**
- Confusing to have deprecated automation
- Users might accidentally use old pattern
- Clutters repository

**Recommendation:** Archive to `scripts/automation/deprecated/` with clear warnings

---

## Related

- `systemd/` - Current automation via systemd services
- `router/extensions/door_flow.py` - Telegram Door flow
- `index-node/server.js` - Door Centre API
- `bridge/app.py` - Bridge task executor
- `DOOR_CENTRE.md` - Current Door Centre architecture
