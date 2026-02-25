# Changelog - aos-hub

All notable changes to the AOS Hub infrastructure will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Documentation (2026-02-25)
- **bridge/README.md**: Added Architecture Overview section
  - Tailscale foundation explained (why it enables the whole system)
  - Bidirectional communication pattern documented (Gas ↔ Bridge)
  - Performance Notes section with optimization details
  - Core4 mount directory deprecation (`AOS_CORE4_MOUNT_DIR=/nonexistent`)
  - Flow diagrams for Gas → Bridge and Bridge → Gas

- **bridge/AGENTS.md**: Added Performance & Architecture section
  - Tailscale foundation notes for developers
  - Core4 optimization guidelines (don't add mount reading back)
  - Lock scope best practices (minimal critical sections)

- **bridge/app.py**: Enhanced code comments
  - Core4 storage model updated with performance notes
  - handle_core4_log() documented with flow and optimizations
  - _core4_events_for_day() optimization explained inline

- **Memory (MEMORY.md)**: Complete architecture documentation
  - Tailscale as foundation (not just "Telegram bot")
  - Bidirectional flow examples (both directions)
  - Key optimizations with rationale

### Added (2026-02-20)
- **c4 command**: New bash command for fast Core4 status display
  - Location: `core4/python-core4/c4`
  - Reads directly from `~/.core4/core4_day_YYYY-MM-DD.json`
  - No bridge dependency, instant response
  - Shows: habits status (✓/○), daily total, bridge health
  - Symlinked to `~/bin/c4`

### Fixed (2026-02-20)
- **Bridge "offline" issue**: Core4 was showing bridge as offline despite bridge running
  - Root cause: `CORE4_MOUNT_DIR` pointing to hung rclone mount (`/home/alpha/gdrive/Alpha_HQ`)
  - Fix: Set `AOS_CORE4_MOUNT_DIR=/nonexistent` in `~/.env/aos.env`
  - Result: Bridge response time 30s → 13ms
  - Requires: `sudo systemctl restart aos-bridge.service`

- **syncctl menu broken**: Menu exited after every action
  - Root cause: Helper functions used `exec` which replaces process
  - Fix: Added `SYNCCTL_IN_MENU=1` flag pattern
  - Changed: `run_vault`, `run_domains`, `run_vitaltrainer`, `run_fadaro`, `run_hub_live`, `run_aos_sync`
  - Location: `scripts/syncctl`

- **bridgectl status incomplete**: Only showed user scope service
  - Root cause: Only checked `systemctl --user`
  - Fix: Check system scope first (`aos-bridge.service`), then user scope
  - Added: "Active mode" verdict (system|user|none)
  - Location: `bridge/bridge-servicectl`

### Changed (2026-02-20)
- **aosctl status redesigned**: Compact overview instead of wall-of-text
  - Helper functions: `_status_unit_line`, `_status_timer_line`, `_index_deploy_drift`
  - CTL tools: One line per tool (17 tools) with path
  - Sections: Core Services → Dev Units → Deploy Drift → Sync Timers → Other Timers → CTL Tools
  - Location: `aosctl`

- **aosctl hub deploy added**: Deploy Index Node from repo to production
  - Function: `index_deploy_cmd()`
  - Syncs `~/aos-hub/index-node/` → `/opt/aos/index/` with rsync
  - Restarts `aos-index.service` (system scope)
  - Flags: `--dry-run`, `--src=`, `--dst=`
  - Usage: `aosctl hub deploy`
  - Location: `aosctl`

### Environment (2026-02-20)
- **~/.env/aos.env** updated:
  ```bash
  # Disabled legacy Alpha_Core4 mount (was causing 30s hangs)
  AOS_CORE4_MOUNT_DIR=/nonexistent
  CORE4_MOUNT_DIR=/nonexistent
  ```

### Known Issues (2026-02-20)
- **Core4 path chaos**: Multiple event directories found
  - Active: `~/.core4/.core4/events/` (currently used)
  - Legacy: `~/vault/Core4/.core4/events/`, `~/vault/Alpha_Core4/.core4/events/`,
    `~/vault/Alpha_HQ/.core4/events/`, `~/business/Alpha_Core4/.core4/events/`
  - Status: Working but messy, documented in memory
  - Action: Use `core4ctl` and `c4` carefully, avoid unnecessary token waste

- **core4ctl install-cli bug**: Parses `--help` as target instead of using default
  - Non-critical, workaround: Call with explicit target
  - Location: `core4/python-core4/core4-clinctl`

---

## Session Context (2026-02-19 → 2026-02-20)

**Primary Goals:**
1. ✅ Fix Index Node version drift (system vs repo)
2. ✅ Reduce `aosctl status` verbosity
3. ✅ Fix `syncctl menu` broken behavior
4. ✅ Fix `bridgectl status` scope check
5. ✅ Fix Core4 bridge "offline" issue
6. ✅ Create `c4` bash command for fast Core4 status

**Architecture Context:**
- **Hub-and-Spoke**: Index Node (:8799) + Bridge (:8080) + Router Bot (Telegram)
- **Dual-scope systemd**: System services (`aos-*.service`) + User services (`alphaos-*.service`)
- **Deploy pattern**: `~/aos-hub/*/` (repo) → `/opt/aos/*/` (production)
- **Env source of truth**: `~/.env/aos.env` (symlinked from `/etc/aos/aos.env`)

**Files Modified:**
- `aosctl` (status redesign + hub deploy)
- `scripts/syncctl` (menu fix)
- `bridge/bridge-servicectl` (dual-scope check)
- `~/.env/aos.env` (Core4 mount disabled)
- `core4/python-core4/c4` (new file)
- `~/bin/c4` (symlink created)

**Memory Updated:**
- `/home/alpha/.claude/projects/-home-alpha/memory/MEMORY.md`
  - Gas HQ Control Center ping flow
  - Bridge health endpoints
  - Event ledger location
  - core4ctl warning (messy, use carefully)
  - aos-hub architecture quick reference
  - Key fixes done (2026-02-19)
