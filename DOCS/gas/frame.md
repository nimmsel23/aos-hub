# Centre: Frame

## Purpose
Annual reality snapshot (5 questions per domain).

## Entry
- UI: `gas/Game_Frame_Index.html` (inline)
- Backend: `gas/game_frame.gs`

## Storage
- Drive root: `Alpha_Game/Frame`
- Subfolder: `Frames`
- Logsheet: `Alpha_Frame_Logsheet`

## API (GAS)
- `saveFrameEntry(domain, answers)`
- `getRecentFrames(limit)`

## Script Properties (UserProperties)
- `FRAME_DRIVE_FOLDER_ID`
- `FRAME_LOG_SHEET_ID`

## Notes
- Stored per user (UserProperties).
