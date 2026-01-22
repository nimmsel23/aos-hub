# Centre: Fruits

## Purpose
Daily fact questions (Fruits Map). See `DOCS/fruits-centre.md` for the unified overview.

## Entry Points
- HQ UI: inline in HQ (Fruits section)
- Standalone UI: `gas/fruits-standalone/fruitscentre.html` + `client.html`
- Backend (HQ): `gas/fruits.gs`
- Backend (Standalone): `gas/fruits-standalone/Code.js` + `utils.js`
- Questions: `gas/fruits_questions.html` (HQ) and `gas/fruits-standalone/fruits_questions.html`

## Storage
- Drive folder: `Alpha_Game/Fruits` (legacy fallback: `Alpha_Fruits`)
- JSON store: `fruits_store.json` (answers, users, logs, history)
- Sheets are legacy and no longer used in the standalone flow.

## API (GAS)
- `fruits_getAllData()`: questions + answers payload for UI
- `fruits_saveAnswer(section, question, answer)`: save answer (webapp)
- `fruits_saveAnswerWithMeta(...)`: save answer with source/chat_id
- `fruits_dailyQuestion()`: daily bot prompt

## Script Properties
- `FRUITS_BOT_TOKEN` (standalone bot token)
- `FRUITS_WEBHOOK_URL`
- `FRUITS_DRIVE_FOLDER_ID`
- `FRUITS_DEFAULT_CHAT_ID`

## Bot Flow (summary)
- `/next` selects the first unanswered question and sets `users[chat_id].last_question`.
- A normal text reply saves to JSON and clears `last_question`.
- If `last_question` is empty, the reply is ignored (no auto-match by text).
- Skips are stored as `_geskippt_` and block another skip until answered.

## Terminal CLI (python-fruits)
- See `DOCS/fruits-centre.md` for CLI details.

## Notes
- Skipped questions are tracked via Script Properties.
- WebApp and Bot share the same JSON store.
- Standalone API supports `?action=getAllData|saveAnswer|exportCompleteMap|repairStore`.
