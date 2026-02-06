# Bridge Guidelines

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
- `app.py` returns 400 JSON on invalid payloads (don’t assume 200).

## Coding Style
- Keep handlers small, return JSON errors on invalid input.
- Prefer non-throwing behavior; the bridge should never crash on bad input.
