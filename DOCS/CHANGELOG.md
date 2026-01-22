# Changelog

All notable changes to the aos-hub project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- `scripts/hot-list/aos-hot.fish` (fish Hot List CLI) synced from dotfiles.
- GAS HQ: `gas/hotlist_client.html` for modular Hot List UI handlers.

### Fixed - 2026-01-01

#### Taskwarrior Integration (Critical Fix)

**Problem:**
- Taskwarrior API returned error: "Setting journal_mode=WAL: unable to open database file: Error code 14"
- SQLite database couldn't be written due to systemd hardening

**Root Cause:**
- systemd service had `ProtectHome=read-only` which prevented write access to `~/.task/taskchampion.sqlite3`
- Taskwarrior uses SQLite WAL (Write-Ahead Logging) mode which requires write permissions

**Solution:**
- Added `ReadWritePaths` directives to `~/.config/systemd/user/alphaos-index.service`:
  ```systemd
  ReadWritePaths=%h/.task                    # Taskwarrior database
  ReadWritePaths=%h/.local/share/alphaos     # Task export file
  ReadWritePaths=%h/.alpha_os                # TickTick config
  ReadWritePaths=%h/AlphaOS-Vault            # Door/Game/Voice exports
  ```

**Impact:**
- ✅ `/api/taskwarrior/tasks` now returns 18 pending tasks
- ✅ Taskwarrior filtering by tags (door/hit/strike/core4/fire) works
- ✅ Task export file (`~/.local/share/alphaos/task_export.json`) created successfully
- ✅ All Taskwarrior hooks can now write to database

**Verification:**
```bash
curl http://127.0.0.1:8799/api/taskwarrior/tasks | jq '.ok, .count'
# Output: true, 18
```

**Files Changed:**
- `~/.config/systemd/user/alphaos-index.service` - Added ReadWritePaths

**Related Issues:**
- Door Centre: War Stack creation → Taskwarrior
- Game Centre: Fire Map → Task sync
- Core4: Task tracking integration

---

### Added - 2026-01-01

#### Repository Documentation

**CLAUDE.md:**
- Created comprehensive guide for Claude Code instances
- Documents Hub-and-Spoke architecture
- API endpoints reference (Index Node + Bridge)
- Development commands for all services
- Common troubleshooting patterns
- Security notes and testing procedures

**Location:** `/home/alpha/aos-hub/CLAUDE.md`

---

## Configuration Notes

### TickTick Integration (Incomplete)

**Status:** ⚠️ Requires user configuration

**Missing:**
- `TICKTICK_PROJECT_ID` in `~/.alpha_os/tick.env` is empty

**To Fix:**
```bash
echo 'TICKTICK_PROJECT_ID=<your-project-id>' >> ~/.alpha_os/tick.env
```

**Impact:**
- Local markdown exports work fine
- TickTick push (optional) will fail until configured

---

## System Status - 2026-01-01

### Verified Working

- ✅ Index Node (8799) - All APIs operational
- ✅ Router Bot - Telegram interface active
- ✅ Bridge (8080) - Data flow service connected
- ✅ Taskwarrior - 18 tasks synced, filtering works
- ✅ Door Centre - Hot List, Door War, War Stack flow
- ✅ Game Centre - Chapters loaded from vault
- ✅ Voice Centre - 5 history files accessible
- ✅ Fruits - 19 questions loaded
- ✅ Core4 - Totals API (local fallback)
- ✅ Tele API - Message queuing
- ✅ Tailscale - Remote access via 100.76.197.55:8799

### Known Limitations

- TickTick integration requires manual PROJECT_ID setup
- Vault sync timers inactive (not-found) - may need installation

---

## Testing

Smoke test checklist completed:
```bash
# Health checks
curl http://127.0.0.1:8799/health
curl http://127.0.0.1:8080/health

# API checks
curl http://127.0.0.1:8799/api/centres
curl http://127.0.0.1:8799/api/taskwarrior/tasks
curl http://127.0.0.1:8799/api/door/flow
curl http://127.0.0.1:8799/api/fruits

# System health
./scripts/aos-doctor
```

All tests passing as of 2026-01-01 17:45 CET.
