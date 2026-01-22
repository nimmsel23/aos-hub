# Centre: Game (Overview)

## Purpose
Umbrella for the Game sub-centres: Frame, Freedom, Focus, Fire, Tent.

## Entry
- Inline maps are rendered via `renderInlineMapHtml_()` in `gas/index_inline.gs`.
- Each sub-centre has its own HTML + GS backend under `gas/`.

## Sub-centres

### Frame

**Purpose:** annual reality snapshot (5 questions per domain).

- UI: `gas/Game_Frame_Index.html` (inline)
- Backend: `gas/game_frame.gs`
- Storage (Drive): `Alpha_Game/Frame` (subfolder `Frames`)
- Logsheet: `Alpha_Frame_Logsheet`
- API (GAS): `saveFrameEntry(domain, answers)`, `getRecentFrames(limit)`
- UserProperties: `FRAME_DRIVE_FOLDER_ID`, `FRAME_LOG_SHEET_ID`

### Freedom

**Purpose:** vision mapping (10-year IPW + annual freedom map).

- UI: `gas/Game_Freedom_Index.html` (inline)
- Backend: `gas/game_freedom.gs`
- Storage (Drive): `Alpha_Game/Freedom` (subfolders `10Year_IPW`, `Annual`)
- Logsheet: `Alpha_Freedom_Logsheet`
- API (GAS): `saveFreedomEntry(domain, vision, period, type)`
- UserProperties: `FREEDOM_DRIVE_FOLDER_ID`, `FREEDOM_LOG_SHEET_ID`

### Focus

**Purpose:** monthly mission map (habits, routines, additions, eliminations).

- UI: `gas/Game_Focus_Centre.html` (inline)
- Backend: `gas/game_focus.gs`
- Storage (Drive): `Alpha_Game/Alpha_Focus` (subfolders `Current`, `Q1`, `Q2`, `Q3`, `Q4`)
- Logsheet: `Alpha_Focus_Logsheet`
- Obsidian export: `Alpha_Game/3_FOCUS`
- API (GAS): `saveFocusEntry(domain, mission, month, type)`
- UserProperties: `FOCUS_DRIVE_FOLDER_ID`, `FOCUS_LOG_SHEET_ID`

### Fire

**Purpose:** weekly war map with 4 strikes per domain + daily ignition; integrates TickTick tasks.

- UI: `gas/Game_Fire_Index.html` (inline)
- Backend: `gas/game_fire.gs`
- Storage (Drive): `Alpha_Game/Fire` (per-week folders, e.g. `KW35 2024`)
- Logsheet: `Alpha_Fire_Logsheet` (FireLogs tab)
- API (GAS): `saveFireEntry(data)`, `getDailyTasks()`, `getWeeklyTasks()`, `completeTickTickTask()`
- Script Properties: `TICKTICK_TOKEN`, `TICKTICK_PROJECT_ID`, `FIRE_GCAL_EMBED_URL`, `FIRE_DRIVE_FOLDER_ID`, `FIRE_LOG_SHEET_ID`

### Tent (General's Tent)

**Purpose:** weekly review dashboard + Sunday invite (read-only, strategic reflection).

- UI: `gas/Game_Tent_Index.html` (inline)
- Backend: `gas/game_tent.gs`
- Reads: latest entries from configured sheets (Frame/Freedom/Focus/Fire/Voice/Core4/Door).
- API (GAS): `getLatest(type)`, `tgSend_(text)` (+ `tent_debugCentreClick(...)` for link debugging)
- Script Properties: `GEN_TENT_TELEGRAM_BOT_TOKEN`, `GEN_TENT_CHAT_ID`, `GEN_TENT_PUBLIC_URL`, plus sheet IDs per centre
