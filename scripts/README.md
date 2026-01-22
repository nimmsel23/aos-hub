# AlphaOS Scripts Collection

**Location:** `aos-hub/scripts/`

Collection of utility scripts for AlphaOS Door Centre, Core4, and TickTick integration.

---

## Directory Structure

```
scripts/
├── hot-list/          # Hot List markdown creation (DEPRECATED)
├── taskwarrior/       # Taskwarrior hooks + snapshots (ACTIVE)
├── war-stack/         # War Stack CLI automation (ACTIVE)
├── ticktick/          # TickTick API integration (ACTIVE)
├── automation/        # File watchers & lifecycle (DEPRECATED)
└── README.md          # This file
```

---

## Active Scripts

### nodectl ✅

**Purpose:** Index Node operator (status, health, open, autoreload, dev helpers)

**Notes:**
- `+nodectl` is a convenience symlink to `aos-hub/scripts/nodectl`
- `nodectl dev` runs in the foreground (Ctrl+C to stop)
- `nodectl` or `nodectl all` prints a full summary (monitor + doctor)

**Use Cases:**
- Monitor Index Node service + logs
- Start/stop/restart UI node
- Open local/Tailscale UI quickly
- Toggle autoreload watchers (menu/public)
- Run foreground dev (nodemon) outside systemd

**Examples:**
```bash
nodectl                 # full status + doctor summary
nodectl monitor         # service + logs + health + tailscale
nodectl dev             # foreground npm run dev (no systemd)
nodectl autoreload on   # enable menu/public watchers
nodectl fix             # kill port 8799 + restart service
nodectl open            # open best URL (tailscale preferred)
```

### taskwarrior/ ✅

**Purpose:** Local Taskwarrior integration glue (hooks + export snapshots)

**Scripts:**
- `on-add.alphaos.py` - Hook (task add)
- `on-modify.alphaos.py` - Hook (task modify/done)
- `export-snapshot.sh` - Write JSON export snapshot (for bots/UIs)

---

### war-stack/ ✅

**Purpose:** CLI automation for War Stack → Taskwarrior + TickTick

**Main Script:** `war_stack_create.sh`

**Use Cases:**
- Batch processing War Stacks
- CLI/terminal workflows
- Offline operation (no Bridge dependency)
- Alternative to GAS/Index Node

**See:** [war-stack/README.md](war-stack/README.md)

---

### ticktick/ ✅

**Purpose:** TickTick API integration for Core4 + Door UUID sync

**Scripts:**
- `ticktick_sync.py` - Core4 Taskwarrior ↔ TickTick sync
- `door_uuid_sync.py` - Sync Door UUIDs to TickTick descriptions
- `ticktick_tag_watcher.py` - DEPRECATED tag watcher

**Use Cases:**
- Core4 task management via TickTick
- UUID mapping for bidirectional sync
- Gemini AI duplicate detection

**See:** [ticktick/README.md](ticktick/README.md)

---

### Fire tooling ✅

**Engine:** `python-firemap-bot/firemap.py` (Taskwarrior → Markdown-formatted text messages)

**Bot:** `python-firemap-bot/firemap_bot.py` (sends `/fire` style snapshots)

**Wrappers:**
- `scripts/firectl` — wrapper + installers: `doctor`, `fix`, `status/logs`, `setup-reports`, `setup-systemd`
- `firemap` (repo root) — legacy sync (`firemap sync`) + new `firemap print/send` for the same output as the bot

---

## Deprecated Scripts

### hot-list/ ⚠️

**Status:** DEPRECATED - Use `hot.fish` instead

**Reason:** `~/.config/fish/functions/hot.fish` is the recommended tool

**See:** [hot-list/README.md](hot-list/README.md)

---

### automation/ ⚠️

**Status:** DEPRECATED - Replaced by systemd + Router Bot + Bridge

**Old Pattern:** inotify file watchers + tag polling
**New Pattern:** API-driven + UUID-first + systemd services

**See:** [automation/README.md](automation/README.md)

---

## Script Status Overview

| Script | Status | Replacement | Keep? |
|--------|--------|-------------|-------|
| `taskwarrior/export-snapshot.sh` | ✅ Active | - | YES |
| `war_stack_create.sh` | ✅ Active | - | YES |
| `ticktick_sync.py` | ✅ Active | - | YES |
| `door_uuid_sync.py` | ✅ Active | - | YES |
| `hot_to_md.sh` | ⚠️ Deprecated | `hot.fish` | REFERENCE |
| `door_file_watcher.sh` | ⚠️ Deprecated | systemd + Router | REFERENCE |
| `door_lifecycle.sh` | ⚠️ Deprecated | Bridge + UUID system | REFERENCE |
| `ticktick_tag_watcher.py` | ⚠️ Deprecated | systemd + Bridge | REFERENCE |

---

## Migration from .dotfiles/bin/

These scripts were moved from `~/.dotfiles/bin/` to `aos-hub/scripts/` for:

1. **Centralization** - All Door Centre scripts in one repo
2. **Documentation** - Each script has README with context
3. **Version Control** - Track changes with aos-hub
4. **Clarity** - Clear status (active/deprecated)

**Original Location:** `~/.dotfiles/bin/`
**New Location:** `aos-hub/scripts/`

**Symlinks (optional):**
```bash
# If you want to keep scripts in PATH
ln -s ~/aos-hub/scripts/war-stack/war_stack_create.sh ~/.local/bin/war_stack_create
ln -s ~/aos-hub/scripts/ticktick/ticktick_sync.py ~/.local/bin/ticktick_sync
ln -s ~/aos-hub/scripts/ticktick/door_uuid_sync.py ~/.local/bin/door_uuid_sync
```

---

## Usage Examples

### Create War Stack via CLI
```bash
cd ~/aos-hub/scripts/war-stack
./war_stack_create.sh ~/AlphaOS-Vault/Door/2-Plan/WS_MyDoor_KW01.md
```

### Sync Core4 to TickTick
```bash
cd ~/aos-hub/scripts/ticktick
./ticktick_sync.py --sync --tele --gemini
```

### Sync Door UUID to TickTick
```bash
cd ~/aos-hub/scripts/ticktick
./door_uuid_sync.py --door-uuid a1b2c3d4-... --ticktick-id 63f8e7c9
```

---

## Related Documentation

- [DOOR_CENTRE.md](../DOOR_CENTRE.md) - Complete Door Centre architecture
- [bridge/README.md](../bridge/README.md) - Bridge API documentation
- [python-warstack-bot/README.md](../python-warstack-bot/README.md) - Telegram War Stack Bot
- [gas/README.md](../gas/README.md) - Google Apps Script centres

---

## Future Work

- [ ] Integrate `war_stack_create.sh` with Index Node export endpoint
- [ ] Unified UUID mapping across all tools
- [ ] Profit task automation (wait:+5d after Door completion)
- [ ] Hit task dependencies (sequential execution)

---

**Last Updated:** 2026-01-10
**Maintainer:** alpha
