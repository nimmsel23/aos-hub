# Fruits Functions (HQ + Standalone)

This is a compact map of the Fruits functions in the HQ GAS project and the Standalone GAS project.
Names are listed exactly as in code; descriptions are one-line and pragmatic.

---

## HQ: `gas/fruits.gs`

- `fruits_setupAll(sheetId, folderId, fruitsWebAppUrl, defaultChatId)` Set script properties for Fruits storage + defaults.
- `fruits_setBotToken(token)` Store the Fruits bot token in script properties.
- `fruits_setWebhook(url)` Set Telegram webhook for the primary bot token.
- `fruits_ensureWebhook_()` Ensure a webhook exists (set if missing).
- `fruits_getWebhookInfo()` Return Telegram webhook info for the primary bot.
- `fruits_debugInfo()` Log script property + storage diagnostics.
- `fruits_getQuestions_()` Load questions from `fruits_questions` (JSON or `<script>` fallback).
- `fruits_getQuestionIndex_()` Build a question->section lookup map.
- `fruits_findQuestionInText_(text)` Find a question string inside a message body.
- `fruits_initIfNeeded_()` Ensure Drive folder + JSON store exist.
- `fruits_init_()` Create/ensure the Fruits Drive folder and JSON store.
- `fruits_ensureCentreFolder_()` Ensure `Alpha_Game/Fruits` folder exists.
- `fruits_ensureSpreadsheet_(folder)` Legacy helper to create/relocate a spreadsheet (unused with JSON).
- `fruits_ensureSheet_(ss, name, header)` Legacy helper to create a sheet (unused with JSON).
- `fruits_getSpreadsheet_()` Legacy helper to open sheet by ID.
- `fruits_getDriveFolder_()` Get/ensure Drive folder for Fruits.
- `fruits_getStoreFile_()` Get or create `fruits_store.json` (prefers the best existing file).
- `fruits_loadStore_()` Read JSON store with a lock.
- `fruits_saveStore_(store)` Persist JSON store with a lock.
- `fruits_getAnswersSheet_()` Legacy helper for Answers sheet.
- `fruits_getUsersSheet_()` Legacy helper for Users sheet.
- `fruits_getLogsSheet_()` Legacy helper for Logs sheet.
- `fruits_loadAnswers_()` Load answers map from JSON store.
- `fruits_getSkippedQuestion_()` Read skipped question from script props.
- `fruits_setSkippedQuestion_(section, question)` Set skipped question in props.
- `fruits_clearSkippedQuestion_()` Clear skipped question props.
- `fruits_hasPendingSkippedAnswer_(answers, skipped)` Determine if a skip is pending.
- `fruits_registerUser_(chatId, username)` Upsert user state into JSON store.
- `fruits_getLastQuestion_(chatId)` Read last question from JSON store.
- `fruits_setLastQuestion_(chatId, section, question)` Update user state in JSON store.
- `fruits_getAllData()` Return questions + answers + metadata for the UI.
- `fruits_saveAnswer(section, question, answer)` Save answer (webapp source).
- `fruits_saveAnswerWithMeta(section, question, answer, source, chatId)` Save answer with metadata.
- `fruits_exportCompleteMap()` Render markdown export and save to Drive.
- `fruits_saveSessionToDrive_(mdContent, filename)` Save export + add to JSON logs.
- `fruits_randomEmoji_()` Return a random fruit emoji.
- `fruits_getWebUrl_()` Return current WebApp URL.
- `fruits_sendMessage_(chatId, text)` Send Telegram message (primary bot token).
- `fruits_sendNextQuestionToUser_(chatId)` Send next open question to user.
- `fruits_skipCurrentQuestion_(chatId)` Mark current question as skipped.
- `fruits_setupDailyTrigger(hourUTC)` Create daily trigger for `fruits_dailyQuestion`.
- `fruits_setupWebhook(deployUrl)` Wrapper to set webhook (requires FRUITS_BOT_TOKEN).
- `fruits_disableWebhook_()` Delete Telegram webhook for primary bot token.
- `fruits_pollTelegram_()` Poll Telegram updates if webhook is disabled.
- `fruits_setupPollingTrigger(minutes)` Create polling trigger (default 5 min).
- `fruits_disablePolling_()` Remove polling trigger + reset offset.
- `fruits_setupComplete(config)` One-shot setup (storage, token, webhook, trigger).
- `fruits_dailyQuestion()` Daily cron: send questions to active users.
- `fruits_handleTelegramMessage_(message)` Handle `/facts`, `/next`, `/skip`, and answers.

---

## Standalone: `gas/fruits-standalone/Code.js`

### Core Fruits module (new)
- `fruits_setupAll(sheetId, folderId, fruitsWebAppUrl, defaultChatId)` Script props setup.
- `fruits_debugInfo()` Log storage + config diagnostics.
- `fruits_getQuestions_()` Load questions (JSON or `<script>` fallback).
- `fruits_initIfNeeded_()` Ensure storage is ready.
- `fruits_init_()` Create folder + storage.
- `fruits_ensureCentreFolder_()` Ensure `Alpha_Game/Fruits` folder.
- `fruits_ensureSpreadsheet_(folder)` Legacy sheet helper (kept for compatibility).
- `fruits_ensureSheet_(ss, name, header)` Legacy sheet helper.
- `fruits_getSpreadsheet_()` Legacy sheet getter.
- `fruits_getDriveFolder_()` Get Drive folder.
- `fruits_getAnswersSheet_()` Legacy Answers sheet getter.
- `fruits_getUsersSheet_()` Legacy Users sheet getter.
- `fruits_getLogsSheet_()` Legacy Logs sheet getter.
- `fruits_loadAnswers_()` Load answers (delegates to JSON store).
- `fruits_getSkippedQuestion_()` Get skipped question from props.
- `fruits_setSkippedQuestion_(section, question)` Set skipped question in props.
- `fruits_clearSkippedQuestion_()` Clear skipped question props.
- `fruits_hasPendingSkippedAnswer_(answers, skipped)` Detect pending skip.
- `fruits_registerUser_(chatId, username)` Upsert user in JSON store.
- `fruits_getLastQuestion_(chatId)` Read last question from JSON store.
- `fruits_setLastQuestion_(chatId, section, question)` Update last question.
- `fruits_getAllData()` Return UI payload.
- `fruits_saveAnswer(section, question, answer)` Save answer (webapp source).
- `fruits_saveAnswerWithMeta(section, question, answer, source, chatId)` Save answer with meta.
- `fruits_exportCompleteMap()` Markdown export.
- `fruits_saveSessionToDrive_(mdContent, filename)` Save export + log to store.
- `fruits_randomEmoji_()` Random emoji.
- `fruits_getWebUrl_()` WebApp URL from props.
- `fruits_syncStandaloneStorage_()` Sync legacy props (sheet/folder IDs).
- `fruits_jsonResponse_(payload)` JSON response wrapper.
- `fruits_repairStore_(mode)` Reset `users` and/or `skipped` in JSON store.
- `fruits_handleApiAction_(action, payload)` Handle `getAllData/saveAnswer/export/repairStore`.
- `fruits_sendMessage_(chatId, text)` Send Telegram message.
- `fruits_sendNextQuestionToUser_(chatId)` Send next open question.
- `fruits_skipCurrentQuestion_(chatId)` Skip current question.
- `fruits_dailyQuestion()` Daily trigger for fruits module.
- `fruits_handleTelegramMessage_(message)` Bot message handler.

### Bot flow (how answers are matched)
- The bot keeps per-user state in `fruits_store.json` under `users[chat_id]` with `last_section` + `last_question`.
- `/next` calls `fruits_sendNextQuestionToUser_()` which picks the first unanswered question and stores it as `last_question`.
- When you reply with a normal message (not a command), `fruits_handleTelegramMessage_()` reads `last_question` and saves the answer.
- If no `last_question` is set, the message is ignored (no auto-matching by text in standalone).
- Skips write `_geskippt_` and block another skip until answered.

### Legacy standalone module (old, still in file)
- `setupConfig(botToken, sheetId, defaultChatId)` Legacy setup for old config keys.
- `setDefaultChatId(chatId)` Set legacy default chat id.
- `doGet(e)` Legacy webapp renderer.
- `include(filename)` HtmlService include helper.
- `initIfNeeded_()` Legacy init wrapper.
- `init_()` Legacy init implementation.
- `ensureCentreFolder_()` Legacy folder helper.
- `ensureSpreadsheet_(folder)` Legacy spreadsheet helper.
- `ensureSheet_(ss, name, header)` Legacy sheet helper.
- `getAnswersSheet()` Legacy Answers sheet getter.
- `getLogsSheet()` Legacy Logs sheet getter.
- `getAllData()` Legacy UI payload builder.
- `exportCompleteMap()` Legacy export.
- `saveSessionToDrive_(mdContent, filename)` Legacy export saver.
- `generateSessionId_()` Legacy export ID helper.
- `logSession_(mdContent, sessionId, fileUrl)` Legacy log helper.
- `doPost(e)` Legacy bot webhook handler.
- `dailyQuestion()` Legacy daily trigger.
- `sendNextQuestionToUser_(chatId)` Legacy question sender.
- `skipCurrentQuestion_(chatId)` Legacy skip handler.
- `hasPendingSkippedAnswer_(answers, skipped)` Legacy skip check.

---

## Standalone: `gas/fruits-standalone/utils.js`

- `randomFruit()` Random emoji.
- `getProp(key)` Script properties getter.
- `setProp(key, value)` Script properties setter.
- `clearProp(key)` Script properties deleter.
- `getSkippedQuestion()` Read skipped question from props.
- `setSkippedQuestion(section, question)` Write skipped question to props.
- `clearSkippedQuestion()` Clear skipped props.
- `getBotToken()` Resolve bot token (BOT_TOKEN or FRUITS_BOT_TOKEN).
- `getSpreadsheet()` Legacy spreadsheet getter.
- `getDriveFolder()` Ensure Drive folder and return it.
- `ensureSheet(ss, name, header)` Legacy sheet helper.
- `loadAnswers()` Load answers from JSON store.
- `saveAnswer(section, question, answer)` Save answer (webapp source).
- `saveAnswerWithMeta(section, question, answer, source, chatId)` Save answer with metadata.
- `getUsersSheet()` Legacy users sheet getter (now unused).
- `registerUser(chatId, username)` Upsert user in JSON store.
- `getLastQuestion(chatId)` Get last question from JSON store.
- `setLastQuestion(chatId, section, question)` Update last question.
- `sendMessage(chatId, text)` Send Telegram message via bot token.
- `debugInfo()` Log store + folder + token.
- `getStoreFile_()` Get/create `fruits_store.json`.
- `loadStore_()` Read JSON store with a lock.
- `saveStore_(store)` Write JSON store with a lock.
