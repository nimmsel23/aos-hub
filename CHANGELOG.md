# aos-hub — Changelog

All notable changes to the aos-hub repository.

## Format

Each entry should include:
- **Component** (bridge/router/index/scripts/core4)
- **Type** (feat/fix/refactor/docs)
- **Description**

## Unreleased

### 2026-02-26

**bridge:**
- feat: Desktop notifications via notify-send when Core4 events logged (AOS_CORE4_DESKTOP_NOTIFY=1)
- feat: Systemd drop-in for DISPLAY/DBUS env vars (/etc/systemd/system/aos-bridge.service.d/notifications.conf)
- feat: Helper script lib/setup-notifications.sh for notification setup
- docs: Add CLAUDE.md with development guidelines

**core4:**
- feat: core4ctl sources shows latest event (date, habit, timestamp) per source directory
- feat: Support both ISO timestamp formats (dashes and compact)
- refactor: AlphaOS-Vault → vault path migration (core4_types.py, core4_paths.py)
- docs: Update CHANGELOG.md

**scripts:**
- refactor: hubctl simplified (465→315 lines, grouped commands, cleaner output)
- refactor: nodectl simplified (430→291 lines, delegation to indexctl)
- docs: Both scripts now have cleaner help and grouped command structure

**gas:**
- feat: terminal.gs drivepull/localpull commands for manual Drive→local sync

**env:**
- fix: Bridge rclone sync config (AOS_RCLONE_REMOTE=eldanioo:Alpha_HQ)
- fix: Core4 paths updated for vault migration

## 2026-02-20

**bridge:**
- fix: Bridge deployment changed to symlink (/opt/aos/bridge → ~/aos-hub/bridge)
- fix: Auth token support for external requests (local requests no token needed)

## Earlier Changes

See component-specific CHANGELOGs:
- `bridge/CHANGELOG.md`
- `core4/CHANGELOG.md`
- `router/CHANGELOG.md`
