# Fire Component Guidelines

Das zugehörige `firectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Purpose
- Fire is the daily/weekly execution view (Taskwarrior → “Firemap” messages + local Fire Centre UI).
- The hub contains multiple integration points (Taskwarrior, systemd timers, router triggers, Index Node fallback).

## Key Entry Points
- Taskwarrior (terminal): `task fire` (custom report in `~/.taskrc`)
- Fire tooling (canonical): `game/fire/firectl` (send to Telegram, export markdown, setup timers)
- Fire setup scripts (canonical): `game/fire/setup-fire-map.sh`, `game/fire/setup-fire-reports.sh`
- Fire sync parser (canonical): `game/fire/fire-to-tasks.sh`
- Compatibility wrapper: `scripts/firectl`
- Firemap engine: `game/fire/firemap.py`
- Firemap sender CLI: `game/fire/firemap_bot.py`
- Index Node Fire API/UI: `index-node/server.js` (`/api/fire/day`, `/api/fire/week`, `/game/fire`)
- Router trigger: `router/extensions/firemap_commands.py` (triggers systemd units first)

## Conventions
- Keep secrets out of git (Telegram tokens/chat IDs live in env files only).
- Prefer systemd user units for scheduled sends; keep router triggers thin.
- When changing filters, keep semantics consistent across:
  - `task fire` (terminal)
  - Firemap daily/weekly Telegram output
  - Index Node `/api/fire/*` Taskwarrior fallback
- Local prototype map scaffolding in this repo uses `game/fire/firectl scaffold` and writes:
  - `game/fire/prototypes/<YYYY-Www>/weekly.md`
  - `game/fire/prototypes/<YYYY-Www>/daily.json`
  - `game/fire/prototypes/<YYYY-Www>/daily.ics`
- Prototype `weekly.md` keeps `focus_maps:` references for downstream Tent/cascade tests.

## Quick Debug Commands
- Firemap dry output: `python game/fire/firemap_bot.py print --scope daily`
- Firemap counts: `python game/fire/firemap_bot.py test --debug --scope daily`
- Fire timers: `systemctl --user status alphaos-fire-daily.timer alphaos-fire-weekly.timer`
- Fire logs: `journalctl --user -u alphaos-fire-daily.service -u alphaos-fire-weekly.service -n 200 --no-pager`
- Prototype scaffold: `game/fire/firectl scaffold 2026-W09 --date 2026-02-25 --month 2026-02`
