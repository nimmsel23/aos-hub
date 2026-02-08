# Fruits Centre (HQ + Standalone + Telegram + Terminal)

## Purpose
Daily fact questions (Fruits Map) via WebApp + Telegram bot + Terminal CLI.

## Implementations (Node vs Router vs GAS)
- **Node (`index-node`)**: local UI + API server
  - UI: `http://127.0.0.1:8799/facts`
  - API: `/api/fruits/*` (store is local vault JSON)
  - Doc: `DOCS/node/fruits.md`
- **Router (`router/`)**: Telegram bot (aiogram) that talks to Node via HTTP
  - Extension: `router/extensions/fruits_daily.py`
  - Stores/reads answers through the Node API (not Drive).
- **GAS (`gas/`)**: Apps Script “HQ snapshot” + legacy/standalone Telegram bot
  - Module: `gas/fruits.gs`
  - Storage: Drive JSON (`Alpha_Game/Fruits/fruits_store.json`)
  - Doc: `DOCS/gas/fruits.md`
- **GAS standalone dev (`gas-fruits-dev/`)**: separate Apps Script project (own clasp `scriptId`)
  - Entry: `gas-fruits-dev/Code.js` (`doGet`/`doPost`) + `gas-fruits-dev/utils.js` (Drive JSON store)
  - Shared helpers: `gas-fruits-dev/alphaos_centre_utils.js` (Telegram chunking, trigger helpers, safe filenames)
  - Multi-user: per-user key `...?k=<user_key>` (webapp auto-creates on first visit; stored in `localStorage`)
    - Answers: `fruits_store.json` → `answers_by_key[<user_key>]`
    - Skips: `fruits_store.json` → `users_by_key[<user_key>].skipped`
  - Telegram mode: supports **webhook** and **polling** (`fruits_pollTelegram_` + trigger)
    - Safety default: webhook handling is disabled unless `FRUITS_ALLOW_WEBHOOK=1` (prevents public `doPost` abuse)
  - Used when you want the standalone Fruits WebApp/Bot updated independently from the HQ snapshot.

Important rule: **never share one Telegram bot token across multiple consumers**
(e.g. Router polling + GAS webhook/polling). Pick one owner per token.

### Multi-user + "own Google Drive" (important limitation)
Inviting another Telegram user (e.g. Ted) to a bot **does not** automatically make their answers
save into *their* Google Drive:
- Telegram updates do not contain a Google identity, so a webhook/polling handler cannot “run as Ted”.
- In Apps Script, Drive writes happen under the script execution identity (typically the script owner).

Options if you want “Ted owns his data in his Drive”:
- Ted deploys his **own** Apps Script + **his own** Telegram bot token (separate instance).
- Or keep one shared bot/store (owner Drive), and optionally export/share Ted’s folder/files.

## Entry Points
- HQ UI: inline in HQ (Fruits section)
- Standalone UI: `gas-fruits-dev/fruitscentre.html` + `gas-fruits-dev/client.html`
- Backend (HQ): `gas/fruits.gs`
- Backend (Standalone): `gas-fruits-dev/Code.js` + `gas-fruits-dev/utils.js`
- Questions: `gas/fruits_questions.html` (HQ) and `gas-fruits-dev/fruits_questions.html`
- Terminal CLI: `python-fruits/fruits`

## Storage
- Drive folder: `Alpha_Game/Fruits` (legacy fallback: `Alpha_Fruits`)
- JSON store: `fruits_store.json` (answers, users, logs, history)
- YAML store (CLI primary): `fruits_store.yaml` with JSON mirror for GAS
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

## Telegram Anti-Spam Runbook (GAS polling)
If the bot repeats the same response (e.g. `/facts` welcome) it usually means
**the same update is being processed multiple times** (offset not advancing, concurrent triggers)
or **webhook + polling are mixed** for the same token.

Quick recovery (Apps Script editor):
- Run `fruits_disableWebhook()` (ensures polling-only; drops pending updates by default).
- Run `fruits_dropPendingUpdates()` (advances offset without replying; clears backlog).
- Ensure exactly one trigger exists for `fruits_pollTelegram_()` (recreate with `fruits_setupPollingTrigger(5)`).

## Terminal CLI (python-fruits)
- Primary store: YAML (default `~/AlphaOS-Vault/Game/Fruits/fruits_store.yaml`)
- JSON mirror for GAS: `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`
- Edit mode (fzf): select a previously answered question and refine the fact
- Legacy CSV migration supported via `FRUITS_LEGACY_CSV`

## Notes
- Skipped questions are tracked via Script Properties.
- WebApp and Bot share the same JSON store.
- Standalone API supports `?action=getAllData|saveAnswer|exportCompleteMap|repairStore`.
