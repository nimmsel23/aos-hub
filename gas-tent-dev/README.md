# General's Tent Centre (Standalone GAS)

**Standalone Google Apps Script deployment for General's Tent**

Part of the AlphaOS Hub-and-Spoke architecture.

## Architecture

```
Router Bot → /tent → Tent Centre (GAS)
                       ↓
                   TickTick API
                       ↓
                   Weekly Digest
```

## Files

- `backend.gs` - Core utilities (PROP, run_, cfg_)
- `config.gs` - Configuration (tokens, URLs)
- `ticktick_functions.gs` - TickTick API helpers
- `ticktick_fetch.gs` - TickTick read layer
- `tent_scores.gs` - Auto-scores (Stack/Door from TickTick)
- `tent_digest.gs` - Weekly digest builder
- `telegram_bot.gs` - Telegram bot handler
- `webapp.gs` - doPost/doGet for WebApp
- `Index.html` - Tent UI
- `appsscript.json` - Manifest

## Setup

### 1. Create GAS Project

1. Go to https://script.google.com
2. New Project → Name: "AlphaOS Tent Centre"
3. Copy all `.gs` and `.html` files

### 2. Set Script Properties

```js
// Run once in GAS editor:
PropertiesService.getScriptProperties().setProperties({
  'TICKTICK_TOKEN': 'your_ticktick_token',
  'TICKTICK_PROJECT_ID': 'inbox', // or specific project
  'TELEGRAM_BOT_TOKEN': 'your_tent_bot_token',
  'TELEGRAM_CHAT_ID': 'your_chat_id',
  'BRIDGE_URL': 'http://100.76.197.55:8080', // Tailscale IP
  'VAULT_PATH': 'AlphaOS-Vault/Alpha_Tent'
});
```

### 3. Deploy WebApp

1. Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone (or Anyone with link)
5. Copy deployment URL

### 4. Register Telegram Bot

```bash
# Via @BotFather
/newbot
Name: AlphaOS Tent
Username: alphaos_tent_bot

# Set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=<DEPLOYMENT_URL>"

# Test
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### 5. Update Router Bot Config

```yaml
# router/config.yaml
centres:
  tent:
    gas_url: "<DEPLOYMENT_URL>"
    commands: [tent, week, scores, digest, export]
```

## Commands

```
/tent              → Open Tent WebApp
/tent week         → Current week status
/tent scores       → TickTick scores (Stack/Door)
/tent digest       → Weekly digest
/tent export       → Export to Vault
/tent help         → Show commands
```

## Smoke Tests

```js
// In GAS editor:

// 1. Test backend
statusTent()

// 2. Test TickTick
ticktickSmokeTest()

// 3. Test scores
getTickTickTentScores('2026-W04')

// 4. Test digest
buildWeeklyDigest('2026-W04')

// 5. Test WebApp (open deployment URL)
// Should show Tent UI
```

## Integration Points

### Index Node

```js
// index-node can pull Tent data via Bridge
GET /api/tent/digest/:week
```

### Bridge

```python
# bridge can forward Tent calls
POST /rpc/tent/weeklyDigest
POST /rpc/tent/scores
```

## Status

- ✅ Backend structure
- ✅ TickTick integration
- ✅ Scores auto-calculation
- ⏳ Weekly digest
- ⏳ Telegram bot
- ⏳ WebApp deployment

## Next Steps

1. Deploy to GAS
2. Test TickTick connection
3. Register Telegram bot
4. Connect to Router Bot
5. Test full flow
