# Core4 system (end-to-end) — purpose, parts, and data flow

This document is the "one page mental model" for Core4 in `aos-hub`.
It answers:
- What is the source of truth?
- Which component writes what?
- Which files are derived caches/snapshots?
- How do the portals (terminal / index-node / GAS / telegram) converge?

If you only remember one thing:

1) Truth = append-only event ledger under `.core4/events/**`
2) Everything else (week/day JSON, CSV, Taskwarrior, UI state) is derived or a transport
3) Sync copies only `.core4/**` to avoid Google Drive duplicate-name issues

---

## Vocabulary

- "habit": one of the 8 Core4 habits (fitness, fuel, meditation, memoirs, partner/person1, posterity/person2, discover, declare)
- "event": one JSON file representing one "done" (or correction) for one habit on one day
- "key": stable identity for dedupe: `YYYY-MM-DD:domain:task`
- "ledger": the directory tree containing events (append-only)
- "derived": any snapshot/export rebuilt from events (safe to overwrite)

---

## Storage model (what files mean what)

### Source of truth (append-only ledger)

Local (primary write target):
- `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json`

GDrive mount / pulled copy (written by GAS or pulled from Drive):
- `~/AlphaOS-Vault/Alpha_Core4/.core4/events/YYYY-MM-DD/*.json`

Notes:
- Multiple writers may create events for the same `key`. That is allowed.
- Scoring dedupes by `key` and uses a merge rule (latest/done wins).
- We do not "edit" old events. Corrections are new events.

### Derived artifacts (overwrite-ok; rebuildable anytime)

Written locally (usually into `~/AlphaOS-Vault/Core4/`):
- `core4_day_YYYY-MM-DD.json`
- `core4_week_YYYY-Www.json`
- `core4_daily.csv` (rolling export)
- `core4_YYYY-MM.csv` (month archive)
- `.core4/sealed/**` (optional seals/snapshots)

Notes:
- Derived files are for fast reads by other tools (e.g. index-node scanners).
- They are not safety-critical and should never be treated as the truth.

### Sync rule (critical)

Google Drive can create duplicate names for derived JSON. To avoid this:

- rclone push/pull copies only: `.core4/**`
- derived JSON/CSV is rebuilt locally as needed

---

## Components (what exists and why)

### 1) Core4 CLI (terminal)

Code:
- `python-core4/tracker.py` (the actual implementation)

Binary:
- `core4` (usually a symlink to `python-core4/tracker.py`)

Behavior:
- `core4 <habit>` logs "done" (prefers Bridge; fallback writes to ledger)
- `core4 -d`, `core4 -w` compute score from the ledger (read-only)
- `core4 build` writes derived day/week snapshots (explicit write)

Why:
- fastest capture path on laptop
- supports offline/local-first via ledger fallback

### 2) core4ctl (ops wrapper; modular)

Dispatcher:
- `python-core4/core4ctl`

Sub-tools:
- `python-core4/core4-trackctl` (tracker + Taskwarrior helpers)
- `python-core4/core4-syncctl` (pull/push `.core4/**` only)
- `python-core4/core4-servicectl` (mount + timers)
- `python-core4/core4-clinctl` (install/doctor)
- `python-core4/core4-menuctl` (interactive menu)

Why:
- same pattern as `bridgectl`: keep the entrypoint small and the logic testable/replaceable

### 3) Bridge (local HTTP API; convergence point)

Code:
- `bridge/app.py`

Endpoints:
- `POST /bridge/core4/log` (append event to local ledger; best-effort rebuild; optionally complete TW task)
- `GET  /bridge/core4/today` (compute totals from ledger)
- `POST /bridge/core4/pull` (run `core4ctl pull-core4` to pull `.core4/**` from Drive)

Why:
- lets GAS/Index/CLI converge on one local compute surface
- encapsulates "pull first, then compute locally"

### 4) GAS (cloud; mobile-first)

Code:
- `gas/core4.gs` (logging, Drive storage, sheet append)
- `gas/watchdog.gs` (bridge ping helpers like `bridge_core4Pull`)

Writes:
- event ledger in Drive under: `Alpha_Core4/.core4/events/...`

After each log:
- sends a silent Telegram "proof" message (debug trace)
- pings Bridge `POST /bridge/core4/pull` (throttled) so laptop portals converge

Why:
- mobile UI (Telegram + WebApp)
- Drive is the "cloud buffer" while laptop is offline

### 5) Taskwarrior hook (side effects pipeline)

Code:
- `scripts/taskwarrior/on-modify.alphaos.py`

When a `+core4` task is completed:
- sends a Core4 log to Bridge (`/bridge/core4/log`) (idempotent)
- optionally mirrors to TickTick
- optionally sends Telegram notification

Why:
- lets "task done" act as a transport into the Core4 ledger + side effects
- keeps TickTick/Telegram out of the critical logging path (best-effort)

### 6) index-node (local HQ UI + API)

Code:
- `index-node/server.js`
- `index-node/public/menu.js` (Core4 buttons + "Alpha_Journal" modal)

Behavior:
- Core4 buttons call `/api/core4` which:
  - updates a *local UI cache* (not the truth)
  - forwards the log to Bridge (`/bridge/core4/log`)
- `/api/core4/today` merges:
  - local UI cache totals
  - Bridge totals (ledger truth)

Why:
- quick "click habit" UX with journaling modal
- Bridge totals keep it aligned with the global pipeline

### 7) Router bot (optional shortcuts)

Code:
- `router/extensions/core4_actions.py`

Behavior:
- Telegram shortcuts (e.g. `/fit`) complete a matching Taskwarrior task
- hook handles the rest (Bridge log + side effects)

---

## End-to-end flows (what happens when you log)

### A) Terminal (`core4 fitness`)

Preferred path:
1) `core4` -> `POST /bridge/core4/log`
2) Bridge appends event to local ledger
3) optional: Bridge completes TW task (async)

Fallback path:
1) if Bridge is down, `core4` writes an event directly to the local ledger
2) derived rebuild best-effort (optional)

### B) GAS HQ / Telegram button

1) GAS writes event to Drive ledger (`Alpha_Core4/.core4/events/...`)
2) GAS sends silent Telegram proof
3) GAS pings Bridge `POST /bridge/core4/pull` (throttled)
4) Bridge pulls `.core4/**` into `~/AlphaOS-Vault/Alpha_Core4`
5) local tools recompute scores from merged ledger (Core4 + Alpha_Core4)

---

## Debug / runbook

### Check what the laptop thinks (Bridge)
- `curl http://127.0.0.1:8080/bridge/core4/today`
- `curl -X POST http://127.0.0.1:8080/bridge/core4/pull`

### Check what index-node shows
- `curl "http://127.0.0.1:8799/api/core4/today?debug=1"`

### Check sources on disk (CLI)
- `core4 sources`
- `core4 -d`
- `core4 -w`

### Check Drive consistency (rclone)
- `rclone check ~/AlphaOS-Vault/Core4/.core4 eldanioo:Alpha_Core4/.core4 --one-way`
- `rclone check ~/AlphaOS-Vault/Alpha_Core4/.core4 eldanioo:Alpha_Core4/.core4 --one-way`

---

## Config pointers

Common env:
- `AOS_VAULT_DIR` (defaults to `~/AlphaOS-Vault`)
- `AOS_BRIDGE_URL` (index-node + CLI + scripts)
- `AOS_CORE4_DIRS` (tracker read roots, colon-separated; default: `Core4:Alpha_Core4`)

Bridge:
- `AOS_CORE4_LOCAL_DIR`, `AOS_CORE4_MOUNT_DIR`
- `AOS_CORE4CTL_BIN` (where Bridge finds `core4ctl`)

Index:
- `AOS_BRIDGE_URL` (must be present in the running service env)

---

## Design constraints (why it is like this)

- Multiple writers exist (local, GAS, hooks). Ledger + dedupe is the only safe model.
- Google Drive duplicates derived files by name; syncing only `.core4/**` avoids corruption.
- Side effects (TickTick, Telegram) must never block logging, so they are best-effort.

