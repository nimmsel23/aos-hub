# Centre: Voice

## Purpose
Capture STOP/SUBMIT/STRUGGLE/STRIKE reflections and save as markdown.

## Entry
- UI: `gas/voicecentre.html` (inline in HQ)
- Client assets: `gas/voice_client_js.html`, `gas/voice_markdown.html`, `gas/voice_styles.html`
- Backend: `gas/voice.gs`

## Storage
- Drive folder: `Alpha_Voice` (per-user, via UserProperties)
- Logsheet: `Alpha_Voice_Logsheet` (Logs tab)

## API (GAS)
- `VOI_saveSessionWeb(markdown, filename)`
- `VOI_saveStepWeb(tool, markdown)`
- `renderVoicePage_()`

## Script Properties
- Uses UserProperties for folder + sheet IDs (`VOICE_DRIVE_FOLDER_ID`, `VOICE_LOG_SHEET_ID`).
- If `alphaos_centre_utils` is present, it can use `VOI_saveSession()` instead.

## Notes
- Voice can run standalone or inline; inline is used in HQ.
