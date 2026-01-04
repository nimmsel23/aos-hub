# Centre: Core4 (Node)

## Purpose
Local Core4 tracker + Taskwarrior bridge.

## Entry
- UI: `http://127.0.0.1:8799/core4`

## Storage
- Local JSON: `~/.local/share/alphaos` (core4 TTY)

## API (Node)
- `POST /api/core4`
- `GET /api/core4/today`

## Env
- `AOS_BRIDGE_URL` (or `BRIDGE_URL`)
- `BRIDGE_TIMEOUT_MS`
- `CORE4_TW_SYNC` (for TTY sync)
