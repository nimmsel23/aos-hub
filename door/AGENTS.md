# door/ - Door Management Component

This file is the **operational SSOT** for how The Door works in this repo.

## Repo Topology
- `door/` is maintained as an `aos-hub` subtree and published via `gitctl split push` from the `aos-hub` repo root.

## SSOT: Chapters (Blueprint-First)
- Use the chapter files in `door/` as the source of truth for behavior.
- Relevant chapters (local symlinks in `door/`):
  - `25 - Door.md`
  - `26 - Possibilities.md` (Hot List)
  - `27 - Door War.md` (H/M/L / Eisenhower)
  - `28 - War Stack.md`
  - `29 - Production.md`
  - `30 - Profit.md`
  - `31 - Door Summary.md`
- When behavior changes, map it into the canonical code paths below.

## Canonical Code Paths
- Logic: `door/lib/*`
- CLI: `door/cli/doorctl`
- API: `door/api/*` (Index Node only, no business logic)

## Chapter Mapping
- `26 - Possibilities.md` → Hot List / Potential
- `27 - Door War.md` → Door War / Plan
- `28 - War Stack.md` → War Stack
- `29 - Production.md` → Production
- `30 - Profit.md` → Profit / Review

## Canonical Storage (Vault Root = `~/vault` unless `AOS_VAULT_DIR`)
- `Door/1-Potential/`
  - Hot List items (MD per entry)
  - `hotlist_index.json` (Hot List index)
- `Door/2-Plan/`
  - Door War / H/M/L artifacts
- `Door/War-Stacks/`
  - War Stack artifacts (`STACK_*.md` and legacy markdown war stacks)
- `Door/3-Production/`
  - Production / execution-facing artifacts
- `Door/4-Profit/`
  - Review / Profit summaries

## Active Door State (System-wide)
- File: `~/.aos/door.current`
- Set via: `doorctl current <door>`
- Used by: fish greeting + prompt

## Current Implementations (Reality Check)
- Hot List creation:
  - `door/python-potential/hot.py` writes:
    - `Door/1-Potential/<uuid>-<slug>.md`
    - `Door/1-Potential/hotlist_index.json`
- Door / current state:
  - `doorctl current <door>` writes `~/.aos/door.current`
- War Stack:
  - Stored in `Door/War-Stacks` as `STACK_*.md`
  - Built/edited through the terminal wizard (`doorctl war <door> edit`)
  - **Do not change War Stack formats unless explicitly requested.**
- Runtime:
  - `aos-doorctx.service` serves Door directly on `:8786`
  - HQ `:8799` proxies `/door`, `/pwa/door/*`, and active `/api/door/*` traffic to that runtime

## CLI Reference (doorctl)
- `doorctl hot` / `doorctl hotlist` → Hot List
- `doorctl doorwar` / `doorctl plan` → Door War
- `doorctl war` / `doorctl warstack` → War Stack / terminal wizard
- `doorctl review` / `doorctl profit` → Review/Profit
- `doorctl current <door>` → Active Door

## Environment
- `AOS_VAULT_DIR=~/vault`
- `AOS_DOOR_STALLED_DAYS=7`
- `AOS_DOOR_ATTENTION_DAYS=3`
- `AOS_DOOR_CURRENT_FILE=~/.aos/door.current`

## Testing (Smoke)
```bash
# CLI
./door/cli/doorctl list
./door/cli/doorctl doorwar list
./door/cli/doorctl current

# API (Index Node)
curl http://127.0.0.1:8799/api/door/plan/doorwars | jq
curl http://127.0.0.1:8799/api/door/files?phase=plan | jq
```

## Non-Negotiables
- Do not duplicate business logic between CLI and API.
- No hardcoded paths (use env vars / vault root).
- **War Stack formats are off-limits** unless explicitly requested.
