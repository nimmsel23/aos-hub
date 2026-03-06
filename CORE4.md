# CORE4 (SSOT)

Last updated: 2026-03-02

This file is the current source of truth for Core4 usage and operations.
Historical notes were moved to `CORE4.legacy.md`.

## 1) What Core4 Is

- 8 habits across 4 domains: `body`, `being`, `balance`, `business`
- Scoring: each done habit = `0.5` points
- Daily max: `4.0` points
- Weekly max: `28.0` points

## 1.1) Taskwarrior Mechanism (What It Actually Does)

Core4 is **ledger‑first** and **multi‑writer**. Nothing is allowed to be a single point of failure.

- **Taskwarrior is the best task backend**, and Core4 uses it when it is available.
- Core4 logging creates **one‑off** TW tasks and immediately marks them **done**.
- **No recurring tasks** are created by Core4 logging.
- These one‑off tasks carry `+core4`, the habit tag (e.g. `+fitness`), and a date tag (`core4_YYYYMMDD`).
- If Taskwarrior is not available, Core4 still logs directly to the ledger (via Bridge or local fallback).

## 2) Usage Categories

### Daily Commands

- `core4`: primary daily frontdoor (dashboard with tracker pass-through)
- `c4`: fast ledger/day status (read-focused)
- `c4d`: explicit shortcut to dashboard behavior
- `wcore4`: weekly view (`task 28` + `core4 -w`)

**Important:** `core4ctl today` reads Taskwarrior (pending due:today).  
If no tasks were created, it will show “No matches.”  
Use `c4` for ledger status or `core4ctl done` for completed TW tasks.

### Domain Workflow

- `c4ctx <body|being|balance|business>`: enters domain context (workspace, journal, links)
- `c4journal [domain] <text...>`: append journal line
- `core4mode`: run domain bundles (2 habits per domain)

### Ops / Admin

- `core4ctl`: compatibility and operations shim (not primary daily UX)
- `core4-trackctl`: build/status/seed/export/prune/finalize commands
- `core4-syncctl`: pull/push Core4 data
- `core4-servicectl`: systemd timer/service operations

## 3) Canonical Paths

### Code

- Repo root: `~/aos-hub`
- Core4 code: `~/aos-hub/core4/python-core4/`
- HQ API/PWA: `~/aos-hub/index-node/`
- Bridge API: `~/aos-hub/bridge/`

### Data

- Canonical vault root: `~/vault`
- Canonical Core4 runtime/data path: `~/.core4`
- Current policy: `~/.core4` is a symlink to `~/vault/.core4`

Flat-first Core4 layout:

- `~/.core4/events/`
- `~/.core4/sealed/`
- `~/.core4/sealed-months/`
- `~/.core4/core4_day_YYYY-MM-DD.json` (derived)
- `~/.core4/core4_week_YYYY-Www.json` (derived)
- `~/.core4/core4_daily.csv` / `core4_scores.csv` (derived)
- `~/.core4/journal/`

Compatibility layer kept for old consumers:

- `~/.core4/.core4/events -> ../events`
- `~/.core4/.core4/sealed -> ../sealed`
- `~/.core4/.core4/sealed-months -> ../sealed-months`

## 4) Data Model Rules

- Source of truth: append-only event ledger (`events/YYYY-MM-DD/*.json`)
- Derived artifacts are rebuildable and overwrite-safe:
  - `core4_day_*`
  - `core4_week_*`
  - CSV exports
- Read commands should not rely on derived files being complete.

Taskwarrior is a **mechanism**, not SSOT:
- Core4 **writes via Taskwarrior** when available.
- The **ledger** is the truth for status and scoring.

## 5) Sync Rules

Core4 sync should include:

- `events/**`
- `sealed/**`
- `sealed-months/**`
- `.core4/**` (legacy compatibility while old clients exist)

Derived day/week/CSV snapshots are local rebuild artifacts.

## 6) APIs (Operational)

### Bridge (`:8080`)

- `POST /bridge/core4/log`
- `GET /bridge/core4/today`
- `GET /bridge/core4/week`

### Index Node (`:8799`)

- `GET /api/core4/day-state`
- `GET /api/core4/week-summary`
- `POST /api/core4/log`
- `GET/POST /api/core4/journal`
- `POST /api/core4/export-week`
- `GET /api/core4/today`

## 7) Systemd (User)

Common units:

- `core4-daily.timer`
- `core4-prune.timer`
- `core4-month-close.timer`
- `core4-seed-week.timer`
- `core4-auto-push.timer`
- `rclone-alpha-core4.service`

## 8) Recommended Day-to-Day Flow

1. Check status: `c4` or `core4 -d`
2. Log habits: `core4 <habit>` or dashboard (`core4`)
3. Weekly check: `wcore4` and `core4 -w`
4. Ops only when needed: `core4ctl status|build|sync-core4|pull-core4`

## 9) Troubleshooting Quick Checks

- `core4ctl status`
- `bridge health` (or `curl http://127.0.0.1:8080/health`)
- `curl http://127.0.0.1:8080/bridge/core4/today`
- `curl http://127.0.0.1:8799/api/core4/today`
- Confirm symlink policy:
  - `readlink -f ~/.core4`
  - expected: `~/vault/.core4`

## 10) TODO (Process)

- After Sunday Tent review (Core4 score), generate weekly CSV from ledger.
- Once weekly CSV is archived, delete that week's daily JSONs (to reduce clutter).
