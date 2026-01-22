# GAS Bot Tokens Overview

Purpose
- Track which Script Properties (tokens) are used by each GAS bot.
- Preserve multi-bot separation (no forced single token).

Bot Tokens (by module)
- `ALPHAOS_BOT_TOKEN`
  - Used by: `gas/bot_hub.gs` (hub_sendMessage_), `gas/alphaos_centre_utils.gs` fallback.
  - Role: generic HQ / hub fallback token.
- `TELEGRAM_BOT_TOKEN`
  - Used by: `gas/hq_webapp.gs` (HQ webapp backend).
  - Role: HQ v1 Telegram WebApp backend.
- `BOT_TOKEN`
  - Used by: `gas/bridge.gs` (GAS hub bot send helper), `gas/router.gs` router fallback.
  - Role: generic "GAS hub bot" identity for outgoing messages (not the bridge connection layer).
- `WARSTACK_BOT_TOKEN`
  - Used by: `gas/door_warstack.gs` (fallback chain includes TELEGRAM_BOT_TOKEN/BOT_TOKEN).
  - Role: Warstack bot token.
- `HOTLIST_BOT_TOKEN`
  - Used by: `gas/hotlist.gs` (fallback to TELEGRAM_BOT_TOKEN).
  - Role: Hot List capture bot token.
- `FRUITS_BOT_TOKEN`
  - Used by: `gas/fruits.gs` (fallback to getPrimaryBotToken_()).
  - Role: Fruits bot token.
- `FIRE_BOT_TOKEN`
  - Used by: `gas/fire_bot.gs` (fallback to generic token via config).
  - Role: Fire bot polling fallback (laptop offline).
- `WATCHDOG_BOT_TOKEN`
  - Used by: `gas/watchdog.gs` (no fallback).
  - Role: System watchdog alerts/debug.
- `GEN_TENT_TELEGRAM_BOT_TOKEN`
  - Used by: `gas/game_tent.gs`.
  - Role: Generals Tent bot token.

Declared but currently unused in code
- `VOICE_BOT_TOKEN` (declared in `gas/config.gs`)
- `CREATOR_BOT_TOKEN` (declared in `gas/config.gs`)

Notes
- Fire + Warstack bots have primary python implementations on the laptop;
  GAS bots are fallback or webapp equivalents.
- Do not collapse tokens into a single sender; preserve per-bot logic.
- In practice, `ALPHAOS_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, and `BOT_TOKEN` are often the same token,
  but they remain separate properties to preserve legacy callers and intent.
