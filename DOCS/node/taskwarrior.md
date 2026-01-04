# Taskwarrior (Node + Bridge)

## Purpose
Two execution paths exist:

1) **Node direct** (local API)
   - UI or client calls Node endpoints.
   - Node runs local `task` CLI.

2) **Bridge execute** (GAS -> Bridge -> Taskwarrior)
   - GAS queues tasks, Bridge executes via `task add`.

## Node API (local)
- `GET /api/taskwarrior/tasks?status=pending&tags=door,core4`
- `POST /api/taskwarrior/add`
- `POST /api/taskwarrior/push` (TickTick sync)

## Bridge API (local)
- `POST /bridge/task/execute` (requires `AOS_TASK_EXECUTE=1`)
- `POST /bridge/task/operation` (forwards to GAS; queued on failure)

## Env (common)
- `AOS_TASK_BIN` (default `task`)
- `AOS_TASK_EXECUTE` (set `1` to allow Bridge execute)
- `AOS_GAS_WEBHOOK_URL` (Bridge -> GAS)
- `AOS_BRIDGE_URL` (GAS -> Bridge)
