# Index-Node and GAS Alignment

Purpose:
- Run AOS Hub in a hybrid model with selective function placement.
- Keep `index-node` as primary build target while using `gas` as active fallback for chosen functions.

## Runtime Roles

- `index-node`: primary local runtime for feature development and local integrations.
- `gas`: cloud runtime for always-on or remote-first access, plus explicit fallback coverage.

## Function Placement Rules

Choose `index-node` when:
- Local CLI or filesystem integration is required.
- Fast local iteration is needed.
- Feature is still changing frequently.

Choose `gas` when:
- Cloud access and availability are required.
- Telegram/WebApp usage should work without local node runtime.
- Function must remain usable during local outages.

## Active Fallback Model

Per function define:
- `primary_runtime`: `index-node` or `gas`
- `fallback_runtime`: `gas`, `index-node`, or `none`
- `trigger`: when failover is allowed
- `state_contract`: required payload and storage compatibility

Do not assume global parity. Track fallback readiness function-by-function.

## Current Offload Registry (2026-02-12)

Legend:
- `mode=offloaded`: GAS is operational primary for this function.
- `mode=fallback`: index-node is primary, GAS is active fallback.

| Centre | Function | mode | Primary runtime | Fallback runtime | Node path | GAS function/page | Trigger | Contract verified | Last verified | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Door | Hotlist capture + save | offloaded | gas | index-node | `POST /api/door/hotlist` | `hotlist_addWeb()` + `?page=door` | cloud-first capture, mobile/telegram use | no | 2026-02-12 | alpha | yellow |
| Door | War Stack ingest + task queue flush | fallback | index-node | gas | `POST /api/door/warstack/start` | `door_ingestWarStack_()` + `door_flushTaskOps_()` | node unavailable or remote-only execution | no | 2026-02-12 | alpha | yellow |
| Door | Door export/profit save | fallback | index-node | gas | `POST /api/door/export` | `saveDoorEntry()` + `door_saveProfitJson_()` | fallback when node write/export fails | no | 2026-02-12 | alpha | yellow |
| Core4 | Daily habit logging | offloaded | gas | index-node | `POST /api/core4` | `core4_log()` | telegram/webapp-first logging | no | 2026-02-12 | alpha | yellow |
| Core4 | Today summary read | offloaded | gas | index-node | `GET /api/core4/today` | `core4_getToday()` | read from cloud when node offline | no | 2026-02-12 | alpha | yellow |
| Fruits | Q/A flow + export | offloaded | gas | index-node | `POST /api/fruits/answer`, `POST /api/fruits/export` | `fruits_handleTelegramMessage_()` + `fruits_exportCompleteMap()` | remote bot/webapp-first usage | no | 2026-02-12 | alpha | yellow |
| Voice | Session quick-capture | fallback | index-node | gas | `POST /api/voice/export`, `POST /api/voice/autosave` | `voice_handleTelegramMessage_()` + `?page=voice` | fallback when node UI/API unavailable | no | 2026-02-12 | alpha | yellow |
| Game/Focus | Focus save/load | fallback | index-node | gas | `POST /api/game/export` (map=focus), `GET /api/game/focus/load` | `saveFocusEntry()` + `loadFocusEntry()` | remote fallback for map continuity | no | 2026-02-12 | alpha | yellow |
| Game/Fire | Daily/weekly fire task view | fallback | index-node | gas | `GET /api/fire/day`, `GET /api/fire/week` | `getDailyTasks()` + `getWeeklyTasks()` + `?page=fire` | node unavailable or remote-only use | no | 2026-02-12 | alpha | yellow |
| Tent | Weekly tent review report | offloaded | gas | index-node | `GET /api/tent/synthesis/complete`, `POST /api/tent/save-weekly` | `tent_weeklyReviewTrigger()` + `tent_handleTelegramMessage_()` | scheduled cloud review and telegram trigger | no | 2026-02-12 | alpha | yellow |
| HQ/Ops | Runtime status and heartbeat | offloaded | gas | index-node | `/health` (manual check) | `watchdog_getSystemStatus_()` + `doPost()` heartbeat kinds | cloud watchdog should remain available | no | 2026-02-12 | alpha | yellow |

## Contract Checklist (Must Define per Row)

- Payload contract: request/response field mapping across runtimes.
- Storage contract: target folders/files and naming conventions.
- Side effects: Bridge, Taskwarrior, TickTick, Telegram behavior.
- Failure contract: what the user sees when primary is down.

## Offload Workflow (Function-Level)

1. Select target function and define boundaries.
2. Specify state contract (fields, filenames, ids, side effects).
3. Implement in target runtime (`gas` for offload).
4. Add fallback switch logic or operator runbook path.
5. Run smoke tests in both runtimes.
6. Register result in the offload registry.

## Fallback Drill Checklist

- Confirm function works in primary runtime.
- Simulate primary outage condition.
- Execute function in fallback runtime.
- Validate outputs, ids, and integrations (Bridge, Taskwarrior, TickTick, Drive/Vault).
- Record date and result in registry.

## Status Labels

- `green`: primary and fallback are both verified.
- `yellow`: fallback exists but behavior differs or test is stale.
- `red`: no usable fallback path.
