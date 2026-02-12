# Centre: Door

## Purpose
Drive the 4P flow (Potential -> Plan -> Production -> Profit) and turn ideas into weekly execution.
Standalone pattern overview: `DOCS/gas/standalone.md`.

## Entry
- HQ UI (Door Centre): `gas/Door_Index.html` (inline map in HQ)
- Standalone dev: `door/gas-door-dev/Door_Index.html` (separate GAS project)
- Client logic: `gas/Door_Client.html` (and copied into `door/gas-door-dev/`)
- Backend: `gas/door.gs` (and copied into `door/gas-door-dev/`)

Note:
- The **Door War Eisenhower Matrix block** was removed from the **HQ home**; Door War now lives inside the Door Centre (and `door/gas-door-dev/` for standalone deployments).

## Flow (short)
- Hot List -> `Alpha_Door/1-Potential`
- Door War -> `Alpha_Door/2-Plan`
- War Stack -> `Alpha_Door/3-Production`
- Hit List -> `Alpha_Door/3-Production`
- Profit -> `Alpha_Door/4-Profit` (MD + JSON)

## Architecture Overview
- **Entry points:** HQ Door UI (`gas/Door_Index.html`), Telegram `/hot`, terminal/task hooks, and any bridge-driven payloads.
- **Persistence:** Every step writes Markdown into `Alpha_Door/*` plus JSON indexes where needed (Hot List + Profit).
- **Task chain:** War Stack hits -> Task payloads -> Bridge queue -> Taskwarrior -> TickTick (hook); Taskwarrior UUIDs are written back into the War Stack frontmatter.
- **Independence:** GAS is the source of truth; laptop/python only resumes drafts via Bridge and does not own the final data.
- **Notifications:** Optional Telegram push for War Stack (`WARSTACK_TELEGRAM=1`) using the dedicated War Stack bot token.

## Storage
- Drive root: `Alpha_Door`
- Drafts: `Alpha_Door/0-Drafts`
- Logsheet: `Alpha_Door_Logsheet`

## API (GAS)
- `saveDoorEntry(payload)` writes MD into the correct phase folder.
- `getPotentialHotIdeas()` reads `1-Potential` for the Door War backlog.
- `listWarStackHits()` parses War Stack hits for Hit List.
- `door_getWarStackStats()` feeds HQ dashboard counters.
- `door_saveProfitJson_(data)` writes Profit JSON in `4-Profit`.

## War Stack specifics
- Autosave drafts to Drive and Bridge.
- Single source of truth: GAS HQ writes War Stack; python bot only `/resume`s drafts.
- Telegram push when `WARSTACK_TELEGRAM=1`.
- Hits become Task payloads -> queued for Bridge.
- Bridge task execution returns Taskwarrior UUIDs; GAS writes them back into the War Stack markdown under `## Taskwarrior`.

## Script Properties
- `DOOR_DRIVE_FOLDER_ID`, `DOOR_LOG_SHEET_ID`
- `TICKTICK_TOKEN`, `TICKTICK_INBOX_PROJECT_ID`
- `DOOR_TICKTICK_PROJECT_POTENTIAL`
- `DOOR_TICKTICK_PROJECT_PLAN`
- `DOOR_TICKTICK_PROJECT_PRODUCTION`
- `DOOR_TICKTICK_PROJECT_PROFIT`
- `WARSTACK_TELEGRAM`, `WARSTACK_BOT_TOKEN`, `CHAT_ID`
- `AOS_BRIDGE_URL`, `WARSTACK_USER_ID`

## Notes
- Drafts are also pushed to Bridge `/bridge/warstack/draft` to enable python `/resume`.
- TickTick sync uses phase tags (potential/plan/production/profit).
