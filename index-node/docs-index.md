# Index-Node Docs

This directory documents how `index-node` is structured and operated.

## Read Order

1. `README.md` (project frontdoor)
2. `file-map.md` (where code lives)
3. `api-map.md` (what endpoints exist)
4. `runbook.md` (how to run and debug)

## Quick Orientation

- HTTP server and most APIs: `server.js`
- Menu source of truth: `menu.yaml`
- Static pages: `public/`
- Modular routes: `routes/`
- Service layer: `services/`
- Utility layer: `lib/`

## First Places to Look by Task

- "Menu link is wrong": `menu.yaml`, then `public/index.html` + `public/menu.js`
- "Centre page does not load": route/redirect in `server.js`, then file in `public/`
- "API behavior changed": endpoint in `server.js`, bridge helpers in `services/bridge.client.js`
- "Tent data is stale": `routes/game.tent.js`, `services/tent.service.js`, bridge health in runbook
