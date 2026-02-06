# GAS Chapters Bot

Daily Telegram sender for chapters stored as Markdown files in a Google Drive folder.

## What it does
- Sends the next chapter in order (by filename) once per day.
- Stores progress in Script Properties so it continues where it left off.

## Setup
1) Create a new Google Apps Script project and copy `chapters_bot.gs` into it.
2) Set Script Properties (Project Settings -> Script Properties):
   - `CHAPTERS_FOLDER_ID` = Drive folder ID that contains the markdown files.
   - `TELEGRAM_BOT_TOKEN` = Bot token from BotFather.
   - `TELEGRAM_CHAT_ID` = Target chat ID (user or group).
3) Run `setupDailyTrigger()` once to create the daily trigger.

## Notes
- Order is based on alphabetical filename sorting.
- Markdown is sent as `parse_mode=Markdown`.
- If a file is too long for Telegram, it will be split into chunks.
