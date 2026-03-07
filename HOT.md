# HOT

## Changelog

### 2026-03-07

- Fixed live-index drift: `hot sync` now prunes non-promoted `done/deleted` entries from `hotlist_index.json`.
- Unified legacy desktop API path with canonical backend:
  - `GET /api/door/hotlist` now reads from `hot.py` (`mode` supported)
  - `POST /api/door/hotlist` now writes via `hot.py` (same as modern routes)
  - removed extra write path via `flow.hotlist` for these endpoints
- Upgraded desktop `/door` launcher with live backend telemetry:
  - Potential from `/api/door/potential/hotlist?mode=active`
  - Plan from `/api/door/plan/doorwars`
  - Production from `/api/door/production/hits/week`
  - Profit from `/api/door/profit/completed`
- Added a dedicated Door PWA expansion plan in `DOCS/node/door-pwa-roadmap.md`.
- Locked the current direction:
  - `Potential` stays Phase 1 of The Door
  - `Potential` keeps its own standalone install route `/pwa/potential/`
  - `Plan`, `Production`, `Profit` should be built as dedicated PWAs before redesigning the Door Hub
- Added standalone `Plan` PWA routing:
  - canonical install path is now `/pwa/plan/`
  - old `/pwa/door/plan/` path redirects to the standalone route
  - `/door/plan` now redirects to the standalone Plan PWA
- Synced operational docs to the new multi-PWA Door state:
  - standalone routes documented for `Potential`, `Plan`, `Production`, `Profit`
  - `/pwa/door/*` phase paths clarified as compatibility redirects
  - Plan quadrant endpoint (`POST /api/door/plan/quadrant/:id`) documented

### 2026-03-06

- Made `door/python-potential/hot.py` the canonical local Hot List backend instead of a one-way repair helper.
- Added status reconciliation from Taskwarrior into `Door/1-Potential/hotlist_index.json`.
- Synced active Potential entries to `status: active|done|deleted` plus `task_status`, `task_modified`, `completed_at`, `deleted_at`.
- Kept promoted Plan/Production entries stable while still recording their `task_status`.
- Added machine-readable commands to `hot.py`:
  - `hot json [mode]`
  - `hot add --json`
  - `hot sync --json`
  - `hot delete --json <selector>`
  - `hot update --json <selector>`
- Rewired active `index-node` Hot List ingestion to the canonical backend:
  - `GET/POST/DELETE /api/door/hotlist`
  - `PUT /api/door/hotlist/:id`
  - `POST /api/hotlist`
- Rewired `POST /api/door/doorwar` to read active Hot List items from the canonical backend instead of `~/.aos/door-centre-state.json`.
- Rewired `index-node/routes/door/files.js` so `phase=potential` no longer writes/deletes raw markdown directly, but goes through the canonical Hot List backend.
- Aligned `index-node/routes/door/shared.js` with `AOS_VAULT_DIR`, so Node and Python now resolve the same Door vault root.
- Replaced the old `/door/potential` desktop stub with a working non-PWA Hot List page that uses the canonical `/api/door/hotlist` endpoints.
- Replaced the old shared `Potential` PWA shell with a dedicated Hot List app under `/pwa/door/potential/`, including:
  - TickTick-like list/detail layout
  - real `done` endpoint support
  - cached snapshot + offline capture queue
  - `/door/potential` redirect to the dedicated Potential PWA
- Fixed a dedicated `doorctx` redirect loop for `/pwa/door/` and `/pwa/door/potential/`:
  - Express non-strict route matching had redirected canonical slash paths back onto themselves.
  - The HTTPS install URL now resolves cleanly again for phone/Chrome PWA install.
- Split Potential into its own standalone PWA route:
  - canonical install path is now `/pwa/potential/`
  - old `/pwa/door/potential/` paths redirect to the standalone route
  - this avoids install/scope interference with the main Door PWA
- Audited and tightened the GAS HQ Hot List chain:
  - Telegram WebApp submissions now go through `hotlist_addWeb()` instead of a sheet-only bypass.
  - `~/.gas/HQ/hotlist.gs` now records `status`, `phase`, `task_status`, `tw_uuid` and mirrors Taskwarrior status from `task_export.json`.
  - GAS promotion from Potential to Plan now marks the index entry as `promoted` / `phase: plan`.

## Mini Doku

### Canonical local flow

1. Capture enters through one of these paths:
   - `hot "Idea"`
   - `doorctl hotlist add "Idea"`
   - `aos hot add "Idea"`
   - `POST /api/door/hotlist`
   - `POST /api/hotlist`
   - `POST /api/door/files/write` with `phase=potential`
   - `GET /door/potential` (desktop non-PWA page)
2. The backend is `door/python-potential/hot.py`.
3. `hot.py` writes:
   - Taskwarrior task (`project:Potential` + `+hot` + `+potential`)
   - markdown file in `~/vault/Door/1-Potential/`
   - `~/vault/Door/1-Potential/hotlist_index.json`

### Potential file editor behavior

- The Door PWA file editor still uses `/api/door/files/*`, but `phase=potential` is now a canonical wrapper:
  - `read/list` only expose active Hot List entries
  - `write` creates or updates the canonical Hot List entry
  - `delete` maps to `hot delete`, so the entry leaves the active Potential list instead of only unlinking markdown
- `plan` / `production` / `profit` remain plain markdown file management paths on purpose.

### GAS HQ alignment

- `~/.gas/HQ/hotlist.gs` is still a separate Drive-side implementation, but it now mirrors the same basic lifecycle fields as the local backend:
  - `status`
  - `phase`
  - `task_status`
  - `task_modified`
  - `completed_at`
  - `deleted_at`
  - `tw_uuid`
- Telegram WebApp Hot List input no longer bypasses Drive/JSON/Taskwarrior capture.
- GAS Door War promotion updates the Hot List index instead of leaving old Potential entries active forever.

### Architecture assessment

- A separate GAS project just for Potential can make sense for Telegram input, multi-platform reach, and deployment stability, but only if it becomes a thin frontdoor over one canonical backend contract.
- A separate GAS project with its own Hot List data model would increase drift again; that is the wrong split.
- The higher-value next frontend is a tiny Hot List PWA with:
  - local-first capture queue
  - cached active index
  - background flush to canonical `/api/door/hotlist`
  - read-only fallback when offline

### Important status fields in `hotlist_index.json`

- `status`
  - Local lifecycle view for the Hot List entry.
  - Expected values now: `active`, `done`, `deleted`, `promoted`.
- `phase`
  - Usually `potential` for raw Hot List entries.
  - Promoted entries can remain `plan` / `production` / `profit`.
- `task_status`
  - Raw Taskwarrior state mirror, e.g. `pending`, `waiting`, `completed`, `deleted`, `missing`.

### Sync behavior

- `hot sync` now reads Taskwarrior and updates the JSON index.
- If a linked non-promoted Hot List task is completed/deleted, the entry is pruned from the live `hotlist_index.json`.
- If an active Potential entry has no linked task but a pending matching Taskwarrior item exists, the UUID is reattached.
- If an active Potential entry has no linked task and no pending match exists, `hot sync` recreates the task.
- Promoted entries are not downgraded back to Potential; they keep their phase and only get `task_status` updates.

### Useful commands

- `python3 door/python-potential/hot.py json active`
- `python3 door/python-potential/hot.py json all`
- `python3 door/python-potential/hot.py sync --json`
- `python3 door/python-potential/hot.py update --json <selector> --title "..." --content "..."`
- `doorctl hotlist list`
- `doorctl hotlist json all`
- `aos hot add "Idea"`

## Known Gaps

- GAS standalone Door (`door/gas-door-dev/`) still has its own Drive-side flow and was not unified in this pass.
- `~/.gas/HQ/hotlist.gs` is closer to the canonical semantics now, but it is still not a thin wrapper over `hot.py`; there are still two implementations.
- Legacy duplicate Door handlers still exist in `index-node/server.js` for non-HotList Door flows (`doorwar/warstack/profit`), but Hot List GET/POST now use the same canonical backend as router routes.
