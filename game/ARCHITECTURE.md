# Game — Architecture

This is the source-of-truth “mental model” for THE GAME inside `aos-hub/`.

## What Game is

Game is the **fact-map cascade system** that links vision → execution:

**Frame → Freedom → Focus → Fire → Tent**

Each level exists per domain (BODY/BEING/BALANCE/BUSINESS) and **feeds** the next.

## Invariants (do not break)

- **Cascade rule:** parent changes require reviewing/updating children (no silent divergence).
- **Export semantics:** “locked/manifested” status must be preserved; never overwrite locked maps.
- **Cross-centre wiring stays consistent:** map filenames/keys used in one centre must match others.
- **Menu SSOT:** do not hardcode centre URLs; use `index-node/menu.yaml`.

## Repo layout (target)

`game/` is the container for sub-centres:

- `game/frame/`
- `game/freedom/`
- `game/focus/`
- `game/fire/`
- `game/tent/`

Implementation currently lives across `index-node/`, scripts, and map-specific tools; the goal is to converge on real dirs under `game/` (not shortcut symlinks).

## Components in this repo

- `index-node/public/game/*` — the UI pages
- `index-node/server.js` + `index-node/routes/*` — APIs and exports
- `game/python-firemap/` — Fire map bot tooling
- `game/python-tent-bot/` — Tent bot tooling

## Debug / Runbook

```bash
# Index health
curl http://127.0.0.1:8799/health

# Menu sanity
curl http://127.0.0.1:8799/api/centres
```

## Where docs live

- Entry: `game/README.md`
- Commands: `game/CHEATSHEET.md`
- Changes: `game/CHANGELOG.md`
