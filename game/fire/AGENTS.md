# Fire Component Guidelines

Das zugehörige `firectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Purpose
- Fire is the daily/weekly execution view (Taskwarrior → “Firemap” messages + local Fire Centre UI).
- The hub contains multiple integration points (Taskwarrior, systemd timers, router triggers, Index Node fallback).
- Fire now also includes daily Taskwarrior → Google Calendar sync (`due today` + `overdue`).

## Key Entry Points
- Taskwarrior (terminal): `task fire` (custom report in `~/.taskrc`)
- Fire tooling (canonical): `game/fire/firectl` (send to Telegram, export markdown, setup timers)
- Fire setup scripts (canonical): `game/fire/setup-fire-map.sh`, `game/fire/setup-fire-reports.sh`
- Fire sync parser (canonical): `game/fire/fire-to-tasks.sh`
- Compatibility wrapper: `scripts/firectl`
- Firemap engine: `game/fire/firemap.py`
- Firemap sender CLI: `game/fire/firemap_bot.py`
- Fire GCal helpers:
  - `game/fire/gcal-bootstrap.sh` (guided auth + setup)
  - `game/fire/gcal-auth.sh` / `game/fire/gcal-list.sh`
  - `game/fire/gcal-setup.sh` (writes `game/fire/fire.env`)
  - `game/fire/gcal-due.sh` / `game/fire/gcal-push-due.sh` (daily push)
  - `game/fire/gcal-auto.sh` (daily systemd timer for GCal push)
- Index Node Fire API/UI: `index-node/server.js` (`/api/fire/day`, `/api/fire/week`, `/game/fire`)
- Router trigger: `router/extensions/firemap_commands.py` (triggers systemd units first)

## Conventions
- Keep secrets out of git (Telegram tokens/chat IDs live in env files only).
- Keep Google OAuth client JSON (`client_secret*.json`) local/private.
- Prefer systemd user units for scheduled sends; keep router triggers thin.
- When changing filters, keep semantics consistent across:
  - `task fire` (terminal)
  - Firemap daily/weekly Telegram output
  - Index Node `/api/fire/*` Taskwarrior fallback
- For GCal due sync, task selection is configurable in `game/fire/fire.env`:
  - `AOS_FIRE_GCAL_TW_SOURCE=filters|report`
  - `AOS_FIRE_GCAL_TW_REPORT=fired` (preferred when using custom report)
  - fallback filters:
    - `AOS_FIRE_GCAL_TW_FILTER_TODAY="status:pending due:today"`
    - `AOS_FIRE_GCAL_TW_FILTER_OVERDUE="status:pending due.before:today"`
- Scheduled task behavior for GCal due sync:
  - if `AOS_FIRE_GCAL_SCHEDULED_AS_TIMED=1` and task has `scheduled`, create timed event at scheduled HH:MM
  - otherwise create all-day event
  - timed duration: `AOS_FIRE_GCAL_SCHEDULED_DURATION_MIN` (default `60`)

## Source Of Truth / Derived
- SoT for selection: Taskwarrior (`task ... export`, usually report `fired`).
- SoT for push config: `game/fire/fire.env`.
- Derived:
  - Google Calendar events (external sink)
  - optional ICS output (`--backend ics`)
- Safety rules:
  - GCal sync uses marker-based delete/recreate for the target day (idempotent reruns).
  - only script-created events (marker-prefixed) are touched by cleanup.

## Quick Debug Commands
- Firemap dry output: `python game/fire/firemap_bot.py print --scope daily`
- Firemap counts: `python game/fire/firemap_bot.py test --debug --scope daily`
- Fire timers: `systemctl --user status alphaos-fire-daily.timer alphaos-fire-weekly.timer`
- Fire logs: `journalctl --user -u alphaos-fire-daily.service -u alphaos-fire-weekly.service -n 200 --no-pager`
- GCal bootstrap: `game/fire/firectl gcal bootstrap`
- GCal doctor: `game/fire/firectl gcal doctor`
- GCal preview: `game/fire/firectl gcal due --backend print`
- GCal push: `game/fire/firectl gcal due`
- GCal auto timer:
  - enable: `game/fire/firectl gcal auto enable 07:00`
  - status: `game/fire/firectl gcal auto status`
  - disable: `game/fire/firectl gcal auto disable`
