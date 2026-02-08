# Centre: Fruits

## Purpose
Daily fact questions (Fruits Map). See `DOCS/fruits-centre.md` for the unified overview.

## Telegram Bot Mode (GAS)
GAS Fruits supports both webhook and polling, but **polling is the intended mode** for the
“GAS polling bots” setup.

Rules:
- **Do not** run webhook + polling for the same Telegram bot token.
- **Do not** share one token between GAS and Router (aiogram). One token → one owner.
- In `gas/`, `doPost()` must live only in `gas/entrypoints.gs` (single webhook entrypoint).

Multi-user note:
- Standalone is **multi-user** via a per-user key (`?k=<user_key>`). The webapp auto-creates a key on first visit
  and stores it in `localStorage` (`aos_fruits_user_key`).
- Answers + skips are stored per `user_key` in Drive JSON (`fruits_store.json`), under `answers_by_key` and `users_by_key`.
- Telegram users still have a `chat_id`, but the bot links them to a stable `user_key` and shares the same store.
- If you need “each user stores into their own Drive”, each user needs their own deployment (and own bot token),
  or you need an explicit Google-auth web flow outside the Telegram webhook context.

### Polling (recommended)
- Trigger: `fruits_pollTelegram_()` (time-driven)
- Offset: Script Property `FRUITS_POLL_LAST_UPDATE_ID`
- Dedupe: cache + lock inside `fruits_pollTelegram_()` to avoid concurrent trigger spam

Quick recovery if the bot repeats the same message:
- `fruits_disableWebhook()` (or `fruits_disableWebhook_(true)`) — enforce polling-only
- `fruits_logWebhookInfo()` — logs webhook info to the execution log
- `fruits_dropPendingUpdates_()` — advance offset without sending replies
- `fruits_setupPollingTrigger(5)` — recreate a single polling trigger

## Entry Points
- HQ UI: inline in HQ (Fruits section)
- Standalone UI: `gas-fruits-dev/fruitscentre.html` + `gas-fruits-dev/client.html`
- Backend (HQ): `gas/fruits.gs`
- Backend (Standalone): `gas-fruits-dev/Code.js` + `gas-fruits-dev/utils.js`
- Questions: `gas/fruits_questions.html` (HQ) and `gas-fruits-dev/fruits_questions.html`

## Storage
- Drive folder: `Alpha_Game/Fruits` (legacy fallback: `Alpha_Fruits`)
- JSON store: `fruits_store.json` (answers, users, logs, history; multi-user under `*_by_key`)
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
- `FRUITS_POLL_LAST_UPDATE_ID` (polling offset)
- `FRUITS_ALLOW_WEBHOOK=1` (optional; otherwise `doPost()` ignores Telegram updates for safety)

## Bot Flow (summary)
- `/next` selects the first unanswered question and sets `users[chat_id].last_question`.
- A normal text reply saves to JSON and clears `last_question`.
- If `last_question` is empty, the reply is ignored (no auto-match by text).
- Skips are stored as `_geskippt_` and block another skip until answered.

## Terminal CLI (python-fruits)
- See `DOCS/fruits-centre.md` for CLI details.

## Notes
- WebApp and Bot share the same JSON store.
- Standalone API supports `?action=getAllData|saveAnswer|exportCompleteMap|repairStore`.

## Clasp / “API Executable” (Ops note)
- `clasp run` requires the **Apps Script API** to be enabled for the script’s Google Cloud project.
- If you only need updates, prefer `clasp push` + Web App deploy; the Editor “Run” dropdown can execute admin helpers.
