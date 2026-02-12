# αOS War Stack Bot

Telegram bot for War Stack creation with delayed Gemini strategist feedback.
Designed to run on demand (not as a permanent daemon).

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

- `WARSTACK_BOT_TOKEN` or `TELEGRAM_BOT_TOKEN`
- `OBSIDIAN_VAULT` (default: `~/AlphaOS-Vault`)
- `WARSTACK_DATA_DIR` (default: `~/.local/share/warstack`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- `GEMINI_DELAY_SECONDS` (default: `1800`)
- `WARSTACK_GAS_WEBHOOK_URL` (optional; send completed War Stack to GAS)
- `WARSTACK_GAS_ONLY` (optional; `1` to skip local vault write)
- `WARSTACK_GAS_TIMEOUT` (optional; seconds, default `6`)
- `WARSTACK_IDLE_TIMEOUT` (optional; seconds, default `900`)
- `AOS_BRIDGE_URL` (optional; push tasks directly to Bridge `/bridge/task/execute`)
- `AOS_BRIDGE_TIMEOUT` (optional; seconds, default `5`)
- `WARSTACK_OUTPUT_DIR` (optional; override the output folder, default: `~/AlphaOS-Vault/Door/3-Production`)

Use `.env.example` as a template.

## Behavior Notes

- Idle watchdog stops the bot after `WARSTACK_IDLE_TIMEOUT` seconds.
- `/resume` continues at the next missing step.
- GAS Door HQ can push draft JSON via Bridge into `WARSTACK_DATA_DIR` (enables /resume).
- Completed War Stacks post to GAS when `WARSTACK_GAS_WEBHOOK_URL` is set.
- Local markdown is written into `~/AlphaOS-Vault/Door/3-Production` (GDrive `Alpha_Door/3-Production`).
- Set `WARSTACK_GAS_ONLY=1` to skip local vault writes.
- Telegram push of the finished stack is handled by GAS when `WARSTACK_TELEGRAM=1`.
- Avoid double-posts if you also send directly from this bot.
- Optional: If `AOS_BRIDGE_URL` is set, tasks are pushed directly to Bridge (Taskwarrior/TickTick) in parallel to the GAS flow.

## Run

```bash
python warstack_bot.py
```

## On-demand usage

- Start the bot only when you want to capture a War Stack.
- The router bot can trigger it, but it should not run all day.

## Gemini Commands

Gemini commands live in `gemini/commands/`. Add a new module and register it in
`gemini/registry.py`.
