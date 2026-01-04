# Centre: General's Tent

## Purpose
Weekly review dashboard and Sunday invite (read-only, strategic reflection).

## Entry
- UI: `gas/Game_Tent_Index.html` (inline)
- Backend: `gas/game_tent.gs`

## Storage
- Primarily reads from other centres (Frame/Freedom/Focus/Fire/Voice/Core4/Door) via sheet IDs.
- Optional TickTick task ping for Sunday review.

## API (GAS)
- `getLatest(type)` reads latest row from configured sheets.
- `tgSend_(text)` sends the Sunday invite.

## Script Properties
- `GEN_TENT_TELEGRAM_BOT_TOKEN`
- `GEN_TENT_CHAT_ID`
- `GEN_TENT_PUBLIC_URL`
- `GEN_TENT_TICKTICK_TAGS`
- `GEN_TENT_COMPLETE_ENDPOINT`
- `GEN_TENT_TIMEZONE`
- `TICKTICK_TOKEN`
- `TICKTICK_PROJECT_ID`
- Sheet IDs: `FRAME_SHEET_ID`, `FREEDOM_SHEET_ID`, `FOCUS_SHEET_ID`, `FIRE_SHEET_ID`, `VOICE_SHEET_ID`, `CORE_SHEET_ID`, `DOOR_SHEET_ID`

## Notes
- Designed for Sunday afternoon only; read-only dashboard.
