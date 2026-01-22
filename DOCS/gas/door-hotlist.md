# Door Hotlist (GAS HQ) – Concept & Checks

## Scope
- Capture ideas from everywhere (HQ Quick Add / Terminal / Telegram WebApp / APIs) and drop them into Alpha_Door/1-Potential.
- Optional: create TickTick task (tag `hot`, project = prop or inbox).
- Always create a Taskwarrior task via Bridge queue: `project:HotList priority:L +potential`.
- Maintain a machine-readable JSON index (Hotlist entries + Task UUIDs).
- Later steps (Door War, War Stack) consume the Potential folder; no extra UI click in Door Centre required.

## Entry Points (current)
- `hotlist_addWeb(idea, user)` — used by HQ Quick Add & Terminal.
- Telegram WebApp → `webapp_handleHotListSubmission` → `hotlist_addWeb`.
- Door Bot: `/hot <input>` handled in `hotlist_handleTelegramMessage_` (uses `HOTLIST_BOT_TOKEN` for replies).
- Any direct GAS call to `hotlist_addWeb` (REST WebApp) is possible if exposed.

## Storage
- Markdown file per idea in `Alpha_Door/1-Potential` (created by `hotlist_saveToDoorPotential_`).
- JSON index (Hotlist entries + Task UUIDs) for machine access.
- Taskwarrior task enqueued via Bridge (`project:HotList priority:L +potential`) and later synced.
- TickTick task (optional) via `hotlist_syncToTickTick_` (project from `HOTLIST_TICKTICK_PROJECT_ID` or inbox).
- Count helper `hotlist_getCount_` reads Sheet (if set) or counts .md files in Potential.

## Notes & Use
- The `.md` serves as the canonical note for Obsidian/taskopen and later War Stack templating.
- Same `.md` is reused through Profit/Review phases.
- WebApp and fish shell variants should write the same `.md` and JSON index.

## Potential → Plan
- `getPotentialHotIdeas` (list .md from 1-Potential; used by Door UI).
- `doorMovePotentialToPlan` (move selected IDs to `Alpha_Door/2-Plan`).

## Props (expected)
- `TICKTICK_TOKEN` (for TickTick sync)
- `HOTLIST_TICKTICK_PROJECT_ID` (optional, fallback inbox)
- `HOTLIST_BOT_TOKEN` (optional, for Hotlist Telegram debug/helper)
- Alpha_Door folder is resolved via `door.gs` helpers.

## Telegram Helper (optional)
- `hotlist_sendTelegram_(text, chatId)` sends a debug/info message via `HOTLIST_BOT_TOKEN`.
- Fallback uses `TELEGRAM_BOT_TOKEN` if the Hotlist token is not set.

## Smoke Checks
1) HQ Quick Add: add idea → `.md` in `Alpha_Door/1-Potential`, JSON entry, Bridge-queued task, optional TickTick task.
2) Terminal: `hotlist "<idea>"` → same result.
3) Telegram WebApp: submit Hotlist → same result.
4) Door Bot: `/hot <idea>` → same result (Bridge/API reachability).
5) Door Centre: `getPotentialHotIdeas` lists the new file; `doorMovePotentialToPlan` moves it to `2-Plan`.

## Open Items
- Expose a small REST hook (optional) for AI/pipeline to push ideas into `hotlist_addWeb`.
- Dedupe is now active (case-insensitive match on idea text via `hotlist_index.json`).
- Unified status/metrics: show Hotlist count from files or sheet consistently in HQ cards.
