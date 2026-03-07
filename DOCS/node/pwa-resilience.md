# PWA Resilience Architecture (Laptop-first)

## Goal

PWAs should stay usable on the laptop even when the main `index-node/server.js` runtime is unavailable or being refactored.

## Runtime Strategy

Two local runtimes, one codebase:

1. `index-node` main runtime (integration hub)
- command: `npm run dev` / `npm start`
- port: `8799`
- full HQ features

2. `pwa-standalone` runtime (stability lane)
- command: `npm run pwa`
- port: `8780` (override with `PWA_PORT`)
- serves `public/pwa/*` app shells
- reuses core PWA route modules (`core4/frame/freedom/focus/fire/door/game`)

This makes PWA delivery less fragile during heavy `server.js` changes.

## Current Contract

- Health:
  - main: `GET /health` on `:8799`
  - standalone: `GET /health` on `:8780`
- PWA assets:
  - `/pwa/<app>/...`
- Core map APIs:
  - `/api/core4/*`
  - `/api/frame/*`
  - `/api/freedom/*`
  - `/api/focus/*`
  - `/api/fire/*`
  - `/api/door/*`
  - `/api/game/*`

## Non-Goals (for now)

- No mandatory GAS dependency for local PWA operation.
- GAS remains optional last fallback only.

## Roadmap

## Phase 1 (done / active)
- Separate local PWA runtime (`pwa-server.js`) introduced.
- `door` and `game` promoted to full installable PWA shells (manifest + icons + SW).
- Existing modular daily apps (`core4`, `fire`) remain unchanged in role.

## Phase 2 (next)
- Add smoke script that checks both runtimes (`8799` + `8780`) and all PWA manifests/SWs.
- Add explicit compatibility matrix per app:
  - app-shell availability
  - read APIs
  - write APIs
  - offline behavior

## Phase 3
- Introduce local-first queue/sync for writes when API temporarily unavailable.
- Keep sync target pluggable (main runtime first, GAS optional later).

## Ops Notes

- Preferred install source for mobile testing can be `http://<laptop>:8780/pwa/...` when isolating PWA runtime from HQ changes.
- Keep `menu.yaml` as HQ SSOT; standalone runtime is delivery hardening, not route governance.
