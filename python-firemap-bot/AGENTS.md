# Fire Map Bot Guidelines

## Project Structure & Purpose
- `firemap_bot.py` sends Fire Map snapshots from Taskwarrior.
- `README.md` documents env vars and on-demand usage.

## Run & Ops
- Manual: `python firemap_bot.py daily|weekly|listen`
- On-demand: router `/fire` should trigger it locally.

## Output Behavior
- Prefers `tele` (`AOS_TELE_BIN`) for Telegram delivery.
- Falls back to Telegram API if `AOS_FIREMAP_BOT_TOKEN` + `AOS_FIREMAP_CHAT_ID` are set.
- No local vault writes by default (output is messages).
