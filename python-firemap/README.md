# AlphaOS Fire Bot (Firemap)

Telegram sender for Fire snapshots (Taskwarrior -> Markdown-formatted text -> Telegram).
Designed to run on demand (not as a daemon).

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
```

No extra deps required (uses stdlib). Firemap logic lives in `python-firemap/firemap.py`.

## Environment

Create `.env` from the template (auto-loaded by `firemap_bot.py`):

```bash
cp .env.example .env
```

- `AOS_FIREMAP_BOT_TOKEN` (optional; Telegram API)
- `AOS_FIREMAP_CHAT_ID` (required if using bot token)
- `AOS_FIREMAP_SENDER` (optional; `api|tele|auto`, default: `api`)
- `AOS_TELE_BIN` (default: `tele`)
- `AOS_TASK_BIN` (default: `task`)
- `AOS_FIREMAP_DOMAINS` (default: `BODY,BEING,BALANCE,BUSINESS`)
- `AOS_FIREMAP_PROJECT_SUFFIX` (optional; e.g. `.Fire`)
- `AOS_FIREMAP_TAGS` (optional; comma separated; all tags required)
- `AOS_FIREMAP_DATE_FIELDS` (default: `due,scheduled`)

Example: `AOS_FIREMAP_TAGS=fire,production,hit` to only show Fire Centre tasks.

Existing environment variables take precedence over `.env`.

## Run

```bash
python firemap_bot.py daily
python firemap_bot.py weekly
python firemap_bot.py listen
python firemap_bot.py test --text "hello"
python firemap_bot.py print --scope daily
```

## Notes

- Tasks come from Taskwarrior (`+fire`, due/scheduled + waiting); the bot sends Markdown-formatted text (not files).
- Default sender is Telegram API (`AOS_FIREMAP_SENDER=api`); if `AOS_FIREMAP_CHAT_ID` is missing it falls back to `tele`.
- `/listen` polls Telegram for `/fire`, `/fireweek`, and `/firehelp` (plus `#<id> done`) and reacts directly without the router.
