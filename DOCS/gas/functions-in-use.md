# GAS: Functions In Use (Active Surface)

Goal: document what *actually runs* in the current Apps Script deployment, without spending time on legacy helpers that are no longer referenced.

This list is built from:
- `gas/entrypoints.gs` (`doGet`/`doPost`) routing
- `google.script.run.*` calls in the HTML clients
- scheduled triggers (`ScriptApp.newTrigger(...)`)

Anything not reachable through those paths is very likely legacy.

## Public WebApp Entry Points

- `doGet(e)` (`gas/entrypoints.gs`)
  - `?page=door` → `Door_Index`
  - `?page=core4` → `Core4_Index`
  - `?page=voice` → `renderVoicePage_()`
  - `?page=frame|freedom|focus|fire|tent` → `render*Page_()`
  - default → HQ `Index` (sets `mapUrls` via `getCentreUrls_()`)
- `doPost(e)` (`gas/entrypoints.gs`)
  - webhook kinds: `heartbeat`, `bridge_heartbeat`, `router_startup`, `warstack_complete`, `task_operation`
  - Telegram update types:
    - `callback_query` → `handleCallbackQuery_()`
    - `message.web_app_data` → `webapp_handleWebAppData(...)`
    - text message routing (first match wins): `fruits_handleTelegramMessage_`, `hotlist_handleTelegramMessage_`, `voice_handleTelegramMessage_`, `core4_handleTelegramMessage_`, `door_handleTelegramMessage_`, `game_handleTelegramMessage_`, `frame_handleTelegramMessage_`, `freedom_handleTelegramMessage_`, `focus_handleTelegramMessage_`, `tent_handleTelegramMessage_`
    - slash commands: `router_routeCommand_()` then fallback to `bridge_handleBotCommand(...)` / `webapp_handleTelegramMessage(...)` / `router_sendCombinedHelp_(...)`

## Client-callable APIs (`google.script.run`)

These functions are directly callable from the WebApp frontends and therefore part of the “active surface”.

### HQ (`gas/Index.html` + `gas/Index_client.html`)

- `getSystemStatus_()` (`gas/hq_status.gs`) — bridge/heartbeat status (plus optional session ping).
- `getDashboardStats_()` (`gas/hq_status.gs`) — hotlist/warstack/hit counters.
- `getCentreUrls_()` (`gas/config.gs`) — external centre URL map (buttons/dots).
- `debugStatus()` (`gas/hq_status.gs`) — debug status dump (returns status + logs).
- `terminal_bridgecheck()` (`gas/terminal.gs`) — bridge health.
- `terminal_props()` (`gas/terminal.gs`) — masked Script Properties dump.
- `terminal_stats()` (`gas/terminal.gs`) — minimal stats payload.
- `terminal_systemstatus()` (`gas/terminal.gs`) — full status payload (calls `getSystemStatus_()`).
- `terminal_tasksync()` (`gas/terminal.gs`) — task export based sync (calls `syncTasksBetweenSystems(...)` if available).
- `hotlist_addWeb(idea, user)` (`gas/hotlist.gs`) — Hot List quick add.
- `core4_log(domain, task, timestamp, source, user)` (`gas/core4.gs`) — add +0.5 points entry.
- `core4_getToday()` (`gas/core4.gs`) — today’s points total.
- Door War (HQ home): removed (now inside Door Centre / standalone).

### Door Centre (`gas/Door_Index.html` + `gas/Door_Client.html`)

- `saveDoorEntry(payload)` (`gas/door.gs`) — save tool sessions (DoorWar/WarStack/Profit/etc).
- `getPotentialHotIdeas()` (`gas/hotlist.gs`) — populate Hot List + Door War backlog.
- `doorMovePotentialToPlan(fileIds)` (`gas/hotlist.gs`) — move Potential → Plan.
- `listWarStackHits()` (`gas/door_warstack.gs`) — parse hits for Hit List selection.
- War Stack draft helpers (session-based):
  - `door_saveWarStackDraft_(payload)` (`gas/door_warstack.gs`)
  - `door_loadWarStackDraft_(sessionId)` (`gas/door_warstack.gs`)
  - `door_clearWarStackDraft_(sessionId)` (`gas/door_warstack.gs`)
- Profit JSON helper:
  - `door_saveProfitJson_(data)` (`gas/door_profit.gs`)

### Core4 Centre (`gas/Core4_Index.html`)

- `core4_getDayState(dateIso)` (`gas/core4.gs`)
- `core4_logForDate(domain, task, dateIso, source, user)` (`gas/core4.gs`)
- `core4_getWeekSummaryForDate(dateIso)` (`gas/core4.gs`)
- `core4_exportWeekSummaryForDate(dateIso)` (`gas/core4.gs`)

### Fruits (HQ section)

- `fruits_getAllData()` (`gas/fruits.gs`)
- `fruits_saveAnswer(payload)` (`gas/fruits.gs`)
- `fruits_exportCompleteMap()` (`gas/fruits.gs`)

### Game (Fire/Focus/Freedom/Tent)

- Fire (`gas/Game_Fire_Client.html` / `gas/game_fire.gs`)
  - `getTokenStatus()`
  - `saveTickTickToken(token)`
  - `getDailyTasks()`
  - `getWeeklyTasks()`
  - `completeTickTickTask(projectId, taskId)`
  - `saveFireEntry(data)`
  - `fireGetWeekInfo()`
- Focus (`gas/Game_Focus_Centre.html` / `gas/game_focus.gs`)
  - `saveFocusEntry(domain, mission, month, type)`
- Freedom (`gas/Game_Freedom_Index.html` / `gas/game_freedom.gs`)
  - `saveFreedomEntry(domain, vision, period, type)`
- Tent (`gas/Game_Tent_Index.html` / `gas/game_tent.gs`)
  - `getLatest(type)`
  - `tent_debugCentreClick(centreKey, href)`

### Voice (inline)

- `VOI_saveStepWeb(tool, markdown)` (`gas/voice.gs`)
- `saveVoiceSessionToDrive(markdown, filename)` (`gas/voice.gs`)

## Scheduled Triggers (Time-based)

These are only active if installed in the Apps Script project triggers list.

- `watchdogCheck` (`gas/watchdog.gs`) — offline/online alerting from heartbeat/bridge health.
- `hotlist_taskQueueTick_` (`gas/hotlist.gs`) — flush queued Hot List tasks to Bridge when available.
- `door_taskQueueTick_` (`gas/door_warstack.gs`) — flush queued Door/WarStack tasks to Bridge when available.
- `door_scanWarStacksForTasks_` (`gas/door_warstack.gs`) — periodic scan / UUID sync helper (if enabled).
- `fruits_dailyQuestion` (`gas/fruits.gs`) — daily Fruits prompt.
- `fruits_pollTelegram_` (`gas/fruits.gs`) — Fruits Telegram polling (if enabled).
- `fireBot_pollTelegram` (`gas/fire_bot.gs`) — Fire bot polling (if enabled).
- `tent_weeklyReviewTrigger` (`gas/tent_weekly_review.gs`) — weekly Tent review trigger.
- `bridge_syncPull` / `bridge_syncPush` (`gas/watchdog.gs`) — Drive sync helpers (if enabled).

## How to Detect Legacy

If a function is not referenced by:
- `doGet/doPost`,
- any `google.script.run.<function>` call in `gas/*.html`,
- a trigger handler string (time-based),

…it’s a good candidate for “legacy”. Prefer marking it as legacy first (doc-only), before deleting or renaming.
