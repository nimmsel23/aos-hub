# Core4 Pipeline — 28-or-Die System

**Pillar:** THE CORE (AlphaOS Pillar #2)
**Goal:** Daily investment in all 4 Domains (BODY/BEING/BALANCE/BUSINESS)
**Mechanics:** 8 habits × 7 days = 56 tasks/week. Each done = 0.5 points. 28+ points = week won.

## Architecture

**Source of Truth:** JSON events (one per habit per day)
**Location:** `~/AlphaOS-Vault/Alpha_Core4/core4_week_YYYY-Wxx.json`

**Secondary systems:**
- Taskwarrior (terminal view, tracking)
- TickTick (mobile mirror, leech)
- CSV exports (weekly summaries)

## The 8 Habits

| Habit | Domain | Tag | Display |
|-------|--------|-----|---------|
| fitness | BODY | `+fitness` | Fitness |
| fuel | BODY | `+fuel` | Fuel |
| meditation | BEING | `+meditation` | Meditation |
| memoirs | BEING | `+memoirs` | Memoirs |
| partner | BALANCE | `+partner` | Partner (person1) |
| posterity | BALANCE | `+posterity` | Posterity (person2) |
| discover | BUSINESS | `+discover` | Discover |
| declare | BUSINESS | `+declare` | Declare |

**Note:** Bridge canonicalizes `partner→person1`, `posterity→person2` internally for JSON events.

---

## Components

### 1. **tracker.py** (CLI + JSON builder)

**Location:** `python-core4/tracker.py`
**Binary:** `~/bin/core4` (symlink)
**Wrapper:** `python-core4/core4ctl` (bash)

**Key Functions:**
- `seed_week(day, *, dry_run, force)` — Seeds 56 TW tasks for the ISO week (idempotent)
- `run_habit_flow(habit, date)` — Logs a single habit: `task_add` + `task_done` + Bridge notify
- `load_week(day)` / `load_day(day)` — Reads JSON events for display
- `score_mode()` — Show today/week scores

**Data writes:**
- Does NOT write JSON events directly
- Calls `bridge_core4_log()` which POSTs to Bridge
- Bridge writes the JSON event

**TW Task Creation:**
```python
# task_add(target) creates:
task add "Core4 Fitness (2026-02-04)" \
  project:fitness \
  due:2026-02-04 \
  +fitness \
  +core4_20260204
```

**Commands:**
```bash
core4                           # Interactive menu (fzf/gum)
core4 fitness                   # Log fitness for today
core4 fitness done              # Same, skip journal
core4 fitness -1d               # Log for yesterday
core4 -w                        # Week score
core4 -d                        # Day score
core4 seed-week                 # Seed this week's 56 tasks
core4 seed-week --dry-run       # Preview only
core4 export-daily --days=56    # Regenerate rolling CSV
core4 finalize-week 2026-W05    # Seal week CSV (idempotent)
```

**Wrapper (core4ctl):**
```bash
core4ctl status                 # Quick overview
core4ctl menu                   # Gum menu
core4ctl sync                   # Push to Drive (via vaultctl)
core4ctl seed-week              # Delegates to core4
```

---

### 2. **Bridge** (Local API server)

**Location:** `bridge/app.py`
**Port:** 8080
**Control:** `bridge/bridgectl`

**Endpoints:**

#### `POST /bridge/core4/log`
Writes JSON event + completes TW task (fire-and-forget).

**Payload:**
```json
{
  "task": "fitness",           // habit name (canonical: person1/person2)
  "domain": "body",            // optional (inferred if missing)
  "source": "gas-core4",       // tracker/gas-core4/manual/etc
  "done": true                 // default true
}
```

**Flow:**
1. Canonicalize task (`partner→person1`, `posterity→person2`)
2. Infer domain if missing
3. Write JSON event to `~/AlphaOS-Vault/Alpha_Core4/core4_week_*.json`
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
- `POST /bridge/core4/pull` — Pull from Drive (rclone)

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

**Location:** `gas-core4/Code.gs`
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
│ JSON Event Written (SoT)           │
│ ~/AlphaOS-Vault/Alpha_Core4/       │
│   core4_week_2026-W06.json         │
└────────────────────────────────────┘
```

**Key insight:** Bridge writes JSON events AND completes TW tasks. The on-modify hook is triggered by `task done`, which calls Bridge again (idempotent — event already exists). This creates a clean separation: Bridge owns JSON writes, hooks own side effects (TickTick/Telegram).

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
- `python-core4/core4ctl` — Bash wrapper
- `bridge/app.py` — Lines ~474–1400 (Core4 handlers)
- `scripts/taskwarrior/on-modify.alphaos.py` — Lines ~419–460 (Core4 detection + push)
- `gas-core4/Code.gs` — GAS Telegram centre
- `router/extensions/core4_actions.py` — Optional router shortcuts

### Data (~/AlphaOS-Vault/)
- `Alpha_Core4/core4_week_YYYY-Wxx.json` — Weekly events (SoT)
- `Alpha_Core4/core4_day_YYYY-MM-DD.json` — Daily aggregates (derived)
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
- JSON is SoT: if JSON says done but TW says pending, JSON wins
- Fix TW: `task +fitness done` (on-modify hook will skip Bridge call, event exists)
- Fix JSON: delete event from JSON file (manual), rebuild: tracker reads it

### Habit not detected by hook
- Check tags: `task {uuid} info` — does it have `+fitness` (or other habit tag)?
- Check hook: `detect_habit(tags)` requires exact tag match
- Partner/Posterity: TW uses `+partner`/`+posterity`, Bridge uses `person1`/`person2` internally

---

## Design Principles

1. **JSON events = SoT** — Everything else (TW, TickTick, CSV) is derived/synced
2. **Idempotent everywhere** — Logging the same habit twice is safe (no duplicates)
3. **Fire-and-forget side effects** — TickTick/Telegram never block the main flow
4. **Pull model (GAS)** — GAS pulls state from Bridge, doesn't maintain its own
5. **Offline-friendly** — System degrades gracefully when Bridge/laptop is offline
6. **No recurring tasks** — seed-week creates discrete tasks, no TW rec:daily

---

## Next Steps

- [ ] Set up systemd timer for `core4ctl seed-week` (Monday mornings)
- [ ] Deploy GAS Core4 Centre with Telegram bot token
- [ ] Configure Bridge Tailscale URL in GAS Script Properties
- [ ] Test full flow: seed → log via GAS → verify TW + TickTick + JSON
- [ ] Optional: enable Telegram done notifications (`AOS_HOOK_CORE4_TELE_DONE=1`)
