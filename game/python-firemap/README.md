# αOS Fire Bot (Firemap)

Telegram sender for Fire snapshots (Taskwarrior -> Markdown-formatted text -> Telegram).
Designed to run on demand (not as a daemon).

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
```

No extra deps required (uses stdlib). Firemap logic lives in `game/python-firemap/firemap.py`.

## Environment

Create `.env` from the template (auto-loaded by `firemap_bot.py`):

```bash
cp .env.example .env
```

Recommended: keep a shared env at `~/.env/fire.env` (or set `AOS_FIRE_ENV_FILE=/path/to/fire.env`) and only use `game/python-firemap/.env` as a local fallback.

- `AOS_FIREMAP_BOT_TOKEN` (optional; Telegram API)
- `AOS_FIREMAP_CHAT_ID` (required if using bot token)
- `AOS_FIREMAP_SENDER` (optional; `api|tele|auto`, default: `api`)
- `AOS_TELE_BIN` (default: `tele`)
- `AOS_TASK_BIN` (default: `task`)
- `AOS_FIREMAP_DOMAINS` (default: `BODY,BEING,BALANCE,BUSINESS`)
- `AOS_FIREMAP_PROJECT_SUFFIX` (optional; e.g. `.Fire`)
- `AOS_FIREMAP_TAGS` (optional; comma separated; used to include undated execution tasks)
- `AOS_FIREMAP_TAGS_MODE` (optional; `any|all`, default: `any`)
- `AOS_FIREMAP_INCLUDE_UNDATED_DAILY` (optional; `1|0`, default: `1`)
- `AOS_FIREMAP_DATE_FIELDS` (default: `due,scheduled`)
- `AOS_FIREMAP_TASK_EXPORT_PATH` (default: `~/.local/share/alphaos/task_export.json`)
- `AOS_FIREMAP_TASK_EXPORT_MAX_AGE_SEC` (default: `600`)

Example: `AOS_FIREMAP_TAGS=production,hit,fire` to include undated execution backlog.

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

- Tasks come from a Taskwarrior export snapshot (default: `~/.local/share/alphaos/task_export.json`) when available; it falls back to `task ... export` otherwise.
- Selection is based on `due|scheduled|wait` windows (plus optional undated backlog by tags); the bot sends Markdown-formatted text (not files).
- Default sender is Telegram API (`AOS_FIREMAP_SENDER=api`); if `AOS_FIREMAP_CHAT_ID` is missing it falls back to `tele`.
- `/listen` polls Telegram for `/fire`, `/fireweek`, and `/firehelp` (plus `#<id> done`) and reacts directly without the router.

To (re)generate the snapshot:

```bash
scripts/taskwarrior/export-snapshot.sh
```
