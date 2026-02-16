# Runbook

Operational commands and checks for `index-node`.

## Start

```bash
cd /home/alpha/aos-hub/index-node
npm install
npm start
```

Dev mode:

```bash
npm run dev
```

Core4 TTY:

```bash
npm run core4
```

## Fast Smoke Checks

```bash
curl -fsS http://127.0.0.1:8799/health
curl -fsS http://127.0.0.1:8799/menu | jq .
curl -fsS http://127.0.0.1:8799/api/centres | jq .
```

Key page checks:

```bash
curl -I http://127.0.0.1:8799/
curl -I http://127.0.0.1:8799/door
curl -I http://127.0.0.1:8799/game
curl -I http://127.0.0.1:8799/game/tent
curl -I http://127.0.0.1:8799/voice
```

## API Spot Checks

```bash
curl -fsS http://127.0.0.1:8799/api/fire/day | jq .
curl -fsS http://127.0.0.1:8799/api/core4/today | jq .
curl -fsS "http://127.0.0.1:8799/api/voice/history?limit=5" | jq .
```

## Environment Variables (Most Important)

Bridge and auth:
- `AOS_BRIDGE_URL` or `BRIDGE_URL`
- `AOS_BRIDGE_TOKEN`
- `AOS_BRIDGE_TOKEN_HEADER`
- `BRIDGE_TIMEOUT_MS`

Menu and task sources:
- `MENU_YAML`
- `TASK_EXPORT`
- `TASK_BIN`
- `TASKRC`
- `TASK_CACHE_TTL`

Fire:
- `FIRE_GCAL_EMBED_URL`
- `FIRE_TASK_TAGS` or `FIRE_TASK_TAGS_ALL`
- `FIRE_TASK_TAGS_MODE`
- `FIRE_TASK_DATE_FIELDS`
- `FIRE_INCLUDE_UNDATED`

Fruits:
- `FRUITS_QUESTIONS`
- `FRUITS_DIR`
- `FRUITS_STORE`
- `FRUITS_EXPORT_DIR`

Core4 and terminal:
- `CORE4_TW_SYNC`
- `CORE4_JOURNAL_DIR`
- `TERMINAL_ENABLED`
- `TERMINAL_ALLOW_REMOTE`

## When Something Breaks

1. Check `GET /health`.
2. Check `/menu` output against `menu.yaml`.
3. Verify bridge URL and token env.
4. Re-run failing endpoint with `curl` and inspect JSON error.
5. Confirm target vault paths exist and are writable.

## Change Checklist

1. If menu links changed, update `menu.yaml` only.
2. If endpoints changed, update `docs/api-map.md`.
3. If files moved, update `docs/file-map.md`.
4. Keep responses JSON and avoid HTML stack traces.
