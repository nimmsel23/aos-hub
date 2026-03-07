# DOOR

## Changelog

### 2026-03-07

- Clarified the current PWA routing model in root docs:
  - Shared Door Hub stays on `/pwa/door/`
  - Standalone phase apps are canonical on:
    - `/pwa/potential/`
    - `/pwa/plan/`
    - `/pwa/production/`
    - `/pwa/profit/`
  - `/pwa/door/*` phase paths are compatibility redirects only.

### 2026-03-06

- Removed visible `activate/promote` Door-War flows from `door/cli/doorctl`.
- Reframed Door docs around Chapter 31:
  - `Potential = Hot List`
  - `Plan = Door War + War Stack`
  - `Production = Hit List execution`
  - `Profit = Achieved / Done / review`
- Clarified that the Daily Fire Map is the real daily execution surface; Door remains the strategic layer.
- Added terminal War Stack wizard flow via `doorctl war <door> edit`.
- Kept Profit/Review note opening on `taskopen`.
- Replaced the old `doorctx -> pwactx door` wrapper with a real terminal `doorctx` TUI.
- Made `door` the canonical user frontdoor with short terminal help via `door help` and full root docs via `door docs`.
- Upgraded the dedicated Door PWA from a file-only browser to a usable 4-phase centre:
  - Potential = Hot List capture + active list
  - Plan = Door War selection + War Stack stepper
  - Production = Hit List toggle / execution only
  - Profit = reflection writer + completed/review view
- Split the Door PWA into five installable surfaces:
  - `/pwa/door/`
  - `/pwa/door/potential/`
  - `/pwa/door/plan/`
  - `/pwa/door/production/`
  - `/pwa/door/profit/`
- Added offline fallback for Door PWA GET data via service worker cache + local cached GET responses.
- Added proper Plan read APIs for the PWA:
  - `GET /api/door/plan/doorwars`
  - `GET /api/door/plan/warstacks`
  - `GET /api/door/plan/warstack/sessions`
  - `GET /api/door/plan/warstack/sessions/:id`
- Split the runtime cleanly:
  - `aos-doorctx.service` serves Door directly on `:8786`
  - `:8799` now acts as the HQ gateway/proxy for Door UI + active Door APIs
- Moved active War Stack storage/writes to `Door/War-Stacks`
  - CLI wizard
  - Python War Stack writers
  - Door PWA Plan API
- Migrated the clear historical War Stack markdown out of `Door/3-Production` into `Door/War-Stacks`
  - kept ambiguous non-War-Stack files in `3-Production` untouched

## Mini Doku

### Chapter model

Read these chapters together:

- `26 - Possibilities.md`
- `27 - Door War.md`
- `28 - War Stack.md`
- `29 - Production.md`
- `30 - Profit.md`
- `31 - Door Summary.md`

Chapter 31 is the synthesis:

1. `Potential`
   - Hot List
2. `Plan`
   - Door War + War Stack
3. `Production`
   - Hit List execution
4. `Profit`
   - Achieved / Done / review

### Practical layer

- Door is for larger, longer-running stories.
- Door is not the daily execution board.
- War Stack is a planning artifact.
- The Hit List is the bridge into execution.
- The Daily Fire Map is where daily/weekly execution actually runs.

### Taskwarrior shape

- `project:Potential` is the Taskwarrior backend project for Potential intake.
- `Hot List` remains the methodology name; it does not have to equal the Taskwarrior project string.
- `project:Plan` is the weekly Plan / War Stack container once a Potential item enters Plan.
- `domino_door` is the main Door grouping field in Taskwarrior.
- `project` can stay `Plan`; the Door-level grouping lives on `domino_door`.
- `depends` should express real sequencing constraints.
- Do not force all Door work into fake `hit/strike/bigrock` taxonomies if normal tasks are clearer.

### Current CLI shape

- `door`
  - canonical user-side frontdoor
  - terminal dashboard / TUI
  - short terminal help for the 4 Ps
  - full root docs via `door docs`
- `doorctx`
  - compatibility alias for the user-side frontdoor
  - terminal dashboard / TUI
  - current Door selector
  - Potential / Plan / War Stack / Profit entrypoint
  - also manages the dedicated Door PWA runtime
- `doorctl hot` / `doorctl hotlist`
  - Potential view / Hot List helper
- `doorctl plan`
  - Door War / War Stack view
- `doorctl war <door> edit`
  - terminal War Stack wizard
- `doorctl production`
  - Hit List / execution-facing views
- `doorctl profit`
  - review / completed Door work
- `doorctl`
  - system-side / ops-side CLI
  - reports, diagnostics, compatibility paths, lower-level operations

### PWA surfaces

- Main Door Centre:
  - `/pwa/door/`
- Dedicated phase PWAs:
  - `/pwa/potential/`
  - `/pwa/plan/`
  - `/pwa/production/`
  - `/pwa/profit/`
- Compatibility redirect layer:
  - `/pwa/door/potential/` -> `/pwa/potential/`
  - `/pwa/door/plan/` -> `/pwa/plan/`
  - `/pwa/door/production/` -> `/pwa/production/`
  - `/pwa/door/profit/` -> `/pwa/profit/`
- All five surfaces use the same Door API.
- All five surfaces are offline-capable for static shell assets and cached `GET /api/door/*` reads.

### Runtime topology

- Direct Door Centre runtime:
  - `aos-doorctx.service`
  - `http://127.0.0.1:8786/`
- HQ gateway:
  - `http://127.0.0.1:8799/door/`
  - `http://127.0.0.1:8799/pwa/door/`
- The direct Door runtime owns:
  - Door PWA assets
  - active Door API surface used by the new PWA
- `8799` proxies Door UI/API to `8786` so future Door-only changes only require restarting `aos-doorctx.service`
- Legacy/non-PWA Door endpoints such as `chapters`/`flow`/`export` may still remain local on `8799`

### Canonical Door API shape

- `Potential`
  - `/api/door/potential/hotlist`
- `Plan`
  - `/api/door/plan/doorwar`
  - `/api/door/plan/doorwars`
  - `/api/door/plan/warstacks`
  - `/api/door/plan/warstack/start`
  - `/api/door/plan/warstack/answer`
  - `/api/door/plan/warstack/:id`
  - `/api/door/plan/warstack/sessions`
- `Production`
  - `/api/door/production/hits`
  - `/api/door/production/hits/week`
  - `/api/door/production/hits/:id/toggle`
- `Profit`
  - `/api/door/profit/completed`
  - `/api/door/profit/reflection`
  - `/api/door/profit/reflections`

### Fire handoff

- Door stays strategic.
- War Stack produces the Hit List.
- The Daily Fire Map is the actual day/week execution surface.
- Existing cross-pillar references already document this handoff:
  - `game/README.md`
  - `game/README_HITS_STRIKES.md`

## Known Gaps

- Taskwarrior Plan/report logic is still not fully aligned with the intended `Potential -> Plan` transition.
- Some Door reports still reflect historical backend assumptions rather than the full chapter model.
- `doorctx` now exists as a real user-side TUI, but some UX and terminology still live in `doorctl`.
- `Door/3-Production` still contains historical non-War-Stack material; only the clear War Stack files were migrated to `Door/War-Stacks`.
