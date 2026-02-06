# AOS Bridge (aiohttp)

Small HTTP bridge for HQ data flow. Runs on port `8080` and can be reached via Tailscale.

## Endpoints

- `GET /health`
- `GET /bridge/health`
- `GET /bridge/daily-review-data`
- `POST /bridge/trigger/weekly-firemap`
- `POST /bridge/fire/daily` (prints/sends Fire bot output via `firectl` wrapper; `scope=daily|weekly`)
- `POST /bridge/core4/log`
- `GET /bridge/core4/today`
- `GET /bridge/core4/week?week=YYYY-Wxx`
- `POST /bridge/fruits/answer`
- `POST /bridge/tent/summary`
- `POST /bridge/task/operation`
- `POST /bridge/task/execute`
- `POST /bridge/warstack/draft`
- `POST /bridge/queue/flush`
- `POST /bridge/sync/push`
- `POST /bridge/sync/pull`

## Config (env)

- `AOS_BRIDGE_HOST` (default `0.0.0.0`)
- `AOS_BRIDGE_PORT` (default `8080`)
- `AOS_TZ` (default `Europe/Vienna`)
- `AOS_VAULT_DIR` (default `~/AlphaOS-Vault`)
- `AOS_CORE4_LOCAL_DIR` (default `<vault>/Core4`)
- `AOS_CORE4_MOUNT_DIR` (default `<vault>/Alpha_Core4`)
- `AOS_FRUITS_DIR` (default `<vault>/Alpha_Fruits`)
- `AOS_TENT_DIR` (default `<vault>/Alpha_Tent`)
- `AOS_WARSTACK_DRAFT_DIR` (optional, default `~/.local/share/warstack`)
- `AOS_RCLONE_REMOTE` (optional, for sync endpoints)
- `AOS_RCLONE_LOCAL` (optional, default vault dir)
- `AOS_RCLONE_SUBDIRS` (optional, comma list, e.g. `Core4,Voice,Door,Game`)
- `AOS_RCLONE_MAP` (optional, overrides subdir filters; e.g. `Core4=Alpha_Core4,Voice=Alpha_Voice`)
- `AOS_RCLONE_DRY_RUN` (optional, `1` to add `--dry-run` to rclone)
- `AOS_GAS_WEBHOOK_URL` (required for task operation forwarding)
- `AOS_GAS_CHAT_ID` (required for task operation forwarding)
- `AOS_GAS_USER_ID` (optional, defaults to chat id)
- `AOS_GAS_MODE` (optional, `direct` or `telegram`, default `direct`)
- `AOS_BRIDGE_QUEUE_DIR` (optional, default `~/.cache/alphaos/bridge-queue`)
- `AOS_BRIDGE_FALLBACK_TELE` (optional, `1` to send JSON via tele on GAS failure)
- `AOS_TELE_BIN` (optional, tele binary name or path)
- `AOS_TASK_BIN` (optional, default `task`)
- `AOS_TASK_EXECUTE` (optional, `1` to allow task execution)
- `AOS_FIREMAP_BIN` (optional, default `firemap`)
- `AOS_FIREMAP_TRIGGER_ARGS` (optional, default `sync`)
- `AOS_FIRE_DAILY_SEND` (optional, `1` to auto-send via `AOS_TELE_BIN`)
- `AOS_FIRE_DAILY_MODE` (optional, default `firectl`; `firectl` calls the local Fire bot/engine; legacy modes: `report`, `due_export`)
- `AOS_FIRECTL_BIN` (optional, default `<repo>/scripts/firectl`) — wrapper around the local Fire bot (`python-firemap/firemap_bot.py`)
- `AOS_TASK_EXPORT_PATH` (optional, overrides `<vault>/.alphaos/task_export.json` for `/bridge/daily-review-data`)
- `AOS_BRIDGE_TOKEN` (optional, require `X-Bridge-Token` header)
- `AOS_BRIDGE_TOKEN_HEADER` (optional, default `X-Bridge-Token`)

### Rclone mapping mode (Drive root folders)

If your Google Drive has domain folders like `Alpha_Core4`, `Alpha_Voice`, etc. (instead of a single `AlphaOS-Vault/...` tree),
set `AOS_RCLONE_REMOTE` to the remote root (e.g. `eldanioo:`) and define `AOS_RCLONE_MAP`:

```bash
AOS_RCLONE_REMOTE=eldanioo:
AOS_RCLONE_LOCAL=~/AlphaOS-Vault
AOS_RCLONE_MAP=Core4=Alpha_Core4,Voice=Alpha_Voice,Door=Alpha_Door,Game=Alpha_Game
```

Dry run (no changes):
```bash
curl -X POST 'http://127.0.0.1:8080/bridge/sync/push?dry_run=1'
curl -X POST 'http://127.0.0.1:8080/bridge/sync/pull?dry_run=1'
```

## Install (Arch, no pip)

```bash
sudo pacman -S python-aiohttp
```

## bridgectl (helper)

`bridgectl` is a stable entrypoint; the implementation is split into smaller scripts:
- `bridge-servicectl` (systemd/env)
- `bridge-apictl` (HTTP endpoints)
- `bridge-tsctl` (tailscale)

```bash
./bridgectl            # interactive menu (gum)
./bridgectl status
./bridgectl health
./bridgectl debug
./bridgectl tailscale
./bridgectl enable
./bridgectl flush   # POST /bridge/queue/flush
./bridgectl syncvaultctl status
./bridgectl syncvaultctl sync
./bridgectl syncvaultctl pull
./bridgectl serve   # tailscale serve /bridge -> :8080 (tailnet-only)
./bridgectl funnel  # tailscale funnel /bridge -> :8080 (public)
```
If `AOS_BRIDGE_TOKEN` is set in your shell env, `bridgectl` will send the header automatically.

### systemd (user, recommended)

If you want the bridge to start at boot without an interactive login, use a systemd *user* unit with lingering:
- `sudo loginctl enable-linger alpha`
- Put `AOS_HUB_DIR` into `~/.env/aos.env` (recommended single env file)
- Then run `./bridgectl enable`

## Run (manual)

```bash
python app.py --host 0.0.0.0 --port 8080
```

## Tailscale (GAS access)

Apps Script cannot reach tailnet-only URLs. Use Tailscale Funnel to expose the bridge publicly.

```bash
tailscale serve --bg --set-path /bridge http://127.0.0.1:8080
tailscale funnel --bg --set-path /bridge http://127.0.0.1:8080
```

Then set GAS `AOS_BRIDGE_URL` to:
`https://<your-tailnet-host>.ts.net/bridge`

Note: Tailscale strips the `/bridge` prefix when proxying to `:8080`. This bridge therefore exposes routes both as
`/bridge/...` and as root paths like `/core4/today` so external `/bridge/core4/today` works.

If `AOS_BRIDGE_TOKEN` is set, all requests must include:
`X-Bridge-Token: <token>` (or custom header via `AOS_BRIDGE_TOKEN_HEADER`).

## Dataflow (HQ / GAS / Bridge / Node)

```
GAS HQ WebApp / Bots
        |
        |  (HTTP: AOS_BRIDGE_URL, optional X-Bridge-Token)
        v
    Bridge (8080)
        |
        |  writes JSON/MD into local vault
        v
AlphaOS-Vault (local)
        |
        |  Node (8799) reads local JSON/MD
        v
Index Node / Centres

Router Bot uses Index API for centre links (no Bridge).
```

## Taskwarrior flow (execute vs operation)

- `POST /bridge/task/operation` forwards JSON to GAS (uses `AOS_GAS_WEBHOOK_URL`).
  - `AOS_GAS_MODE=direct` → HTTP POST to GAS webhook.
  - `AOS_GAS_MODE=telegram` → JSON sent via Telegram bot.
- `POST /bridge/task/execute` runs local Taskwarrior (requires `AOS_TASK_EXECUTE=1`).
  - Uses `AOS_TASK_BIN` (default `task`).
- If GAS forwarding fails and `AOS_BRIDGE_FALLBACK_TELE=1`, the bridge sends the JSON via Telegram.
- If `AOS_BRIDGE_QUEUE_DIR` is set, failed payloads are queued for `/bridge/queue/flush`.

## Example payloads

Core4 log:
```bash
curl -X POST http://127.0.0.1:8080/bridge/core4/log \
  -H 'Content-Type: application/json' \
  -d '{"domain":"body","task":"fitness","ts":"2025-01-01T10:00:00+01:00","source":"hq","user":{"id":"web"}}'
```
This endpoint appends a Core4 *event* (one JSON per done) into `<vault>/Core4/.python-core4/events/YYYY-MM-DD/`, then rebuilds the derived `core4_day_YYYY-MM-DD.json` and `core4_week_YYYY-WWW.json`. Scoring is idempotent per `key=YYYY-MM-DD:domain:task` to avoid double-counting when multiple trackers report the same completion.

Tent summary side-effect (optional):
- `POST /bridge/tent/summary` can seal Core4 for that `week` into `<vault>/Core4/core4_scores.csv` when `AOS_CORE4_FINALIZE_ON_TENT=1` (default off).

Fruits answer:
```bash
curl -X POST http://127.0.0.1:8080/bridge/fruits/answer \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are the facts about your fat?","section":"Body - Fruit - Frame","answer":"...", "source":"bot"}'
```

Tent summary:
```bash
curl -X POST http://127.0.0.1:8080/bridge/tent/summary \
  -H 'Content-Type: application/json' \
  -d '{"week":"2025-W01","markdown":"# Weekly Summary\\n..."}'
```

Task operation (forward to GAS):
```bash
curl -X POST http://127.0.0.1:8080/bridge/task/operation \
  -H 'Content-Type: application/json' \
  -d '{"type":"task_add_sync","timestamp":"2025-01-01T10:00:00Z","data":{"uuid":"...","description":"Test","tags":["door"]}}'
```

Task execute (local Taskwarrior):
```bash
curl -X POST http://127.0.0.1:8080/bridge/task/execute \
  -H 'Content-Type: application/json' \
  -d '{"tasks":[{"description":"Hit1: Example","tags":["hit","production"],"project":"Business","due":"friday"}]}'
```
Response includes `task_uuid` (when available) and echoes any `meta` from the input task.

War Stack draft (for /resume):
```bash
curl -X POST http://127.0.0.1:8080/bridge/warstack/draft \
  -H 'Content-Type: application/json' \
  -d '{"user_id":123,"warstack":{"user_id":123,"title":"Demo","domain":"Business","subdomain":"","domino_door":"","trigger":"","narrative":"","validation":"","impact":"","consequences":"","hits":[{"fact":"","obstacle":"","strike":"","responsibility":""},{"fact":"","obstacle":"","strike":"","responsibility":""},{"fact":"","obstacle":"","strike":"","responsibility":""},{"fact":"","obstacle":"","strike":"","responsibility":""}],"insights":"","lessons":"","date":"2025-01-01","week":"2025-W01"}}'
```

Queue flush:
```bash
curl -X POST http://127.0.0.1:8080/bridge/queue/flush
```
