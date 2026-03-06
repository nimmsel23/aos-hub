# Runbook

Operational commands and checks for `index-node`.

## Start

```bash
cd /home/alpha/aos-hub/index-node
npm install
npm run dev
```

Production-style (without nodemon):

```bash
npm start
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
curl -fsS "http://127.0.0.1:8799/api/core4/day-state?date=$(date +%F)" | jq .
curl -fsS "http://127.0.0.1:8799/api/core4/week-summary?date=$(date +%F)" | jq .
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

Core4/PWA quick path (dev service):
1. `systemctl --user restart aos-index-dev.service`
2. `systemctl --user status aos-index-dev.service --no-pager`
3. `nodectl pin status`
4. If needed for local debug: `nodectl pin off` and restart again
5. `journalctl --user -u aos-index-dev.service -n 120 --no-pager`

## Change Checklist

1. If menu links changed, update `menu.yaml` only.
2. If endpoints changed, update `api-map.md`.
3. If files moved, update `file-map.md`.
4. Keep responses JSON and avoid HTML stack traces.

## Template SSOT Policy (AlphaOS)

- Für alle Stages/Phases/Maps (Frame/Freedom/Focus/Fire/Tent/...) sollen zentrale Templates als SSOT gepflegt werden.
- Diese Templates müssen von sämtlichen Frontends und Tools genutzt werden (`aos`, `hubctl`, PWA/UI, API-Routen, CLI-Wrappers).
- Verboten sind auseinanderlaufende Inline-Template-Varianten in einzelnen UIs/Routen, außer explizit dokumentierter Kompatibilitätsschicht.

## Cadence Matrix (User-Truth)

- `Freedom`: quarterly
- `Focus`: monthly
- `Fire`: weekly
- `Core4`: daily
- Hinweis: diese Cadences sind als getrennte Themen/Pipelines zu behandeln, nicht als ein vermischtes Template.

## Tailscale PWA Access (Serve/Funnel)

Canonical host for mobile/public PWA access:
- `https://ideapad.tail7a15d6.ts.net`

Current expected handlers:
- `/` -> `http://127.0.0.1:8799` (index-node + all `/pwa/*` + `/api/*`)
- `/bridge` -> `http://127.0.0.1:8080`
- `/fitnessctx` -> `http://127.0.0.1:8780`

Important:
- Do **not** add separate handlers for `/api/core4`, `/api/fire`, `/api/focus`.
- Separate `/api/*` mappings can strip prefixes and cause PWA "failed to fetch" errors on mobile.

Quick checks:

```bash
tailscale serve status
tailscale funnel status
nodectl pwa doctor
curl -skI https://ideapad.tail7a15d6.ts.net/pwa/core4/
curl -sk "https://ideapad.tail7a15d6.ts.net/api/core4/day-state?date=2026-02-26&tz=Europe/Berlin"
```

## Core4 PWA Ausbau-Hinweis (Journal + Timeline)

Für `pwa/core4` ist festzuhalten:
- Der Core4-Tracker in `index-node` hat bereits Journal-Funktionalität.
- Der Core4-Tracker liefert bereits Timeline-/Verlaufsdaten (Tag/Woche), die in der PWA ausgebaut werden sollen.

Relevante API-Bausteine für den Ausbau:
- `GET /api/core4/day-state`
- `GET /api/core4/week-summary`
- `GET /api/core4/journal`
- `POST /api/core4/journal`

Ausbauziel:
- Journal und Timeline als sichtbare First-Class-Module in `pwa/core4` integrieren (mobile-first).
