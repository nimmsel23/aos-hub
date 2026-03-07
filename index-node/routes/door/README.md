# Door Routes (Phased)

This folder splits Door backend routes by lifecycle phase while keeping the public API unchanged.

## Files

- `shared.js`
  - Shared state + storage helpers (`door-centre-state.json` with legacy fallback)
  - Markdown export helpers for War Stacks / Profit reflections
  - Common response + normalization utilities

- `files.js`
  - `GET /api/door/files`
  - `GET /api/door/files/read`
  - `POST /api/door/files/write`
  - `POST /api/door/files/delete`
  - Phase-based Vault file management for `2-Plan` / `3-Production` / `4-Profit`
  - `phase=potential` is a canonical Hot List wrapper over `hot.py` (not raw markdown-only writes)
  - `phase=plan` reads `2-Plan` plus `War-Stacks`
  - `phase=production` reads only `3-Production`

- `potential.js`
  - Canonical:
    - `GET /api/door/potential/hotlist`
    - `POST /api/door/potential/hotlist`
    - `DELETE /api/door/potential/hotlist/:id`
    - `POST /api/door/potential/hotlist/:id/done`
    - `PUT /api/door/potential/hotlist/:id`
  - Compatibility aliases:
    - `GET /api/door/hotlist`
    - `POST /api/door/hotlist`
    - `DELETE /api/door/hotlist/:id`
    - `POST /api/door/hotlist/:id/done`
    - `PUT /api/door/hotlist/:id`

- `plan.js`
  - Canonical:
    - `GET /api/door/plan/doorwars`
    - `POST /api/door/plan/doorwar`
    - `POST /api/door/plan/quadrant/:id` (manual quadrant + Taskwarrior priority sync)
    - `GET /api/door/plan/warstacks`
    - `POST /api/door/plan/warstack/start`
    - `POST /api/door/plan/warstack/answer`
    - `GET /api/door/plan/warstack/:id`
    - `GET /api/door/plan/warstack/sessions`
    - `GET /api/door/plan/warstack/sessions/:id`
  - Compatibility aliases:
    - `GET /api/door/doorwars`
    - `POST /api/door/doorwar`
    - `POST /api/door/quadrant/:id`
    - `GET /api/door/warstacks`
    - `POST /api/door/warstack/start`
    - `POST /api/door/warstack/answer`
    - `GET /api/door/warstack/:id`
    - `GET /api/door/warstack/sessions`
    - `GET /api/door/warstack/sessions/:id`

- `production.js`
  - Canonical:
    - `GET /api/door/production/hits`
    - `POST /api/door/production/hits/:id/toggle`
    - `GET /api/door/production/hits/week`
  - Compatibility aliases:
    - `GET /api/door/hits`
    - `POST /api/door/hits/:id/toggle`
    - `GET /api/door/hits/week`
  - No War Stack listing here; War Stack belongs to Plan.

- `profit.js`
  - Canonical:
    - `GET /api/door/profit/completed`
    - `POST /api/door/profit/reflection`
    - `GET /api/door/profit/reflections`
  - Compatibility aliases:
    - `GET /api/door/completed`
    - `POST /api/door/reflection`
    - `GET /api/door/reflections`

- `../door.js`
  - Thin composer: registers all phase modules on one router.

## State Files

- Primary: `~/.aos/door-centre-state.json`
- Legacy read fallback: `~/.aos/door-flow.json`

## Frontend Surfaces

- Shared Hub: `/pwa/door/` (`public/pwa/door/index.html`)
- Standalone phase PWAs:
  - `/pwa/potential/`
  - `/pwa/plan/`
  - `/pwa/production/`
  - `/pwa/profit/`
- Compatibility redirects:
  - `/pwa/door/potential/` -> `/pwa/potential/`
  - `/pwa/door/plan/` -> `/pwa/plan/`
  - `/pwa/door/production/` -> `/pwa/production/`
  - `/pwa/door/profit/` -> `/pwa/profit/`

## Invariant

Route paths and payload contracts stay backward-compatible; this is a structure-only refactor.
