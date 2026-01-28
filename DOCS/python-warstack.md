# War Stack Bot (Telegram)

Standalone Telegram bot for guided War Stack creation. It writes a full War Stack markdown file into the local vault and can post the markdown to GAS (optional).

## Location
- Code: `python-warstack/warstack_bot.py`
- Support files: `python-warstack/gemini/`, `python-warstack/requirements.txt`, `python-warstack/.env.example`

## What It Does
- Interactive Q&A flow for a War Stack (Domain, Door, 4 Hits, Insights, Lessons).
- Writes markdown to `~/AlphaOS-Vault/Weekly/` by default.
- Posts a summary + the full markdown into Telegram (optional).
- `/resume` loads the JSON draft from `WARSTACK_DATA_DIR` (local).

## Environment Variables
- `WARSTACK_BOT_TOKEN` (required)
- `TELEGRAM_BOT_TOKEN` (fallback if above missing)
- `OBSIDIAN_VAULT` (defaults to `~/AlphaOS-Vault`)
- `WARSTACK_DATA_DIR` (defaults to `~/.local/share/warstack`)
- `GEMINI_API_KEY` (optional; strategist feedback)
- `GEMINI_MODEL` (optional; default `gemini-2.5-flash`)
- `WARSTACK_GAS_WEBHOOK_URL` (optional; send completed War Stack to GAS)
- `WARSTACK_GAS_ONLY` (optional; `1` to skip local vault write)
- `WARSTACK_GAS_TIMEOUT` (optional; seconds, default `6`)
- `WARSTACK_IDLE_TIMEOUT` (optional; seconds, default `900`)

## Run
Use your preferred dependency method (see `requirements.txt`), then:
```
python python-warstack/warstack_bot.py
```

## Notes
- The bot can post completed War Stacks to GAS (`kind: warstack_complete`).
- If `WARSTACK_GAS_ONLY=1`, it skips writing to the local vault.
- GAS Door HQ auto-saves drafts to Bridge `/bridge/warstack/draft`, which writes to `WARSTACK_DATA_DIR`.
- This makes `/resume` work across HQ + bot without retyping.
- Telegram push of finished War Stacks is handled by GAS when `WARSTACK_TELEGRAM=1`.
