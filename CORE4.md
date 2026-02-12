# Core4 Pipeline — 28-or-Die System

**Pillar:** THE CORE (αOS Pillar #2)
**Goal:** Daily investment in all 4 Domains (BODY/BEING/BALANCE/BUSINESS)
**Mechanics:** 8 habits × 7 days = 56 tasks/week. Each done = 0.5 points. 28+ points = week won.

See also: `DOCS/CORE4_SYSTEM.md` (end-to-end mental model, all components + data flow).

## Architecture

**Source of Truth:** append-only event ledger (one file per habit per day)
**Location (local):**
- `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json` (primary write target)
- `~/AlphaOS-Vault/Alpha_Core4/.core4/events/...` (pulled/mounted from GDrive)

**Derived artifacts (rebuildable):**
- `core4_day_YYYY-MM-DD.json`
- `core4_week_YYYY-Www.json`
- `core4_daily.csv` / `core4_scores.csv`

**Sync rule (important):** we only sync `.core4/**` (ledger + sealed). Derived JSON/CSV is rebuilt locally to avoid Google Drive duplicate-name chaos.

**Secondary systems:**
- Taskwarrior (terminal view, tracking)
- TickTick (mobile mirror, leech)
- CSV exports (weekly summaries)

## The 8 Habits

| Habit | Domain | Tag | Display | TW Project |
|-------|--------|-----|---------|------------|
| fitness | BODY | `+fitness` | Fitness | `project:body` |
| fuel | BODY | `+fuel` | Fuel | `project:body` |
| meditation | BEING | `+meditation` | Meditation | `project:being` |
| memoirs | BEING | `+memoirs` | Memoirs | `project:being` |
| partner | BALANCE | `+partner` | Partner (person1) | `project:balance` |
| posterity | BALANCE | `+posterity` | Posterity (person2) | `project:balance` |
| discover | BUSINESS | `+discover` | Discover | `project:business` |
| declare | BUSINESS | `+declare` | Declare | `project:business` |

**Notes:**
- Bridge canonicalizes `partner→person1`, `posterity→person2` internally for JSON events
- Tasks use `project:{domain}` (4 projects) instead of `project:{habit}` (8 projects)
- All Core4 tasks have `+core4` tag for easy filtering
- Weekly tasks also get `+wXX` tag (e.g., `+w06` for week 6)

---

## Task Creation & Seeding

### seed_week.py (Standalone Script)

**Location:** `python-core4/seed_week.py`
**Purpose:** Creates 56 Taskwarrior tasks (8 habits × 7 days) for the current ISO week

**Task Properties:**
```bash
task add "Fitness — 2026-02-06" \
  project:body \
  due:2026-02-06 \
  +fitness \
  +core4 \
  +w06 \
  priority:H
```

**Configuration:**
- Central config: `python-core4/core4_task_config.yaml`
- Per-habit configs: `python-core4/habits/{habit}.yaml` (8 files)

**Features:**
- **Idempotent:** Checks for existing tasks before creating (any task with `+{habit} due:{date}`)
- **Day-of-week overrides:** Per-habit schedules (e.g., Monday: Upper Body, Wednesday: Lower Body)
- **Descriptions as annotations:** If habit config has description, adds as TW annotation

**Usage:**
```bash
python3 seed_week.py                 # Seed this week
python3 seed_week.py --dry-run       # Preview without creating
python3 seed_week.py --force         # Skip idempotency check
python3 seed_week.py --date 2026-02-10  # Seed specific week
```

**Via wrapper:**
```bash
core4ctl seed-week                   # Delegates to seed_week.py
core4ctl seed-week --dry-run         # Preview
```

**Systemd timer:**
```bash
# Installed via: core4ctl install-timers
systemctl --user status core4-seed-week.timer
# Runs every Monday 06:00
```

### Configuration Files

**core4_task_config.yaml** (Central):
```yaml
defaults:
  points_per_habit: 0.5
  task_title_template: "{display} — {date}"
  priority: "H"
  core4_tag: true
  week_tag: true

habits:
  - id: fitness
    display: Fitness
    domain: body
    tw_tag: fitness
    tw_project: body
  # ... (8 total)
```

**habits/fitness.yaml** (Per-Habit Schedule):
```yaml
default:
  title: "Fitness — {date}"
  description: ""

schedule:
  monday:
    title: "Upper Body — {date}"
    description: "Bench Press 3×8, Rows 3×10, Shoulders 3×12"

  wednesday:
    title: "Lower Body — {date}"
    description: "Squats 3×8, Deadlifts 3×6, Lunges 3×12"

  friday:
    title: "Full Body — {date}"
    description: "Compound lifts, functional movements"
```

**Available placeholders:**
- `{display}` - Habit display name (from config)
- `{date}` - ISO date (YYYY-MM-DD)
- `{domain}` - Domain name (body/being/balance/business)

**Other habit configs:**
- `habits/declare.yaml` - Monday: "Weekly Strike", Friday: "Weekly Review"
- `habits/discover.yaml` - Sunday: "Deep Learning"
- `habits/fuel.yaml`, `habits/meditation.yaml`, etc. (default titles only)

---

## Bash Aliases (Terminal Shortcuts)

**Location:** `~/.config/bash/core4-aliases`
**Sourced in:** `~/.bashrc`

**Main Entry Points:**
```bash
core4                      # Interactive menu (fzf/gum)
c4                         # Short form
core4ctl                   # Wrapper with systemd/sync integration
c4ctl                      # Short form
```

**Quick Logging:**
```bash
c4log                      # Interactive habit picker
c4fit                      # Log fitness (skip journal)
c4fuel                     # Log fuel
c4med                      # Log meditation
c4mem                      # Log memoirs
c4par                      # Log partner
c4pos                      # Log posterity
c4dis                      # Log discover
c4dec                      # Log declare
```

**Status & Scores:**
```bash
c4status                   # Today's score
c4score                    # Week's score
c4day                      # Alias for status
c4week                     # Alias for score
```

**Task Lists:**
```bash
c4ls                       # All Core4 tasks
c4today                    # Due today
c4thisweek                 # This week
c4done                     # Completed
c4pending                  # Pending
c4overdue                  # Overdue
```

**Filter by Domain:**
```bash
c4body                     # Body domain
c4being                    # Being domain
c4balance                  # Balance domain
c4business                 # Business domain
```

**Filter by Habit:**
```bash
c4fitness                  # Fitness tasks
c4fueltask                 # Fuel tasks (avoids clash with c4fuel log)
c4meditation               # Meditation tasks
c4memoirs                  # Memoirs tasks
c4partner                  # Partner tasks
c4posterity                # Posterity tasks
c4discover                 # Discover tasks
c4declare                  # Declare tasks
```

**Seeding:**
```bash
c4seed                     # Seed this week (via core4ctl)
c4seed-dry                 # Preview without creating
c4seed-force               # Force reseed (skip idempotency)
```

**Sync & Export:**
```bash
c4sync                     # Full sync (vaultctl copy → Drive)
c4push                     # Push Core4 only (rclone)
c4pull                     # Pull Core4 only (rclone)
c4build                    # Rebuild day/week artifacts
c4export                   # Rolling 56-day CSV
```

**Stats & Summaries:**
```bash
c4stats                    # Week statistics (function)
c4summary                  # Compact summary
c4burndown                 # Remaining today
c4next                     # Next pending task
```

**Help:**
```bash
c4help                     # Show all commands
```

**Bash completion:** Available for `c4` and `c4ctl` commands.

---

## Components

### 1. **tracker.py** (CLI + JSON builder)

**Location:** `python-core4/tracker.py`
**Binary:** `~/bin/core4` (symlink)
**Wrapper:** `python-core4/core4ctl` (bash)

**Key Functions:**
- `run_habit_flow(habit, date)` — Logs a single habit: `task_add` + `task_done` + Bridge notify
- `load_week(day)` / `load_day(day)` — Reads JSON events for display
- `score_mode()` — Show today/week scores

**Data writes:**
- Default: calls `bridge_core4_log()` (POST to Bridge).
- Fallback: if Bridge is unreachable, writes directly to the local `.core4/events` ledger and rebuilds day/week.

**Note:** Task seeding (56 tasks/week) has been moved to standalone `seed_week.py` script. See "Task Creation & Seeding" section above.

**Commands:**
```bash
core4                           # Interactive menu (fzf/gum)
core4 fitness                   # Log fitness for today
core4 fitness done              # Same, skip journal
core4 fitness -1d               # Log for yesterday
core4 -w                        # Week score
core4 -d                        # Day score
core4 export-daily --days=56    # Regenerate rolling CSV
core4 finalize-week 2026-W05    # Seal week CSV (idempotent)
```

**Wrapper (core4ctl):**
```bash
core4ctl status                 # Quick overview
core4ctl menu                   # Gum menu
core4ctl sync                   # Push to Drive (via vaultctl)
core4ctl seed-week              # Delegates to seed_week.py (not tracker.py)
core4ctl list                   # Alias for: task +core4
core4ctl today                  # Alias for: task +core4 due:today
core4ctl week                   # Alias for: task +core4 due:thisweek
core4ctl done                   # Alias for: task +core4 status:completed
```

---

### 2. **Bridge** (Local API server)

**Location:** `bridge/app.py`
**Port:** 8080
**Control:** `bridge/bridgectl`

**Endpoints:**

#### `POST /bridge/core4/log`
Writes a Core4 event to the local `.core4/events` ledger (idempotent merge-by-key) and (optionally) completes the matching Taskwarrior task.

**Payload:**
```json
{
  "task": "fitness",           // habit name (canonical: person1/person2)
  "domain": "body",            // optional (inferred if missing)
  "source": "gas-core4",       // tracker/gas-core4/manual/etc (arbitrary string, for debugging)
  "done": true                 // default true
}
```

**Flow:**
1. Canonicalize task (`partner→person1`, `posterity→person2`)
2. Infer domain if missing
3. Write JSON event to `~/AlphaOS-Vault/Core4/.core4/events/...` (derived day/week JSON is rebuildable)
4. Fire-and-forget: find pending TW task + mark done
   - Live query: `task +{habit} due:{date} status:pending uuids`
   - Execute: `task {uuid} done`
   - On-modify hook fires → TickTick push + Telegram notify

#### `GET /bridge/core4/today`
Returns today's habit completion status.

**Response:**
```json
{
  "ok": true,
  "week": "2026-W06",
  "date": "2026-02-06",
  "total": 3.5,
  "habits": {
    "fitness": true,
    "meditation": true,
    "partner": true
  }
}
```

**Note:** `habits` dict only includes DONE habits. Missing keys = not done.

#### Other endpoints:
- `GET /bridge/core4/week?week=2026-W06` — Full week data
- `POST /bridge/core4/pull` — Pull `.core4/**` from GDrive into `~/AlphaOS-Vault/Alpha_Core4`, then rebuild locally

**Key Internals:**
- `_core4_canon_task(task)` — Normalizes habit names
- `_core4_infer_domain(domain, task)` — Maps habit → domain
- `_CORE4_TW_TAG` — Reverse mapping: `person1→partner`, `person2→posterity`
- `_find_pending_core4_uuid(habit_tag, date_key)` — Live TW query for UUID
- `_complete_core4_tw_task(habit_tag, date_key)` — Find + done wrapper (async)

---

### 3. **on-modify Hook** (Taskwarrior)

**Location:** `scripts/taskwarrior/on-modify.alphaos.py`
**Trigger:** Every TW task modification (including `task done`)

**Detection:**
```python
if habit:  # detect_habit(tags) finds one of 8 habit tags
    if status == "completed":
        send_core4_log(...)         # → Bridge (idempotent if already logged)
        send_ticktick_done(...)     # → TickTick create+close (direct API)
        send_tele_text(...)         # → Telegram notification (optional)
```

**Functions:**
- `detect_habit(tags)` — Returns habit name if any of 8 tags present
- `send_core4_log(payload)` — POST to Bridge `/bridge/core4/log`
- `send_ticktick_done(domain, habit, tags)` — TickTick API: create task + close immediately
- `send_tele_text(msg)` — Telegram via `tele` CLI (if `AOS_HOOK_CORE4_TELE_DONE=1`)

**TickTick Behavior:**
- Creates task with title `"{Domain}: {Habit}"` (e.g., `"Body: Fitness"`)
- Tags: `[domain, habit]` (no `core4` tag anymore)
- Content: date string
- Immediately closes it (status=completed)
- Fire-and-forget: errors swallowed, never blocks hook

**Env vars:**
- `AOS_CORE4_LOG=1` — Enable Bridge logging (default on)
- `AOS_CORE4_TICKTICK=1` — Enable TickTick push (default on)
- `AOS_HOOK_CORE4_TELE_DONE=1` — Enable Telegram done notifications (default off)
- `AOS_CORE4_POINTS=0.5` — Points per habit (default 0.5)

---

### 4. **GAS Core4 Centre** (Mobile UI)

**Location:** `gas/core4.gs` (single GAS project)
**Platform:** Google Apps Script (cloud)
**Interface:** Telegram bot (polling)

**Setup:**
1. Deploy as webapp (or just script with triggers)
2. Set Script Properties:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `BRIDGE_URL` (e.g., `http://100.76.x.x:8080` via Tailscale)
3. Add time-driven trigger: `pollUpdates` every 1 minute

**Commands:**
- `/c4` or `/core4` — Show habit grid with inline buttons

**Habit Grid:**
```
[ ] fitness    [ ] fuel
[✓] meditation [ ] memoirs
[✓] partner    [ ] posterity
[ ] discover   [ ] declare
```

**Flow:**
1. User sends `/c4`
2. GAS calls `pullToday()` → `GET Bridge/core4/today` → `{habits: {meditation:true, partner:true}}`
3. Builds inline keyboard (✓ for done, plain for pending)
4. User taps `[ ] fitness`
5. `handleCallback` → `logHabit("fitness")` → `POST Bridge/core4/log {task:"fitness"}`
6. Bridge writes event + completes TW task (async)
7. GAS refreshes grid → `[✓] fitness`

**Debug proofs (recommended):**
- For Core4 logging (and other important GAS writes), send a silent Telegram message per log so you have an external trace even if Drive/UI state lags.
- After each Core4 log, GAS should ping `POST /bridge/core4/pull` (throttled) so local portals converge quickly.

**Offline Behavior:**
- If Bridge unreachable: all habits show `[ ]` (state is null)
- Tapping a button shows `⚠ offline / error`
- Grid doesn't refresh

---

### 5. **Router Bot** (Optional)

**Location:** `router/extensions/core4_actions.py`
**Platform:** Python aiogram (local bot)

**Commands:**
- `/fit`, `/fue`, `/med`, `/mem`, `/par`, `/pos`, `/dis`, `/dec`
- Each maps to a habit tag

**Flow:**
1. User sends `/fit`
2. Extension searches TW: `task +fitness due:today status:pending export`
3. Marks first matching task done: `task {uuid} done`
4. On-modify hook fires (same as above)

**Config:** `router/config.yaml`
```yaml
extensions:
  - core4_actions
core4_actions:
  tags:
    fit: fitness
    fue: fuel
    # ...
```

**Note:** This is redundant with GAS Core4 Centre. Use one or the other.

---

## Data Flow

### Logging Flow (any source)

```
┌─────────────┐
│ User Action │  (terminal, GAS, router bot)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Taskwarrior     │  task {uuid} done  OR  POST /bridge/core4/log
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│ on-modify Hook                                  │
│   - detect_habit(tags) → fitness/fuel/etc       │
│   - send_core4_log → Bridge (idempotent)        │
│   - send_ticktick_done → TickTick (create+close)│
│   - send_tele_text → Telegram notification      │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│ Bridge           │
│ /bridge/core4/log│
└──────┬───────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Event ledger append (SoT)          │
│ ~/AlphaOS-Vault/*Core4/.core4/     │
│   events/YYYY-MM-DD/*.json         │
└────────────────────────────────────┘
```

**Key insight:** The *ledger* is the truth. Week/day JSON is just a derived snapshot rebuilt from the ledger. This makes multi-writer setups (GAS + local + hooks) safe.

### GAS-specific Flow

```
GAS /c4 command
  │
  ▼
GET /bridge/core4/today
  │
  ▼
{habits: {fitness:true, ...}}
  │
  ▼
Show grid with inline buttons
  │
  ▼
User taps "fitness"
  │
  ▼
POST /bridge/core4/log {task:"fitness"}
  │
  ▼
Bridge: write event + create_task(complete_tw_task)
  │
  ├──▶ JSON event written
  └──▶ task +fitness due:today done  (async)
         │
         ▼
       on-modify hook fires
         ├──▶ TickTick push
         └──▶ Telegram notify
```

---

## File Locations

### Code
- `python-core4/tracker.py` — CLI + JSON logic
- `python-core4/core4ctl` — Thin dispatcher (modular core4ctl)
- `python-core4/core4-trackctl` — Tracker wrappers + Taskwarrior helpers
- `python-core4/core4-syncctl` — Pull/push (ledger only: `.core4/**`)
- `bridge/app.py` — Lines ~474–1400 (Core4 handlers)
- `scripts/taskwarrior/on-modify.alphaos.py` — Lines ~419–460 (Core4 detection + push)
- `gas/core4.gs` — GAS Core4 centre (single GAS project)
- `router/extensions/core4_actions.py` — Optional router shortcuts

### Data (~/AlphaOS-Vault/)
- `Core4/.core4/events/YYYY-MM-DD/*.json` — Event ledger (SoT, append-only)
- `Alpha_Core4/.core4/events/...` — Event ledger (GDrive mount, pulled)
- `Core4/core4_week_YYYY-Wxx.json` — Derived week snapshot (rebuildable)
- `Core4/core4_day_YYYY-MM-DD.json` — Derived day snapshot (rebuildable)
- `Core4/core4_daily.csv` — Rolling 56-day export
- `Core4/core4_YYYY-MM.csv` — Monthly sealed exports
- `.alphaos/task_export.json` — TW export (used by other systems, NOT by Core4 pipeline)

### Binaries
- `~/bin/core4` → `~/aos-hub/python-core4/tracker.py`
- `~/aos-hub/python-core4/core4ctl` (bash wrapper)
- `~/aos-hub/bridge/bridgectl` (bridge control)

---

## Common Operations

### Weekly Setup
```bash
core4ctl seed-week              # Creates 56 TW tasks for this week
# Or via systemd timer (if configured)
```

### Daily Logging (Terminal)
```bash
core4                           # Interactive menu
core4 fitness                   # Direct log
core4 fitness done              # Skip journal prompt
```

### Daily Logging (Mobile)
1. Open Telegram
2. Send `/c4` to GAS bot
3. Tap habit buttons

### Check Status
```bash
core4 -d                        # Today's score
core4 -w                        # Week's score
core4ctl status                 # Full overview
```

### Export & Archive
```bash
core4 export-daily --days=56    # Regenerate rolling CSV
core4 finalize-week 2026-W05    # Seal week (CSV snapshot)
core4ctl sync                   # Push to Drive
```

### Explicit rebuild of derived JSON (write)
```bash
core4 build                     # rebuild day+week snapshot files (from ledger)
core4ctl build                  # same (wrapper)
```

---

## Troubleshooting

### "No pending task found" when logging via GAS
- Check: `task +fitness due:today status:pending` — does a task exist?
- If not: run `core4ctl seed-week` to create tasks
- Check date: Bridge uses Europe/Vienna timezone by default

### TickTick not updating
- Check env: `AOS_CORE4_TICKTICK=1` in `~/.config/alpha-os/hooks.env`
- Check token: `TICKTICK_TOKEN` in `~/.alpha_os/tick.env`
- Test hook: `task add test +fitness due:today && task +fitness done`
- Watch logs: hook errors are silent (fire-and-forget)

### GAS shows all habits as "not done"
- Check Bridge: `curl http://{BRIDGE_URL}:8080/bridge/core4/today`
- If offline: GAS shows `[ ]` for everything (state=null fallback)
- Check Tailscale: is laptop reachable on 100.76.x.x?

### JSON events vs TW tasks out of sync
- Ledger is SoT: if ledger says done but TW says pending, ledger wins
- Fix TW: `task +fitness done` (on-modify hook will skip Bridge call, event exists)
- Fix ledger: don't delete events; instead add a newer correcting event (or rebuild from TW replay).

### Habit not detected by hook
- Check tags: `task {uuid} info` — does it have `+fitness` (or other habit tag)?
- Check hook: `detect_habit(tags)` requires exact tag match
- Partner/Posterity: TW uses `+partner`/`+posterity`, Bridge uses `person1`/`person2` internally

---

## Design Principles

1. **Event ledger = SoT** — Everything else (week/day JSON, TW, TickTick, CSV) is derived/synced
2. **Idempotent everywhere** — Logging the same habit twice is safe (no duplicates)
3. **Fire-and-forget side effects** — TickTick/Telegram never block the main flow
4. **Pull model (GAS)** — GAS pulls state from Bridge, doesn't maintain its own
5. **Offline-friendly** — System degrades gracefully when Bridge/laptop is offline
6. **No recurring tasks** — seed-week creates discrete tasks, no TW rec:daily

### Derived JSON writes (why/when)

Core4 has **two kinds of JSON**:

- **Truth (append-only):** `.core4/events/**` (one file per done)
- **Derived snapshots (overwrite-ok):** `core4_day_*.json`, `core4_week_*.json`, CSV exports

By default, **read commands do not write** snapshot files:
- `core4 -d`, `core4 -w`, `core4 sources` = read-only

Snapshot files are written only on explicit write paths:
- after logging a habit (best-effort)
- `core4 build` / `core4ctl build`
- exports / sealing (`export-daily`, `finalize-*`)

---

## Setup Checklist

- [x] ✅ Standalone `seed_week.py` script with per-habit configs
- [x] ✅ Systemd timer for `core4ctl seed-week` (Monday mornings)
- [x] ✅ Bash aliases in `.config/bash/core4-aliases` (50+ shortcuts)
- [x] ✅ Bridge auto-completion of TW tasks (live query)
- [x] ✅ Task properties redesign (date in title, project:{domain}, +core4, priority:H)
- [ ] Deploy GAS Core4 Centre with Telegram bot token
- [ ] Configure Bridge Tailscale URL in GAS Script Properties
- [ ] Test full flow: seed → log via GAS → verify TW + TickTick + JSON
- [ ] Optional: enable Telegram done notifications (`AOS_HOOK_CORE4_TELE_DONE=1`)
