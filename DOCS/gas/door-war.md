# Door War (GAS HQ) – Concept & Checks

## Scope
- Select a Domino Door from the Hotlist/Potential using an Eisenhower-style filter (Q2 target).
- Move selected item(s) from `Alpha_Door/1-Potential` to `2-Plan`.
- Taskwarrior: create or update a Door task with `+plan`, `project:DoorWar`, depends on the Hotlist UUID.
- Priority mapping: `q1=H`, `q2=M`, `q3=L`, `q4=none`.

## Entry Points (current)
- Door Centre UI: lists Potential ideas (`getPotentialHotIdeas`) and can move them to Plan (`doorMovePotentialToPlan`).
- Backend pieces still reside in `door_war` (to be hooked): scoring/selection not yet fully implemented in GAS (legacy logic lived in Node/Python).

## Storage / Move
- Input: `.md` files in `Alpha_Door/1-Potential`.
- Move: `doorMovePotentialToPlan` relocates selected IDs to `Alpha_Door/2-Plan`.
- Task: create/update a Door task (`project:DoorWar`, `+plan`, depends=Hotlist UUID) via Bridge executor.
- TickTick (optional): mirror priority logic in TickTick if needed.

## Props (expected)
- Alpha_Door folder resolution via `door.gs`.
- Bridge URL/Auth if task creation is enabled (`AOS_BRIDGE_URL` canonical; legacy `BRIDGE_URL`/`LAPTOP_WEBHOOK_URL`/`LAPTOP_URL` + `AOS_BRIDGE_TOKEN`/`BRIDGE_TOKEN`).
- TickTick (optional) if you want a Door/Plan entry there (not implemented in GAS Door War yet).

## Smoke Checks (current)
1) List Potential: UI calls `getPotentialHotIdeas` → returns files from `1-Potential`.
2) Move to Plan: UI calls `doorMovePotentialToPlan` → files appear in `2-Plan`.
3) (If enabled) create/update Door task: verify in Taskwarrior a `project:DoorWar +plan` task exists with depends on Hotlist UUID.

## Open Items
- Implement proper Eisenhower scoring (Importance/Urgency) in GAS, or reuse Node/Python logic.
- Bind domain detection (from file/metadata) to set project/tags for Door task.
- Optional: write a markdown “Door War” summary into `2-Plan`.
- Replace any remaining dummy Door War logic in HQ with real scoring + Bridge task creation.
