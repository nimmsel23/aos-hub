# Core4 — Architecture

This is the source-of-truth “mental model” for the Core4 pillar inside `aos-hub/`.

## What Core4 is

Core4 is a **daily habit scoring pipeline** across 4 domains (BODY/BEING/BALANCE/BUSINESS) with 8 habits total.

## Invariants (do not break)

- **Append-only ledger is the source of truth.** Everything else is derived/rebuildable.
- **Idempotency:** the same completion must not score twice (use stable keys).
- **Derived artifacts are rebuildable:** never treat week/day JSON as authoritative if the ledger exists.
- **Sync only the ledger/metadata**, not rebuildable exports (prevents duplicate-name chaos in Drive).

## Data model

- **Ledger (authoritative):** one JSON file per completion event.
- **Derived artifacts (rebuildable):** day/week JSON summaries (and optional CSV).

Typical locations (vault):
- `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json`
- `~/AlphaOS-Vault/Core4/core4_day_YYYY-MM-DD.json`
- `~/AlphaOS-Vault/Core4/core4_week_YYYY-Www.json`

Exact paths can vary by machine; prefer “find by convention” in code, not hardcoding.

## Writers / Readers

**Writers (create events):**
- Bridge Core4 endpoints (laptop-plane API)
- Local CLI/tracker (`python-core4/`)
- Optional GAS/Core4 centre (cloud-plane capture, then synced down)

**Readers (consume derived summaries):**
- Index Node UI (`index-node/`) for dashboards and status
- TickTick/Taskwarrior sync tooling (if enabled)
- Weekly review workflows (Tent)

## Components in this repo

- `python-core4/` — CLI + tracker + ops (`core4ctl`)
- `bridge/` — Core4 API endpoints that write to the ledger and rebuild derived JSON
- `index-node/` — UI/API that reads summaries and displays status

## Debug / Runbook

```bash
# CLI health
core4ctl doctor
core4ctl today
core4ctl week

# Service health (if bridge is running)
bridgectl health

# Repo health
./hubctl doctor
```

## Where docs live

- Entry: `core4/README.md`
- Commands: `core4/CHEATSHEET.md`
- Changes: `core4/CHANGELOG.md`

