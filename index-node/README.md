# alphaos-index-node

Primary local runtime for AOS Hub centres (UI + API on port `8799`).

## Position in Architecture

- `index-node` is the source of truth for ongoing feature development.
- `gas` is an active fallback and selective offload runtime for chosen functions.

Cross-repo docs:
- `../DOCS/INDEX.md`
- `../DOCS/node/INDEX.md`
- `../DOCS/ALIGNMENT_INDEXNODE_GAS.md`

Index-node internal docs:
- `docs-index.md`
- `file-map.md`
- `api-map.md`
- `runbook.md`

## Quickstart

```bash
cd /home/alpha/aos-hub/index-node
npm install
npm run dev
```

Production-style run (without nodemon):

```bash
npm start
```

Health check:

```bash
curl -fsS http://127.0.0.1:8799/health
```

## PWA Runtime Model (Laptop-first)

`index-node` remains the main integration server, but PWAs can run in a separate runtime on the same laptop.

- Main runtime: `npm run dev` / `npm start` (port `8799`)
- Standalone PWA runtime: `npm run pwa` (port `8780`, configurable via `PWA_PORT`)

Standalone runtime entry:
- `pwa-server.js`

It serves:
- static app shells from `public/` (including `public/pwa/*`)
- core PWA APIs via reused routers (`/api/core4`, `/api/frame`, `/api/freedom`, `/api/focus`, `/api/fire`, `/api/door`, `/api/game`)

Why this split:
- if `server.js` breaks during development, a separate PWA process can still boot and serve installed app shells
- PWA work can continue without coupling every change to the full HQ runtime

Quick start (standalone PWA runtime):

```bash
cd /home/alpha/aos-hub/index-node
npm run pwa
curl -fsS http://127.0.0.1:8780/health
```

Operational frontdoor:
- `pwactl` (from `aos-hub/scripts/`) for routes/health/check/doctor/open/run across main + standalone runtimes.

Note:
- GAS is treated as last-resort fallback and is not required for the standalone local PWA runtime.

## Edit Surface

- Menu links and SSOT routing: `menu.yaml`
- Main HTTP API + static serving: `server.js`
- Modular game routes: `routes/game.js`, `routes/game.tent.js`
- Service logic for tent bridge RPC: `services/tent.service.js`
- Shared helpers: `lib/cache.js`, `lib/week.js`
- Frontend pages: `public/`

## Common Routes

- `/` HQ index
- `/door`, `/door/*`
- `/game`, `/game/frame`, `/game/freedom`, `/game/focus`, `/game/fire`, `/game/tent`
- `/voice`
- `/pwa/core4` (canonical)
- `/core4` (legacy redirect to `/pwa/core4/`)
- `/facts`
- `/tele`

## Invariants

- `menu.yaml` is SSOT for menu links.
- Keep JSON error responses for invalid payloads.
- Keep terminal/WS endpoints local-only unless explicitly enabled by env.
