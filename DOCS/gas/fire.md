# Centre: Fire

## Purpose
Weekly War map with 4 strikes per domain + daily ignition. Integrates TickTick tasks.

## Entry
- UI: `gas/Game_Fire_Index.html` (inline)
- Backend: `gas/game_fire.gs`

## Storage
- Drive root: `Alpha_Game/Fire`
- Subfolders: per-week folders (e.g. `KW35 2024`)
- Logsheet: `Alpha_Fire_Logsheet` (FireLogs tab)

## API (GAS)
- `saveFireEntry(data)`
- `getDailyTasks()` / `getWeeklyTasks()` (TickTick)
- `listProjectTasks()` / `completeTickTickTask()`

## Script Properties
- `TICKTICK_TOKEN`
- `TICKTICK_PROJECT_ID`
- `FIRE_GCAL_EMBED_URL`
- `FIRE_DRIVE_FOLDER_ID`
- `FIRE_LOG_SHEET_ID`

## Notes
- Fire uses project-level Script Properties (not per-user).
- TickTick tasks are created from Weekly Strikes + Daily Ignition.
- Google Calendar is UI-only (embed via `FIRE_GCAL_EMBED_URL`) and not a data source.
