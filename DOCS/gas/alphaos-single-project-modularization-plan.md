# alphaos_single_project.gs modularization plan

Goal
- Provide a clear ownership map so each block in `gas/alphaos_single_project.gs` has one home.
- Reduce duplicates (ex: dailyReview in `game_fire.gs`) and missing-function errors.

Proposed module ownership (updated per HQ + bot hub)
- `gas/config.gs`
  - Script prop access + config helpers (merge `CONFIG` usage).
  - Add a `getHubConfig_()` or similar so hub code stops relying on inline `CONFIG`.
  - Keep `setLaptopUrl()` here (matches bridge/URL helpers).
- `gas/bot_hub.gs` (new)
  - Central bot registry + scheduled automations:
    - Registry for distinct bot tokens (HQ, Fruits, Voice, Fire, Watchdog, Warstack).
    - Token selection helpers that preserve per-bot routing (no forced single token).
    - Prefer `getBotConfig_()` from `gas/config.gs` as the source of truth.
  - Scheduled automations + shared helpers:
    - `dailyReview()` should live in Profit (`gas/door_profit.gs`), but can be scheduled from bot hub.
    - `weeklyWarStackReminder()`
    - `weeklyFireMapAutomation()`
    - `getDailyReviewData()`
    - `getCurrentWeekString()`
    - `getRandomQuote()`
    - `hub_sendMessage_()`
  - Remove duplicate `dailyReview()` from `gas/game_fire.gs` (or make it call the shared one).
- `gas/hq_webapp.gs` (new)
  - (Former “telegram_webapp” backend; this is the GAS HQ v1 backend.)
  - `TELEGRAM_CONFIG`
  - All `webapp_*` handlers and helpers:
    - `webapp_handleWebAppData()` + `webapp_handleTelegramMessage()`
    - `webapp_handleHotListSubmission()`
    - `webapp_handleCore4Submission()`
    - `webapp_handleSessionComplete()`
    - `webapp_logHotListToSheets()` (used by `hotlist.gs`)
    - `webapp_logCore4ToSheets()` (currently unused; decide keep/remove)
    - `webapp_logWebAppSession()`
    - `webapp_createTickTickHotListTask()` + `webapp_updateTickTickHabit()`
    - `webapp_send*` helpers + `webapp_formatTimestamp()` + `webapp_capitalizeFirst()`
    - `webapp_setupTelegramWebAppBackend()`
- `gas/door_profit.gs` (new)
  - Profit / weekly wrap-up helpers.
  - Owns `dailyReview()` implementation; scheduled via `bot_hub.gs`.
- `gas/reflection.gs` (new)
  - Entire Task Reflection System block:
    - `REFLECTION_CONFIG` + all `reflection_*` helpers
    - `addToHotListWithDossier()`
    - `promoteToDoorWar()` (rename from `promoteTooorWar`; expected to surface Hot List entries into Door War panel)
    - `promoteToWarStack()` / `startExecution()` / `completeTask()`
- `gas/router.gs` (new)
  - GAS Telegram command router block:
    - `ROUTER_CONFIG`
    - `router_getBridgeUrl_()` + `router_getWebAppUrl_()` + `router_getTriggerUrl_()` + `ROUTER_REGISTRY`
    - `router_sendTelegramMessage_()` + `router_handleHelp_()` + `router_handleStatus_()`
    - `router_delegateToWarStackBot_()` + `router_openWebAppPage_()` + `router_triggerLaptopBot_()`
    - `router_routeCommand_()`
    - `router_sendCombinedHelp_()` (shared help from `doPost`)
- `gas/entrypoints.gs` (new)
  - `doPost(e)` webhook router (keep only orchestration logic here).
  - `doGet(e)` webapp entrypoint (keeps map routing clean).
- `gas/hq_status.gs` (new)
  - `getSystemStatus_()`
  - `debugStatusLog_()` + `debugStatus()`
  - `getDashboardStats_()`
- `gas/index_inline.gs` (new)
  - `renderInlineMapHtml_()` + `resolveInlineIncludes_()`
  - These are used by `gas/Index.html` templates.
- `gas/telegram_utils.gs` (optional new)
  - Consolidate shared Telegram send logic, but preserve per-bot tokens:
    - `hub_sendMessage_()`, `webapp_sendTelegramMessage()`,
      `router_sendTelegramMessage_()`, `reflection_sendTelegramMessage_()`
  - Implement a low-level sender that accepts an explicit token (or bot key),
    and keep thin wrappers for each bot.

Notes and dependencies
- Bot roles and fallbacks (important for modularization)
  - Laptop bots (python) are primary for interactive flows; GAS bots can be offline fallbacks.
  - `gas/fire_bot.gs` is a polling fallback when laptop is offline; `python-firemap` is the primary interactive bot.
  - Warstack has parallel paths: python bot (laptop) + GAS WebApp output; both should stay consistent.
  - `watchdog.gs` is system-level and needs its own token; do not route it through a generic token.
- `doPost` depends on: `fruits_handleTelegramMessage_` (`gas/fruits.gs`),
  `hotlist_handleTelegramMessage_` (`gas/hotlist.gs`),
  `bridge_handleBotCommand()` / `bridge_handleTaskOperation()` (`gas/bridge.gs`),
  `router_routeCommand_()` (`gas/router.gs`),
  `webapp_handleWebAppData()` + `webapp_handleTelegramMessage()` (`gas/hq_webapp.gs`),
  watchdog functions (`gas/watchdog.gs`).
- `getDashboardStats_()` calls:
  - `hotlist_getCount_()` (`gas/hotlist.gs`)
  - `door_getWarStackStats()` (`gas/door_warstack.gs`)
- `webapp_handleCore4Submission()` calls:
  - `core4_log()` + `core4_getHabitLabel_()` (`gas/core4.gs`)
- `webapp_handleHotListSubmission()` and `hotlist_addWeb()` both rely on:
  - `webapp_logHotListToSheets()` (keep stable or move to `hotlist.gs` and re-export).
- `hub_sendMessage_()` used by `core4_sendWeeklySummary()` (`gas/core4.gs`).

Placement change requested
- `dailyReview()` should live with Profit (Door Profit / weekly wrap-up) instead of Fire.
  - Option A: new `gas/door_profit.gs`
  - Option B: fold into `gas/door.gs` if you want all Door flow logic in one file.

Migration order (safe)
1) Create new modules with exported functions (no removals yet).
2) Move duplicates (dailyReview) and update callers to use shared version.
3) Move Telegram WebApp block and update `hotlist.gs` references.
4) Move Reflection block (largest isolated chunk).
5) Move Router block + `doPost` orchestration.
6) Move status + inline map helpers and update `Index.html` if needed.

Risks to watch
- Token/property naming drift (`BOT_TOKEN`, `ALPHAOS_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`).
- Multi-bot tokens: `telegram_utils.gs` must not collapse all sends to one token.
- `webapp_updateTickTickHabit()` is a stub; ensure UI messaging reflects that.
- `promoteTooorWar()` typo can break calls once centralized; rename to `promoteToDoorWar()` and update any callers.

Token intent clarification
- `BOT_TOKEN` in `gas/bridge.gs` represents the generic GAS hub bot identity
  used for outgoing Telegram messages (not the Bridge connection layer itself).
- In practice `ALPHAOS_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, and `BOT_TOKEN` are often the same,
  but they remain separate properties to preserve intent and legacy callers.
