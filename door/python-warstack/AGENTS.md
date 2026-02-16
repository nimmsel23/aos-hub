# War Stack Bot Guidelines

## Project Structure & Purpose
- `warstack_bot.py` runs the Telegram-guided War Stack flow.
- `README.md` documents env flags for GAS output + idle timeout.
- `.env` holds bot token and output targets.

## Run & Ops
- Manual: `python warstack_bot.py`
- Idle stop: `WARSTACK_IDLE_TIMEOUT` (default 900s) stops the bot after inactivity.
- Resume: `/resume` continues from the next missing step.

## Output Behavior
- Posts markdown to GAS when `WARSTACK_GAS_WEBHOOK_URL` (or `AOS_GAS_WEBHOOK_URL`) is set.
- Skips local vault write when `WARSTACK_GAS_ONLY=1`.
- Telegram push of the finished stack is gated by `WARSTACK_TELEGRAM=1`.

## Notes / Gotchas
- Bot is on-demand; do not run as a permanent daemon unless explicitly requested.
- If both GAS + Telegram are enabled, GAS can also post to Telegram (avoid double posts).
