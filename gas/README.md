# AlphaOS GAS HQ (single project)

Single Google Apps Script project that powers the HQ web app and all inline
centres (Door, Voice, Frame, Freedom, Focus, Fire, Tent, Fruits).

## Entry points

- `doGet()` in `gas/entrypoints.gs` serves the HQ (`Index.html`).
- Inline centres are rendered via `renderInlineMapHtml_()` in `gas/index_inline.gs`.
- Optional direct pages: `?page=door|voice|frame|freedom|focus|fire|tent`.

## Data flows (high level)

- Hot List: Drive `Alpha_Door/1-Potential` + optional TickTick sync.
- Door War / War Stack / Hit List: Drive `Alpha_Door/2-Plan`, `3-Production`.
- War Stack push: Telegram when `WARSTACK_TELEGRAM=1`.
- Core4: event ledger in Drive `Alpha_Core4/.python-core4/events/` + derived weekly JSON `Alpha_Core4/core4_week_YYYY-WWW.json`, sheet `Core4_Log`.
- Fruits: Drive `Alpha_Game/Fruits`, sheet `FRUITS_SHEET_ID`.
- Fire Map: Drive `Alpha_Game/Fire` + Taskwarrior snapshot (`task_export.json`).

## Fire flow (current)

- **Fire Centre UI**: `gas/Game_Fire_Index.html` + `gas/game_fire.gs`
  - Captures weekly + daily Fire Map entries into Drive.
  - Optional UI embeds (e.g. `FIRE_GCAL_EMBED_URL`).
- **Fire Bot (always-on)**: `gas/fire_bot.gs`
  - Polls Telegram for `/fire` and `/fireweek`.
  - Builds messages from Drive `task_export.json` via `aos_loadTaskExportSafe_()` (no Bridge required).

### Fire Centre Setup (current)

1) Ensure `task_export.json` is synced into Drive (`AlphaOS-Vault/.alphaos/task_export.json`) and `AOS_TASK_EXPORT_FILE_ID` is set (or discoverable).
2) (Optional UI-only) If you use an embed, set `FIRE_GCAL_EMBED_URL` (iframe or URL).

## Door flow (current)

1) **Hot List (Potential)**
   Input → Individual Markdown files → `Alpha_Door/1-Potential`
   - Each idea = separate file (e.g., `FADARO_Platform_Setup_2025-01-10.md`)
   - Filename: First 5 words (max 60 chars) + date, underscores not spaces
   - Minimal frontmatter: `date`, `source`, `tags: [potential]`
   - UUID added to frontmatter when Taskwarrior task created
   - TickTick sync: tag `hot`, project `HOTLIST_TICKTICK_PROJECT_ID`
   - Taskwarrior: project `HotList`, tags `[potential]`, priority `L`

2) **Door War (Plan)**  
   Domino Door selection → Markdown → `Alpha_Door/2-Plan`.

3) **War Stack (Production)**
   Generator → Markdown → `Alpha_Door/3-Production`
   - Telegram push when `WARSTACK_TELEGRAM=1`
   - Hits become Task payloads (queued to Bridge)
   - Taskwarrior UUIDs from Bridge are written back into the War Stack markdown
   - Drafts autosave to `Alpha_Door/0-Drafts` + Bridge `/bridge/warstack/draft`

### Hot List → Taskwarrior → GAS UUID Sync Flow

**Complete Flow:**
```
User: /hot "FADARO Platform Setup" (Telegram/WebApp)
  ↓
GAS: hotlist_addWeb()
  ↓
1. Save markdown: FADARO_Platform_Setup_2025-01-10.md (no UUID yet)
2. Save to hotlist_index.json (tracking, no UUID yet)
3. Sync to TickTick (tag:hot)
  ↓
bridgeHealth_() → checks http://laptop:8080/health
  ✅ Bridge online → bridge_taskExecutor_() → POST /bridge/task/execute
  ❌ Bridge offline → hotlist_enqueueTaskOps_() → queued for retry
  ↓
Taskwarrior: task add project:HotList +potential "FADARO Platform Setup"
  ↓
on-add.alphaos.py: Sends Telegram notification
  ↓
on-exit.alphaos.py: INSTANT export (runs after EVERY task command)
  ↓
Writes:
  ~/.local/share/alphaos/task_export.json
  AlphaOS-Vault/.alphaos/task_export.json (if AOS_TASK_EXPORT_COPY_TO_VAULT=1)
  ↓
GAS Trigger: hotlist_syncUuidsFromTaskExport() (every 15 minutes)
  ↓
1. Reads task_export.json from GDrive (via aos_loadTaskExportSafe_)
2. Filters: project:HotList tasks
3. Matches with hotlist_index.json by description
4. Updates:
   - hotlist_index.json (task_uuid field)
   - Markdown frontmatter (task_uuid: abc123...)
```

**Timing:**
- Task Export: **INSTANT** (on-exit hook after every `task` command)
- UUID Sync to Markdown: **Max 15 minutes** (GAS trigger)

**hotlist_index.json:**
- Location: `Alpha_Door/1-Potential/hotlist_index.json`
- Purpose: GAS-internal tracking (not read by Taskwarrior)
- Maps: `hotlist_id` ↔ `md_id` ↔ `task_uuid`
- Deduplication check via `hotlist_findDuplicate_()`

**Taskwarrior Hooks:**
- `on-add.alphaos.py` - Sends Telegram notifications for new tasks
- `on-modify.alphaos.py` - Sends Telegram notifications for task changes
- `on-exit.alphaos.py` - Exports task_export.json after EVERY task command (instant)

**Example Markdown File (before UUID sync):**
```markdown
---
date: 2025-01-10
source: webapp
tags: [potential]
---

# FADARO Platform Setup
```

**Example Markdown File (after UUID sync, max 15 min later):**
```markdown
---
date: 2025-01-10
source: webapp
tags: [potential]
task_uuid: abc123-def456-ghi789
---

# FADARO Platform Setup
```

**Filename Logic:**
- Input: "FADARO Platform Setup"
- Slug: First 5 words → `FADARO_Platform_Setup`
- Date appended: `_2025-01-10`
- Final: `FADARO_Platform_Setup_2025-01-10.md`
- Duplicates: `FADARO_Platform_Setup_2025-01-10_143000.md` (time added)
- Umlauts converted: ä→ae, ö→oe, ü→ue, ß→ss

4) **Hit List (Production)**  
   Built from War Stack hits + Little Rocks + Sand → Markdown.

5) **Profit (Weekly Review)**  
   Form → Markdown + JSON → `Alpha_Door/4-Profit`.

## Door architecture (how it works)

- **UI layer**: `gas/Door_Index.html` + `gas/Door_Client.html`
  - Generates Markdown for Hot List / Door War / War Stack / Hit List / Profit.
  - Hot List: Each line → separate `hotlist_addWeb()` call (no aggregated files)
  - Autosaves War Stack drafts on input/blur.

- **GAS core**: `gas/door.gs`
  - `saveDoorEntry()` writes Markdown into the correct phase folder.
  - TickTick sync via `door_syncToTickTick_()` (phase tags + project IDs).
  - War Stack Telegram push via `door_sendWarStackTelegram_()` when enabled.
  - Hit parsing via `doorParseWarStackHits()`.
  - Profit JSON via `door_saveProfitJson_()`.

- **Draft persistence**:
  - Draft JSON saved to `Alpha_Door/0-Drafts`.
  - Draft pushed to Bridge `/bridge/warstack/draft` for python `/resume`.

- **Bridge**:
  - `/bridge/warstack/draft` writes `warstack_<user_id>.json` in `WARSTACK_DATA_DIR`.
  - `/bridge/task/execute` consumes queued Hit payloads when enabled.

## Telegram Bots

All bots are registered in `entrypoints.gs` via webhook (single endpoint).

### Bot Tokens (required)

**Centre-Specific Bots:**
- `FRUITS_BOT_TOKEN` - Fruits daily questions bot
- `CORE4_BOT_TOKEN` - Core4 28-or-Die tracking (8 shortcuts: /fit, /fue, /med, /mem, /par, /pos, /dis, /dec)
- `VOICE_BOT_TOKEN` - Voice Centre (STOP→SUBMIT→STRUGGLE→STRIKE)
- `DOOR_BOT_TOKEN` - Door Centre (4P Flow: Potential→Plan→Production→Profit, includes /hot)
- `GAME_BOT_TOKEN` - Game Centre (Frame, Freedom, Focus, Fire, Tent)

**Universal Fallback:**
- `BOT_TOKEN` - Universal bot token (all centres fall back to this)

**Special Bots:**
- `WATCHDOG_BOT_TOKEN` - System monitoring (optional, uses BOT_TOKEN if not set)
- `FIRE_BOT_TOKEN` - Fire Bot (polling mode, separate webhook)
**Core4 Silent Log (always on):**
- Uses `CORE4_BOT_TOKEN` (fallback: `BOT_TOKEN`) and `CHAT_ID` for silent debug proofs on every Core4 log.
Note: For GAS logging flows, add Telegram debug proofs (silent where possible) so every log has an external trace.

### Bot Commands

**Core4 Bot:**
```
/core or /core4     → Show 8 habits as inline buttons (direct logging)
                      [🏋️ Fitness] [🍽️ Fuel]
                      [🧘 Meditation] [📝 Memoirs]
                      [👥 Person 1] [💑 Person 2]
                      [🔍 Discover] [📣 Declare]
                      [📊 Today's Points]

/core4help          → Setup checklist for the full Core4 pipeline

/fit                → Log Body/Fitness (shortcut)
/fue                → Log Body/Fuel
/med                → Log Being/Meditation
/mem                → Log Being/Memoirs
/par                → Log Balance/Person 1
/pos                → Log Balance/Person 2
/dis                → Log Business/Discover
/dec                → Log Business/Declare
/today              → Show today's points
```

**Core4 Centre (WebApp Habit Tracker + Backfill):**
- Open: `.../exec?page=core4` (or from Telegram `/core4` → “Open WebApp”)
- Lets you pick any date and log the 8 habits retroactively (each `+0.5`)
- Shows day total + log list; includes week summary + export to Drive

**Local CLI (Fish) → Core4 Tracker → Taskwarrior → Bridge → Event Ledger → Derived JSON → TickTick:**
- Backfill via Fish: `fitness -1d`, `fuel -1d`, `partner -1d`, `posterity -1d` (or `core4 <habit> -1d`)
- Fish calls `aos-hub/python-core4/tracker.py` which appends a Core4 *event* and rebuilds derived `core4_day_*.json` / `core4_week_*.json`. If it needs to, it creates a Taskwarrior task (tags `+core4 +<habit> +<domain> +core4_YYYYMMDD`, `due:YYYY-MM-DD`) and completes it.
- Taskwarrior hooks then:
  - create the matching TickTick task on add (`~/.task/hooks/on-add.core4`)
  - mark TickTick done on completion (`~/.task/hooks/on-modify.core4`, runs `ticktick_sync.py --push`)
  - log Core4 into the event ledger via Bridge (`~/.task/hooks/on-modify.99-alphaos.py` → `POST /bridge/core4/log`)

**Core4 WebApp Terminal:**
- Shortcuts: `fitness`, `fuel`, `meditation`, `memoirs`, `partner`, `posterity`, `discover`, `declare`
- Full syntax: `core4 body fitness` or `core4 fitness`
- All call same backend: `core4_log(domain, task, null, source, user)`

**Voice Bot:**
```
/voice              → Voice Centre menu (inline buttons)
/voicesave          → Save last message as VOICE session
/voiceweb           → Open Voice Centre WebApp
```

**Door Bot:**
```
/door               → Door Centre menu (4P Flow inline buttons)
/hot <idea>         → Add to Hot List (Potential phase)
/doorweb            → Open Door Centre WebApp
/warstack           → War Stack info
```

**Game Bot:**
```
/game               → Game Centre menu (all Maps inline buttons)
/frame              → Frame Map (Where am I now?)
/frameweb           → Open Frame Centre WebApp
/framerecent        → Show recent Frames
/freedom            → Freedom Map (Annual vision)
/freedomweb         → Open Freedom Centre WebApp
/focus              → Focus Map (Monthly mission)
/focusweb           → Open Focus Centre WebApp
/tent               → General's Tent (Weekly review)
/tentweb            → Open Tent Centre WebApp
/tentreview         → Trigger weekly review manually
```

**Fire Bot (polling):**
```
/fire               → Show Fire Map (current week)
/fireweek           → Show specific week
```

### Tent Weekly Review Automation

Automatic weekly summary generation every Sunday at 20:00.

**Setup (run once):**
```javascript
tent_setupWeeklyReviewTrigger()
```

**What it does:**
1. Collects Core4 week totals (28-or-Die tracking)
2. Collects War Stack stats (War Stacks created, Doors completed via Profit Reviews)
3. Collects Voice Session count
4. Saves JSON summary to `Alpha_Tent/Weekly_Reviews/tent_week_summary_YYYY_WW.json`
5. Sends Telegram notification with summary

**Manual trigger:**
```javascript
tent_testWeeklyReview()
// Or via Telegram: /tentreview
```

**Data Sources:**
- `core4_getWeekSummary(weekKey)` - derived Core4 JSON from `Alpha_Core4/core4_week_YYYY-WWW.json` (built from `Alpha_Core4/.python-core4/events/`)
- WebApp helpers:
  - `core4_logForDate(domain, task, dateKey)` (backfill via `YYYY-MM-DD`)
  - `core4_getDayState(dateKey)` (day entries + total)
  - `core4_getWeekSummaryForDate(dateKey)`
  - `core4_exportWeekSummaryForDate(dateKey)`
- `door_getWeekWarStacks(weekKey)` - Counts War Stacks created (3-Production) + Doors completed (4-Profit)
- `voice_getWeekSessions(weekKey)` - Reads Voice Log Sheet, filters by timestamp

**Important Note:**
- War Stacks "created" = Files in `3-Production/` this week
- Doors "completed" = Profit Review JSON files in `4-Profit/` this week
- 1 Door = 1 War Stack = 4 Hits (always)
- Telegram shows all 3 factors for debugging (hits should = count × 4)

## Setup (GAS Console - run once)

**Tent Weekly Review Trigger:**
```javascript
tent_setupWeeklyReviewTrigger()
// Creates trigger: Every Sunday 20:00
```

**Hot List UUID Sync Trigger:**
```javascript
hotlist_setupUuidSyncTrigger()
// Creates trigger: Every 15 minutes
// Syncs UUIDs from task_export.json to Hot List markdown files
```

**Task Export Snapshot Cache (optional):**
```javascript
setupTaskExportSnapshotTrigger()
// Creates trigger: Every 6 hours
// Creates cache copy of task_export.json in case primary fails
```

## Script Properties (core)

**Telegram:**
- `CHAT_ID` (Telegram target, required)
- `BOT_TOKEN` (Universal fallback token, required)
- Centre tokens listed above (optional, falls back to BOT_TOKEN)

**Bridge:**
- `AOS_BRIDGE_URL` (preferred Bridge API base; include `/bridge`)
- `AOS_BRIDGE_TOKEN` (optional X-Bridge-Token header)
- `AOS_PUBLIC_ROOT_URL` (optional; Bridge host root without `/bridge`, used for `/health` and any non-Bridge endpoints)
- `LAPTOP_TRIGGER_URL` (optional; used only for legacy “laptop trigger” calls, separate from Bridge)
  - Legacy fallbacks (avoid if possible): `LAPTOP_URL`, `LAPTOP_WEBHOOK_URL`, `BRIDGE_URL`

**TickTick:**
- `TICKTICK_TOKEN`
- `TICKTICK_INBOX_PROJECT_ID`
- `DOOR_TICKTICK_PROJECT_POTENTIAL`
- `DOOR_TICKTICK_PROJECT_PLAN`
- `DOOR_TICKTICK_PROJECT_PRODUCTION`
- `DOOR_TICKTICK_PROJECT_PROFIT`

**Fire Centre:**
- `FIRE_GCAL_EMBED_URL` (iframe URL; UI-only)
- `FIRE_DRIVE_FOLDER_ID`
- `FIRE_LOG_SHEET_ID`

**Task Export:**
- `AOS_TASK_EXPORT_FILE_ID` (auto-set on first read)
- `AOS_TASK_EXPORT_CACHE_ID` (auto-set on first cache write)

**Other:**
- `HQ_WEBAPP_URL` (HQ WebApp URL for Telegram buttons)
- `WATCHDOG_CHAT_ID` (fallback to CHAT_ID)
- `WARSTACK_TELEGRAM` (1 to enable)
- `CORE4_SHEET_ID`
- `CORE4_SILENT_LOG`
- `CORE4_SILENT_CHAT_ID`
- `FRUITS_SHEET_ID`
- `FRUITS_DRIVE_FOLDER_ID`
- GPT URLs: `BODY_GPT_URL`, `BEING_GPT_URL`, `BALANCE_GPT_URL`, `BUSINESS_GPT_URL`

## Notes

- HQ terminal status uses live stats from Drive/Sheets, not dummy values.
- Inline maps never leave the HQ page unless you open external URLs via dots.
- Hot List UUIDs sync via `task_export.json` (read-only from GAS, no Bridge required for UUID updates)
- Taskwarrior `on-exit.alphaos.py` hook exports task_export.json INSTANTLY after every task command
- GAS reads from `AlphaOS-Vault/.alphaos/task_export.json` (synced via rclone or mounted GDrive)
- Bridge + router helpers are consolidated in `watchdog.gs` (merged from the older `bridge.gs` / `router.gs` split).
- Status messages can append a Nietzsche quote if `nietzsche_quotes.gs` is present.

## HQ status + session ping

- On first HQ load, the frontend creates `AOS_SESSION_ID` and calls `getSystemStatus_({ sessionId })`.
- `getSystemStatus_` delegates to `watchdog_getSystemStatus_` (in `watchdog.gs`) which sends a one-time Telegram status ping per session ID.
- Ping requires `WATCHDOG_BOT_TOKEN` + `WATCHDOG_CHAT_ID` (fallback: `CHAT_ID`); pass `{ ping: false }` to suppress.
- If `{ touchHeartbeat: true }` and Bridge `/health` is OK, the watchdog heartbeat timestamp is refreshed (manual heartbeat when systemd ping is disabled).
- Heartbeat ages stay relevant if Bridge `/health` is unreachable.

## Debug helpers (GAS console)

- `debugStatusLocal()` (no Telegram ping)
- `debugWatchdog()`
- `debugBridge()`
- `debugRouter()`
- `debugAll()`

## Setup helpers (GAS console)

`setupCentreUrls_(urlMap)` only sets missing Script Properties (no overwrite):

```js
setupCentreUrls_({
  body: 'https://...',
  being: 'https://...',
  balance: 'https://...',
  business: 'https://...'
});
```
