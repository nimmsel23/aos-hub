# Door — Architecture

This is the source-of-truth “mental model” for the Door pillar inside `aos-hub/`.

## What Door is

Door is the **weekly tactics system** that turns idea abundance into execution:

**Potential → Plan → Production → Profit**

## Invariants (do not break)

- **One source of truth for parsing/phase logic:** `door/lib/*` (used by CLI + API).
- **Stateless handlers:** callers pass inputs; libs return structured output (JSON or plain values).
- **No hardcoded centre URLs:** Index Node routes are defined in `index-node/menu.yaml`.
- **Safe writes:** never overwrite non-rebuildable user content; derived views must be rebuildable.

## Data model (current)

Door is primarily driven by Taskwarrior:

- **Potential** lives in `project:HotList`.
- **Plan / Door War** lives on the Hot List task via built-in `priority` (`prio:H/M/L`).
- **Production / War Stack** uses door-scoped tasks plus `taskopen` to reach `Door/3-Production`.
- **Profit** uses `taskopen` to reach `Door/4-Profit` from `+profit` tasks or completed door work.
- `door_name` is the primary linkage UDA for Door-related tasks.

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

# Index-side
curl http://127.0.0.1:8799/health
curl http://127.0.0.1:8799/api/door/health
```

## Where docs live

- Entry: `door/README.md`
- Commands: `door/CHEATSHEET.md`
- Changes: `door/CHANGELOG.md`
