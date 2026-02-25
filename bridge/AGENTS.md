# Bridge Guidelines

Das zugehörige `bridgectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Project Structure & Purpose
- `app.py` is the aiohttp service on port `8080` (Core4/Fruits/Tent + task routing).
- `bridgectl` is a thin CLI entrypoint (kept stable), dispatching into:
  - `bridge-servicectl` (systemd/env)
  - `bridge-apictl` (HTTP endpoints)
  - `bridge-tsctl` (tailscale serve/funnel/status)
- `selftest.py` runs in-process handler tests (no port bind).
- `README.md` documents endpoints and env vars.

## Run & Ops
- Manual: `python app.py --host 0.0.0.0 --port 8080`
- Health: `./bridgectl health`
- Queue flush: `./bridgectl flush` (POSTs `/bridge/queue/flush`)

## Environment (common)
- `AOS_VAULT_DIR`, `AOS_CORE4_DIR`, `AOS_FRUITS_DIR`, `AOS_TENT_DIR`
- `AOS_GAS_WEBHOOK_URL`, `AOS_GAS_CHAT_ID`, `AOS_GAS_MODE`
- `AOS_RCLONE_REMOTE`, `AOS_RCLONE_LOCAL`, `AOS_RCLONE_SUBDIRS`
- `AOS_TASK_BIN` (default `task`), `AOS_TASK_EXECUTE=1` enables `/bridge/task/execute`
- `AOS_BRIDGE_QUEUE_DIR`, `AOS_BRIDGE_FALLBACK_TELE=1` for deferred/tele fallback

## Notes / Gotchas
- `selftest.py` is the safe verification path when port bind is blocked.
- `/bridge/queue/flush` is POST-only (GET returns 405).
- `app.py` returns 400 JSON on invalid payloads (don't assume 200).

## Performance & Architecture (2026-02-25)

**Tailscale Foundation:**
- Bridge binds to `0.0.0.0:8080` and is globally reachable at `https://ideapad.tail7a15d6.ts.net/bridge`
- Gas HQ (cloud) can reach laptop directly via Tailscale mesh network (no port forwarding needed)
- Bidirectional: Gas → Bridge (Core4 logs) AND Bridge → Gas (task operations via webhook)

**Core4 Optimizations:**
- Set `AOS_CORE4_MOUNT_DIR=/nonexistent` to disable legacy rclone mount (prevents 30s hangs)
- `_core4_events_for_day()` skips /nonexistent paths early (no exists() call on hung mounts)
- Week JSON rebuild deferred to on-demand (`/bridge/core4/week` endpoint only)
- Day aggregate built on every log (fast: 55ms typical response time)

**When modifying Core4 handlers:**
- Don't add mount reading back (Gas HQ pushes via HTTP now)
- Keep lock scope minimal (only hold `core4_lock` during file writes)
- Week rebuild is expensive (reads 7 days) - avoid in hot paths

## Coding Style
- Keep handlers small, return JSON errors on invalid input.
- Prefer non-throwing behavior; the bridge should never crash on bad input.
