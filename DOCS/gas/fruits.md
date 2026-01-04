# Centre: Fruits

## Purpose
Daily fact questions (Fruits Map) via WebApp + Telegram bot.

## Entry
- UI: inline in HQ (Fruits section)
- Backend: `gas/fruits.gs`
- Questions: `gas/fruits_questions.html`

## Storage
- Drive folder: `Alpha_Game/Fruits`
- Sheet: `FRUITS_SHEET_ID` (Answers, Users, Logs)

## API (GAS)
- `fruits_getAllData()`
- `fruits_saveAnswer(section, question, answer)`
- `fruits_saveAnswerWithMeta(...)`
- `dailyQuestion()` (daily bot prompt)

## Script Properties
- `FRUITS_BOT_TOKEN`
- `FRUITS_WEBHOOK_URL`
- `FRUITS_SHEET_ID`
- `FRUITS_DRIVE_FOLDER_ID`
- `FRUITS_DEFAULT_CHAT_ID`

## Notes
- Skipped questions are tracked via Script Properties.
- WebApp and Bot share the same data store.
