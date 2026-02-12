# CreatorKing Centre (Standalone + Telegram + Terminal)

## Purpose
Daily Creator King Assets Map via WebApp + Telegram bot, with nightly Gemini insights.

## Entry Points
- Standalone UI: `gas/creatorking-standalone/creatorcentre.html` + `client.html`
- Backend: `gas/creatorking-standalone/Code.js`
- Questions: `gas/creatorking-standalone/questions.html`

## Storage
- Drive folder: `AlphaOS/Centres/Alpha_CreatorKing`
- JSON store: `creatorking_store.json` (answers, users, assets, logs)
- Legacy sheet `CKA_SPREADSHEET_ID` is read once for migration if store is empty.

## WebApp API (GAS)
- `getAllData()`: questions + answers payload for UI
- `upsertAndAnalyze(section, question, answer)`: save answer (draft asset)
- `exportAssetToDrive(question)`: generate markdown asset from JSON draft
- `exportAllToDrive()`: export full map to Markdown
- `generateFullAIAnalysis()`: full Gemini analysis (after completion)

## Bot Flow (summary)
- Daily question at 08:00 via trigger.
- Replies save to JSON and clear `last_question` (reply-aware: if you reply to a bot question, it stores that exact question).
- Insights are queued and sent at 20:00 (Gemini).
- Polling uses `pollForUpdates` every 5 minutes.

## Script Properties
- `TELEGRAM_BOT_TOKEN`
- `TG_DEFAULT_CHAT_ID`
- `GEMINI_API_KEY`

## Debug Helpers (GAS)
- `ck_debugInfo(chatId)`: store URL + counts + last_question
- `ck_debugNextQuestion()`: next unanswered question
- `ck_debugClearLast(chatId)`: clear last_question for a chat
- `ck_debugSimulateMessage(chatId, text)`: simulate a Telegram message
- `ck_getWebhookInfo()`: show webhook status (polling requires no webhook)
- `ck_deleteWebhook()`: remove webhook to enable polling
- `ck_pollOnceDebug()`: fetch one batch of updates for inspection
