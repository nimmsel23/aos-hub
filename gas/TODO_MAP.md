# GAS TODO Map (modularization audit)

## P0 / Fix
- [x] Define `bridge_syncPull` and its trigger/command; now implemented for `/pull` + `setupBridgePullTrigger`. `watchdog.gs`

## P1 / Config & correctness
- [ ] Unify bot token property usage (`BOT_TOKEN` vs `ALPHAOS_BOT_TOKEN` vs `TELEGRAM_BOT_TOKEN`) so setup checks match runtime usage. `gas/config.gs`, `gas/hq_webapp.gs`, `gas/bot_hub.gs`
- [ ] Remove hardcoded URLs in WebApp buttons and LAPTOP_URL default; replace with script props / `getCentreUrls_`. `gas/config.gs`, `gas/hq_webapp.gs`
- [x] Decide on single heartbeat endpoint: `doPost` handles heartbeats; removed `bridgeHeartbeatHook`.

## P2 / Legacy cleanup candidates (confirm usage)
- [ ] `webapp_updateTickTickHabit` is stub (logs only). Either implement or mark as no-op in UI messaging. `gas/hq_webapp.gs`
- [ ] Prune unused reflection/task-sync blocks if no longer used (Reflection system, Task Sync Mapping). `gas/reflection.gs`, `gas/watchdog.gs`
- [ ] Verify if `webapp_logCore4ToSheets`, `bridge_handleTelegramMessage`, `promoteTooorWar` are used; rename/remove if unused. `gas/hq_webapp.gs`, `gas/watchdog.gs`, `gas/reflection.gs`
- [x] Move Telegram status ping to watchdog (`watchdogDebugPing_`) instead of `getSystemStatus_`.

## P3 / Router heartbeat fallback
- [ ] If Bridge is down, prove laptop online via Telegram round-trip: router bot responds to `/ping` and POSTs a `kind=heartbeat` (or new `kind=router_pong`) back to GAS. Requires router changes + GAS handler. `router/router_bot.py`, `gas/entrypoints.gs`, `gas/watchdog.gs`

## watchdog.gs notes
- [x] Heartbeat hook removed; watchdog + `doPost` heartbeat are the canonical path.
