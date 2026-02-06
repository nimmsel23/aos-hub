# Fire Component Guidelines

## Purpose
- Fire is the daily/weekly execution view (Taskwarrior → “Firemap” messages + local Fire Centre UI).
- The hub contains multiple integration points (Taskwarrior, systemd timers, router triggers, Index Node fallback).

## Key Entry Points
- Taskwarrior (terminal): `task fire` (custom report in `~/.taskrc`)
- Fire tooling: `scripts/firectl` (send to Telegram, export markdown, setup timers)
- Firemap engine: `python-firemap/firemap.py`
- Firemap sender CLI: `python-firemap/firemap_bot.py`
- Index Node Fire API/UI: `index-node/server.js` (`/api/fire/day`, `/api/fire/week`, `/game/fire`)
- Router trigger: `router/extensions/firemap_commands.py` (triggers systemd units first)

## Conventions
- Keep secrets out of git (Telegram tokens/chat IDs live in env files only).
- Prefer systemd user units for scheduled sends; keep router triggers thin.
- When changing filters, keep semantics consistent across:
  - `task fire` (terminal)
  - Firemap daily/weekly Telegram output
  - Index Node `/api/fire/*` Taskwarrior fallback

## Quick Debug Commands
- Firemap dry output: `python python-firemap/firemap_bot.py print --scope daily`
- Firemap counts: `python python-firemap/firemap_bot.py test --debug --scope daily`
- Fire timers: `systemctl --user status alphaos-fire-daily.timer alphaos-fire-weekly.timer`
- Fire logs: `journalctl --user -u alphaos-fire-daily.service -u alphaos-fire-weekly.service -n 200 --no-pager`

