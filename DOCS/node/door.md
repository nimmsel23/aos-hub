# Centre: Door (Node)

## Purpose
Local Door Centre (vault-first) with optional TickTick push.

## Entry
- UI: `http://127.0.0.1:8799/door`
- Backend: `index-node/server.js`

## Storage
- Vault root: `~/AlphaOS-Vault/Door`
- Hot List -> `1-Potential`
- Door War -> `2-Plan`
- War Stack -> `War-Stacks` (legacy) or `3-Production`
- Hit List -> `3-Production`
- Profit -> `4-Profit`

## API (Node)
- `POST /api/door/export`
- `GET /api/door/hotlist`
- `POST /api/door/hotlist`
- `POST /api/door/doorwar`
- `POST /api/door/warstack/start`
- `POST /api/door/warstack/answer`
- `GET /api/door/warstack/:id`
- `GET /api/door/chapters?source=blueprints|alphaos`

## Env (common)
- `DOOR_FLOW_PATH` (default `~/AlphaOS-Vault/Door/.door-flow.json`)
- `DOOR_HITS_TICKTICK` (set `1` to push hits)
- `DOOR_HITS_TAGS` (default `door,hit,production`)
