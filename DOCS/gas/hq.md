# GAS HQ Overview

## Entry Points
- `doGet()` (`gas/entrypoints.gs`): Renders `Index.html` (HQ UI).
- `doPost(e)` (`gas/entrypoints.gs`): Handles Telegram webhook + special payloads:
  - `kind=heartbeat` / `bridge_heartbeat` update Script Props.
  - `kind=warstack_complete` → `door_ingestWarStack_`.
  - Telegram messages (/commands routed via router, fruits, webapp).

## Status / System Health
- `getSystemStatus_()` (`gas/hq_status.gs`): Returns bridge/router/heartbeat/server info.
  - Bridge: `/health` on `AOS_BRIDGE_URL` (or `BRIDGE_URL`/`LAPTOP_WEBHOOK_URL`), with auth headers if set.
  - Router: `ROUTER_HEARTBEAT_TS` age.
  - Heartbeat: `WATCHDOG_LAST_BEAT_TS` age (useful when Bridge is unreachable).
  - Bridge fallback: `BRIDGE_HEARTBEAT_TS` (hb Xm).
  - Sends a Telegram ping per load with session id + labels.
- `debugStatus()` (`gas/hq_status.gs`): Logs current status (Bridge/Router/Heartbeat/Server) to the GAS console.
- `getDashboardStats_()` (`gas/hq_status.gs`): Hotlist/War Stack counters.

## Centres (Inline)
- Door: `door.gs` + `Door_*.html`
  - Saves sessions to Drive (`Alpha_Door`).
  - War Stack: autosave drafts, Telegram push, Task queue → Bridge.
  - Hit/Task logic: Hits → Door Task (depends on hits) → Profit Task (depends on door); writes Taskwarrior UUIDs into MD frontmatter + section.
- Fruits: `fruits.gs` + `fruits_questions.html`
  - Answers to Drive (`Alpha_Fruits`), Daily facts, Telegram bot hooks.
- Voice: `voice.gs` + `voice_*`
  - Saves sessions to Drive (`Alpha_Voice`), phases, history.
- Core4: `core4.gs`
  - Logs to Drive (`Alpha_Core4`), stats feed for HQ.
- Hotlist: `hotlist.gs`
  - Quick add, Drive storage, optional TickTick sync.

## Task Queue → Bridge
- `door_enqueueTaskOps_()` stores tasks in `DOOR_TASK_QUEUE` (Script Prop).
- `door_flushTaskOps_()` POSTs to `/bridge/task/execute` on `AOS_BRIDGE_URL`, updates War Stack MD with returned Taskwarrior UUIDs.
- Trigger helper: `door_setupTaskQueueTrigger_()` (every 5 min).

## War Stack Ingestion (from Python Bot / Webhook)
- `door_ingestWarStack_(payload)`:
  - Saves markdown to `Alpha_Door/3-Production`.
  - Builds tasks (Hits, Door, Profit) and enqueues.
  - Optional Telegram send (`WARSTACK_TELEGRAM=1`).
  - TickTick sync per phase.

## Script Properties (key ones)
- Bridge/Router/Heartbeat:
  - `AOS_BRIDGE_URL`, `BRIDGE_URL`, `LAPTOP_WEBHOOK_URL`
  - `ROUTER_HEARTBEAT_TS`, `WATCHDOG_LAST_BEAT_TS`, `BRIDGE_HEARTBEAT_TS`
  - `TELEGRAM_BOT_TOKEN`/`BOT_TOKEN`, `CHAT_ID`
- HQ WebApp:
  - `HQ_WEBAPP_URL` (URL used by Telegram WebApp buttons)
- Door/TickTick/Telegram:
  - `DOOR_DRIVE_FOLDER_ID`, `DOOR_LOG_SHEET_ID`
  - `TICKTICK_TOKEN`, `TICKTICK_INBOX_PROJECT_ID`
  - `DOOR_TICKTICK_PROJECT_{POTENTIAL,PLAN,PRODUCTION,PROFIT}`
  - `WARSTACK_TELEGRAM`, `WARSTACK_BOT_TOKEN`, `AOS_BRIDGE_URL`, `WARSTACK_USER_ID`
- Core4/Fruits/Voice:
  - Drive/Sheet IDs (e.g., `CORE4_DRIVE_FOLDER_ID`, `FRUITS_DRIVE_FOLDER_ID`, `VOICE_DRIVE_FOLDER_ID`)
- General:
  - Any centre-specific prop overrides; fallback is Drive folder auto-create inside `AlphaOS`/`Centres`.
  - `AOS_TASK_EXPORT_FILE_ID` (task_export.json file id cache)
  - `AOS_TASK_EXPORT_CACHE_ID` (fallback snapshot file id)

## Storage (Drive defaults)
- Door: `Alpha_Door/{1-Potential,2-Plan,3-Production,4-Profit,0-Drafts}`
- Fruits: `Alpha_Fruits`
- Voice: `Alpha_Voice`
- Core4: `Alpha_Core4`
- Tent/Fire/Focus/Frame/Freedom: respective `Alpha_*` folders if used.

## Inline Rendering Helpers
- `renderInlineMapHtml_(key)` (`gas/index_inline.gs`): pulls inline templates.
- `getCentreUrls_()`: provides external URLs for buttons/dots (if set).
- `getBridgeUrl_()`: canonical Bridge API base URL (includes `/bridge`). Falls back from `AOS_BRIDGE_URL` → legacy props.
- `debugScriptProps_()`: logs all Script Props (tokens masked) to help detect missing/misnamed keys.
- `bridgeCheck_()`: explicit `/bridge/health` check on `AOS_BRIDGE_URL` (no fallback); HQ terminal command `bridgecheck` triggers it.
- Task export snapshot cache:
  - `aos_snapshotTaskExport_()` refreshes `task_export_cache.json` from `task_export.json`.
  - `setupTaskExportSnapshotTrigger()` installs a 6h timer to refresh the snapshot.

## Functions & Triggers (what runs when)
- UI load:
  - `getSystemStatus_()` → called from HQ frontend; status basiert nur auf Bridge `/health` (AOS_BRIDGE_URL); Telegram ping mit session + bridge label.
  - `getDashboardStats_()` → HQ counters (Hotlist/War Stacks/Hits).
- Door:
  - `door_ingestWarStack_(payload)` → via webhook `kind=warstack_complete` (Python bot) or inline War Stack submit; enqueues tasks → Bridge.
  - Task queue: `door_taskQueueTick_()` (if trigger installed via `door_setupTaskQueueTrigger_()`).
- Reminders/Timers:
  - `weeklyWarStackReminder()` (`gas/bot_hub.gs`) → Telegram reminder (no markdown parse_mode).
  - `weeklyFireMapAutomation()` (`gas/bot_hub.gs`) → calls Bridge `POST /bridge/trigger/weekly-firemap`.
  - `dailyReview()` (`gas/door_profit.gs`) → calls Bridge `GET /bridge/daily-review-data` (requires Bridge; else sends “Data Unavailable”).
  - `watchdogCheck()` → checks heartbeat/bridge health; Telegram alert on offline/online; logs to GAS console.
- Debug:
  - `debugStatus()` → logs bridge/router/heartbeat/server to GAS console (HQ terminal command `debug` triggers it).
  - `debugScriptProps_()` → logs all Script Props (tokens masked) to console.

## Auth Headers (Bridge)
- `bridge_getAuthHeaders_()`: attach `AOS_BRIDGE_AUTH_HEADER` / `AOS_BRIDGE_AUTH_VALUE` if configured (for protected endpoints).
