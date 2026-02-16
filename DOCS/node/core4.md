# Centre: Core4 (Node)

## Purpose
Local Core4 tracker + Taskwarrior bridge.

## Entry
- UI: `http://127.0.0.1:8799/core4`

## Storage
- Event ledger + snapshots: `~/AlphaOS-Vault/Core4`
  - `.core4/events/YYYY-MM-DD/*.json`
  - `core4_day_YYYY-MM-DD.json`
  - `core4_week_YYYY-Www.json`
  - `journal/YYYY-MM-DD/{domain}_{habit}.md`

## API (Node)
- `GET /api/core4/day-state?date=YYYY-MM-DD`
- `GET /api/core4/week-summary?date=YYYY-MM-DD`
- `POST /api/core4/log` (`domain`, `task`, `date`)
- `GET /api/core4/journal?date=YYYY-MM-DD`
- `POST /api/core4/journal` (`domain`, `habit`, `text`, `date`)
- `POST /api/core4/export-week` (`date`)
- Compatibility: `POST /api/core4`, `GET /api/core4/today`

## Env
- `AOS_BRIDGE_URL` (or `BRIDGE_URL`)
- `BRIDGE_TIMEOUT_MS`
- `CORE4_TW_SYNC` (for TTY sync)
