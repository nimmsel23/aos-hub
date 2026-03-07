# Centre: Door (Node)

## Purpose
Local Door Centre (vault-first) with optional TickTick push.

## Current PWA Direction
- `Potential` now has a standalone install route: `/pwa/potential/`
- `Plan` now has a standalone install route: `/pwa/plan/`
- `Production` now has a standalone install route: `/pwa/production/`
- `Profit` now has a standalone install route: `/pwa/profit/`
- `Door Hub` remains under `/pwa/door/`
- `/pwa/door/*` phase paths are compatibility redirects to standalone routes
- detailed build order and target architecture: `door-pwa-roadmap.md`

## Entry
- UI: `http://127.0.0.1:8799/door`
- Potential PWA: `http://127.0.0.1:8799/pwa/potential/`
- Plan PWA: `http://127.0.0.1:8799/pwa/plan/`
- Production PWA: `http://127.0.0.1:8799/pwa/production/`
- Profit PWA: `http://127.0.0.1:8799/pwa/profit/`
- Door Hub PWA: `http://127.0.0.1:8799/pwa/door/`
- Backend: `index-node/server.js`

## Storage
- Vault root: `~/vault/Door`
- Hot List -> `1-Potential`
- Door War -> `2-Plan`
- War Stack -> `War-Stacks` (legacy) or `3-Production`
- Hit List -> `3-Production`
- Profit -> `4-Profit`

## API (Node)
- Potential:
  - `GET /api/door/potential/hotlist`
  - `POST /api/door/potential/hotlist`
  - `PUT /api/door/potential/hotlist/:id`
  - `DELETE /api/door/potential/hotlist/:id`
  - `POST /api/door/potential/hotlist/:id/done`
- Plan:
  - `POST /api/door/plan/doorwar`
  - `POST /api/door/plan/quadrant/:id`
  - `GET /api/door/plan/doorwars`
  - `GET /api/door/plan/warstacks`
  - `POST /api/door/plan/warstack/start`
  - `POST /api/door/plan/warstack/answer`
  - `GET /api/door/plan/warstack/:id`
  - `GET /api/door/plan/warstack/sessions`
- Production:
  - `GET /api/door/production/hits`
  - `POST /api/door/production/hits/:id/toggle`
  - `GET /api/door/production/hits/week`
- Profit:
  - `GET /api/door/profit/completed`
  - `POST /api/door/profit/reflection`
  - `GET /api/door/profit/reflections`

## Env (common)
- `DOOR_FLOW_PATH` (default `~/vault/Door/.door-flow.json`)
- `DOOR_HITS_TICKTICK` (set `1` to push hits)
- `DOOR_HITS_TAGS` (default `door,hit,production`)
