# GAS HQ Changelog

## 2026-01-03
- Bridge health fallback: added Telegram ping per HQ load (session id + bridge/router/heartbeat labels), bridge errors now include exception text.
- Bridge task executor: supports `depends` and `wait`; War Stack tasks now create Hits (wait/due offsets), Door task (depends on hits), Profit task (depends on door, wait:+5d); Taskwarrior UUIDs written to frontmatter + section.
- UI: Home/Header hide in centre mode, toolbar added (Door/Voice/Frame/Freedom/Focus/Fire/Tent/Fruits/HQ); Terminal dummy lines removed.
- System Status: bridge URL defaults to Funnel (`https://ideapad.tail7a15d6.ts.net/bridge`), `getBridgeUrl_()` helper for URL resolution.
- Debug: `debugStatus()` (logs status), Watchdog logs offline/online in console, `debugScriptProps_()` (lists Script Props, tokens masked).
- Docs: Added `DOCS/gas/hq.md` (HQ overview).
- Added `bridgeCheck_()` (/health on Bridge root URL) and HQ terminal command `bridgecheck` for explicit Bridge health debug.
- Status UI now ignores router/heartbeat; only Bridge /health (from `getBridgeRootUrl_()`) is used. Telegram status ping trimmed to bridge only. Terminal command `bridgecheck` remains for explicit health debug.
- Frontend boot is now guarded: `loadSystemStatus()` runs first, setup errors are caught/logged, and bridge badge shows “Error” on failures.
- Status: heartbeat is info-only; no time triggers. System status calls Bridge /health; heartbeat age is only appended to the label. Telegram ping happens once per status call (HQ load/manual).
- Bridge helpers split: new `bridge.gs` houses `bridgeHealth_()` (health + heartbeat info, with auth header); `alphaos_single_project.gs` now calls that helper.
- New `bridgeHeartbeatHook(e)` (in `bridge.gs`): accepts JSON heartbeat from bridge/router on start, stores `BRIDGE_HEARTBEAT_TS`, calls `bridgeHealth_()`, and sends one Telegram debug ping.
- Door split start: shared helpers consolidated into `door.gs` (props/Drive/Sheet/TickTick, WarStack draft + bridge sync, profit JSON, log); `door_warstack.gs` holds War Stack parsing/tasks/queue. Hotlist/Potential moved into `hotlist.gs`.
- Hotlist: adds `hotlist_index.json` in `Alpha_Door/1-Potential`, and creates Taskwarrior tasks via Bridge (`project:HotList priority:L +potential`) with offline queue fallback.
- Hotlist: dedupe by idea text (case-insensitive) using `hotlist_index.json`.
- Door War: selected Door now creates `project:DoorWar +plan` Taskwarrior task via Bridge (depends on Hotlist UUID when available).
- Door War: Taskwarrior UUID now written back into Door War markdown (`## Taskwarrior` section).
- Door War: UUID also added to frontmatter (`taskwarrior_doorwar_uuid`).
- War Stack: Taskwarrior project now uses Domino Door (fallback domain if missing).
- War Stack UI: phased “rooms” flow with validation gates and autosave per step.
- War Stack: background scan (`door_scanWarStacksForTasks_`) to enqueue tasks from new markdowns in `3-Production`.
- Door save: writes frontmatter `phase` and appends Changelog entry on Door War + War Stack saves.
- War Stack: markdown generation now matches Obsidian template (`Door-WarStack.md`) with frontmatter + sections.
- Profit: JSON now includes `week`, `score`, optional `profit_uuid`; tries to tag Profit task via Bridge modify; UI includes Profit UUID input.
- Hotlist UI split: moved HQ hotlist handlers into `gas/hotlist_client.html` and included in `gas/Index.html`.
- Hotlist: added optional Telegram helper (`HOTLIST_BOT_TOKEN`) for debug/test messages.
- Hotlist: `/hot` handled in `hotlist_handleTelegramMessage_` (replies via Hotlist bot token).
