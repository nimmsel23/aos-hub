# Door — Architecture

This is the source-of-truth “mental model” for the Door pillar inside `aos-hub/`.

## What Door is

Door is the **strategic system** for larger stories and commitments:

**Potential → Plan → Production → Profit**

## Invariants (do not break)

- **One source of truth for parsing/phase logic:** `door/lib/*` (used by CLI + API).
- **Stateless handlers:** callers pass inputs; libs return structured output (JSON or plain values).
- **No hardcoded centre URLs:** Index Node routes are defined in `index-node/menu.yaml`.
- **Safe writes:** never overwrite non-rebuildable user content; derived views must be rebuildable.

## Chapter model

- **Potential** = Hot List
- **Plan** = Door War + War Stack
- **Production** = Hit List execution
- **Profit** = Achieved / Done / review

Operationally:
- Door is the strategic layer.
- The Daily Fire Map is the daily execution surface.
- War Stack informs the Hit List; Fire carries day/week execution.
- `door` is the canonical user-side frontdoor / dashboard.
- `doorctx` is the compatibility alias for that user-side frontdoor.
- `doorctl` is the lower-level/system-side CLI.
- `aos-doorctx.service` owns the dedicated Door runtime on `:8786`.
- HQ on `:8799` proxies Door UI/API to that runtime.

## Components in this repo

- `door/lib/` — parsing, phase detection, health checks, formatting
- `door/cli/doorctl` — terminal UI
- `door/api/` — Node wrappers for Index Node
- `index-node/` — UI that calls `/api/door/*`

## Debug / Runbook

```bash
doorctl list
doorctl health
doorctl show <DoorName>

# Index-side / gateway
curl http://127.0.0.1:8799/health
curl http://127.0.0.1:8799/api/door/plan/doorwars

# Direct Door runtime
curl http://127.0.0.1:8786/health
curl http://127.0.0.1:8786/api/door/plan/doorwars
```

## Where docs live

- Entry: `door/README.md`
- Commands: `door/CHEATSHEET.md`
- Changes: `door/CHANGELOG.md`
