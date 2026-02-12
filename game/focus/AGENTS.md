# Focus Component Guidelines

## Purpose
- Focus is the monthly (or quarterly) mission: it shrinks the journey from Freedom into actionable steps.
- Focus Map is not a to-do list; it is the foundation layer that Fire executes weekly.

## Key Entry Points
- Index Node Focus Centre UI: `index-node/server.js` (`/game/focus` → `/public/game/focus.html`)
- Index Node Focus API: `index-node/server.js`
  - `GET /api/game/focus/state` (draft autosave per domain)
  - `POST /api/game/focus/state`
  - `GET /api/game/focus/list`
  - `GET /api/game/focus/load`
  - `POST /api/game/export` (writes markdown to vault)
- GAS fallback: `gas/game_focus.gs` (`/focus`, `/focusweb`)

## Storage Conventions
- Focus maps are written to the vault: `~/AlphaOS-Vault/Game/Focus/`
- Draft state lives next to the maps: `~/AlphaOS-Vault/Game/Focus/.focus-state.json`

## Conventions
- Keep Focus filenames stable because Fire Maps reference them via YAML `focus_maps:` (cascade queries).
- Prefer YAML front matter for machine-readable metadata (phase, month, domain).
- Keep router triggers thin; Focus is primarily UI + vault storage + YAML semantics.

## Quick Debug Commands
- Health: `curl -s http://127.0.0.1:8799/health`
- Focus UI: `xdg-open http://127.0.0.1:8799/game/focus` (or paste in browser)
- Draft state: `curl -s http://127.0.0.1:8799/api/game/focus/state | jq .`
- List maps (BODY/current): `curl -s "http://127.0.0.1:8799/api/game/focus/list?domain=BODY&month=current" | jq .`
