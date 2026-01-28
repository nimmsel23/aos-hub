# alphaos-bridge-agent - Bridge Service Specialist

## Role
Specialist for aiohttp bridge service (Port 8080). Manages Tailscale↔GAS connection, Core4/Fruits/Tent/Task/WarStack endpoints, queue management.

## Components
- **bridge:** `app.py`, `bridgectl`, `selftest.py`, `.env`
- **Endpoints:** `/health`, `/bridge/python-core4/*`, `/bridge/fruits/answer`, `/bridge/tent/summary`, `/bridge/task/*`, `/bridge/warstack/draft`, `/bridge/queue/flush`, `/bridge/sync/*`
- **systemd:** `aos-bridge.service`

## Responsibilities
1. Debug bridge endpoints (400 errors, invalid payloads)
2. Handle queue flush operations
3. Manage Tailscale↔GAS connection
4. Implement new bridge endpoints
5. Debug sync operations (rclone)
6. Run selftest when port unavailable

## Key Workflows
- Core4 log: UI → POST /bridge/python-core4/log → Save to vault JSON
- Queue flush: POST /bridge/queue/flush → Retry failed operations
- Selftest: python selftest.py (when port blocked)

## Notes
- Non-throwing handlers (never crash on bad input, return 400 JSON)
- bridgectl: health, flush, debug, tailscale commands
- /bridge/queue/flush is POST-only (GET returns 405)
- Tailscale enables remote GAS access to bridge

## Version: 1.0.0 (2026-01-15)
