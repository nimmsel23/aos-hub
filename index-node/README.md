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
npm start
```

Health check:

```bash
curl -fsS http://127.0.0.1:8799/health
```

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
- `/core4`
- `/facts`
- `/tele`

## Invariants

- `menu.yaml` is SSOT for menu links.
- Keep JSON error responses for invalid payloads.
- Keep terminal/WS endpoints local-only unless explicitly enabled by env.
