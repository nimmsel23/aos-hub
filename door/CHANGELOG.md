# Door — Changelog

## Unreleased

### Changed

- Clarified the canonical 4P mapping:
  - `HotList = Potential`
  - `DoorWar + WarStack = Plan`
  - `Hit List / Fire execution = Production`
  - `Review = Profit`
- Reduced Door's Taskwarrior model to pragmatic backend fields instead of treating Taskwarrior as a full AlphaOS ontology.
- Kept `domain` as a useful global metadata axis for `aos-hub`; stopped treating Door phases as UDA types.

### Fixed

- Reconciled `Door/1-Potential/hotlist_index.json` with Taskwarrior so active Hot List entries are recreated when their linked TW tasks were deleted.
- Restored live `task hotlist` visibility from the Hot List index instead of silently showing an empty Potential list.

### Added

- Added terminal War Stack wizard at `python-warstack/warstack_terminal.py`.
- Switched `doorctl war <door> edit` from raw editor opening to the interactive Chapter-28-style wizard.
- Routed door-scoped War Stack opening through the terminal wizard while keeping Profit/Review note opening on `taskopen`.
- Updated War Stack draft generation to use `Title` separately from `Domino Door` and to emit a fuller Chapter-28 structure.
- Replaced the old `doorctx` passthrough wrapper with a real terminal `doorctx` dashboard/TUI for user-side Door work and PWA runtime control.
- Made `door` the preferred user frontdoor and wired `door help|docs` to the root `DOOR.md`.
- Turned the dedicated Door PWA into a usable centre instead of a file-only editor:
  - Potential Hot List capture/list/delete
  - Plan Door War selection + conversational War Stack stepper
  - Production weekly Hit List toggle / execution only
  - Profit reflection writer + completed/reflection views
- Added four dedicated installable phase PWAs on top of the main Door Centre:
  - `/pwa/door/potential/`
  - `/pwa/door/plan/`
  - `/pwa/door/production/`
  - `/pwa/door/profit/`
- Added offline support for the Door PWA surfaces:
  - scope-aware service worker for root and phase sub-PWAs
  - cached static shell assets
  - cached `GET /api/door/*` responses for offline reopen
  - local cached GET fallback in the shared frontend app
- Added proper Plan read endpoints:
  - `GET /api/door/plan/doorwars`
  - `GET /api/door/plan/warstacks`
  - `GET /api/door/plan/warstack/sessions`
  - `GET /api/door/plan/warstack/sessions/:id`
- Updated the Plan PWA/Centre to show:
  - recent Door Wars
  - active War Stack sessions
  - resume controls for in-flight War Stack inquiries
- Reshaped Door APIs around the 4 Ps:
  - Potential -> `/api/door/potential/*`
  - Plan -> `/api/door/plan/*`
  - Production -> `/api/door/production/*`
  - Profit -> `/api/door/profit/*`
- Moved War Stack listing/file visibility fully into Plan; Production now exposes only the Hit List layer.
- Introduced a dedicated Door runtime:
  - `aos-doorctx.service` on `:8786`
  - `:8799` now proxies Door UI + active Door API traffic to that runtime
- Moved active War Stack writes to `Door/War-Stacks`:
  - `doorctl`
  - `door-taskopen`
  - terminal/python War Stack writers
  - Door PWA Plan API (`writeWarStackMarkdown`)
- Migrated the clear historical War Stack markdown corpus from `Door/3-Production` to `Door/War-Stacks`
  - left ambiguous non-War-Stack files in `3-Production` unchanged by design

### Documentation

- Updated `README.md`, `ARCHITECTURE.md`, and `AGENTS.md` to reflect:
  - the 4P mapping above
  - large Door handling via `domino_door` + `project` + `depends`
  - terminal wizard flow for Production
  - `taskopen` remaining relevant for Profit
  - Chapter 31 framing: Plan = Door War + War Stack, Production = Hit List execution, Fire Map = daily execution surface
  - `doorctx` as user-side frontdoor and `doorctl` as system-side CLI

### Taskwarrior Model

- Active Door runtime now treats:
  - `project:Potential` as Hot List / Potential
  - `project:Plan` as the weekly Plan / War Stack container
  - `domino_door` as the canonical Door grouping UDA
- `door_name` is no longer the active Door field in the main runtime path.

### Removed

- Removed `activate/promote` from visible `doorctl` Door-War menus and help text. Door War is no longer presented as a primary transition command.

### Known Gap

- The intended `Potential -> Plan` promotion rule is now clarified:
  - Potential lives in `project:Potential`
  - once selected into Plan, the task's `project` becomes `Plan`
  - `domino_door` carries the actual strategic Door target
- `Door/3-Production` still contains historical non-War-Stack material; only the clear War Stack files were migrated.
