# Deployment Guide - General's Tent Centre

## Prerequisites

1. Google account
2. Telegram bot token (@BotFather)
3. TickTick API token
4. Optional: Bridge URL (Tailscale)

## Step 1: Create GAS Project

1. Go to https://script.google.com
2. New Project
3. Name: "αOS Tent Centre"

## Step 2: Upload Files

Upload all `.gs` files:

```
backend.gs
config.gs
ticktick_functions.gs
ticktick_fetch.gs
tent_intelligence.gs (copied from tent.gs)
tent_automation.gs (copied from tent_weekly_review.gs)
tent_digest.gs
webapp.gs
telegram_bot.gs
```

Upload HTML:
```
Index.html
```

Upload manifest:
```
appsscript.json
```

## Step 3: Set Script Properties

In GAS Editor:

**File** → **Project Properties** → **Script Properties**

Add these properties:

```
TICKTICK_TOKEN = your_ticktick_token
TICKTICK_PROJECT_ID = inbox (or your project)
TELEGRAM_BOT_TOKEN = your_tent_bot_token
TELEGRAM_CHAT_ID = your_chat_id
BRIDGE_URL = http://100.76.197.55:8080 (Tailscale IP)
VAULT_PATH = AlphaOS-Vault/Alpha_Tent
```

Or run this function once:

```js
function setupProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'TICKTICK_TOKEN': 'your_token_here',
    'TICKTICK_PROJECT_ID': 'inbox',
    'TELEGRAM_BOT_TOKEN': 'your_bot_token',
    'TELEGRAM_CHAT_ID': 'your_chat_id',
    'BRIDGE_URL': 'http://100.76.197.55:8080',
    'VAULT_PATH': 'AlphaOS-Vault/Alpha_Tent'
  });
}
```

## Step 4: Initialize

Run these functions in GAS editor:

```js
initTent()        // Initialize Tent Centre
statusTent()      // Check status
ticktickSmokeTest()  // Test TickTick connection
```

Check execution log for any errors.

## Step 5: Deploy as Web App

1. **Deploy** → **New deployment**
2. **Type:** Web app
3. **Description:** αOS Tent Centre v1
4. **Execute as:** Me
5. **Who has access:** Anyone (or Anyone with link)
6. **Deploy**
7. **Copy deployment URL**

Example:
```
https://script.google.com/macros/s/ABC123.../exec
```

## Step 6: Save Deployment URL

Set it in Script Properties:

```js
function saveWebappUrl() {
  const url = 'https://script.google.com/macros/s/ABC123.../exec';
  PropertiesService.getScriptProperties().setProperty('TENT_WEBAPP_URL', url);
}
```

## Step 7: Register Telegram Bot

### Create Bot

Talk to @BotFather on Telegram:

```
/newbot
Name: αOS Tent
Username: alphaos_tent_bot
```

Copy the token → Save to Script Properties as `TELEGRAM_BOT_TOKEN`.

### Set Webhook

In GAS editor, run:

```js
setTentWebhook()
```

This sets webhook to your deployment URL.

Verify:

```js
getTentWebhookInfo()
```

Should show:
```json
{
  "url": "https://script.google.com/macros/s/ABC123.../exec",
  "has_custom_certificate": false,
  "pending_update_count": 0
}
```

## Step 8: Test Bot

In Telegram, talk to your bot:

```
/start
/help
/week
/scores
```

Should receive responses.

## Step 9: Connect to Router Bot

Update router bot config:

```yaml
# router/config.yaml
centres:
  tent:
    gas_url: "https://script.google.com/macros/s/ABC123.../exec"
    bot_username: "@alphaos_tent_bot"
    commands: [tent, week, scores, digest, export]
```

Test from router:
```
/tent
```

## Step 10: Bridge Integration (Optional)

If you have aiohttp bridge running:

Add Tent RPC handler in bridge:

```python
# bridge/handlers/tent_handler.py
async def tent_rpc(action, args):
    url = config.TENT_GAS_URL
    payload = {"action": action, "args": args}
    return await post_json(url, payload)

# Routes
@app.post("/rpc/tent/{action}")
async def rpc_tent(action: str, request: Request):
    body = await request.json()
    return await tent_rpc(action, body)
```

Test:

```bash
curl -X POST http://127.0.0.1:8080/rpc/tent/tentScores \
  -H "Content-Type: application/json" \
  -d '{"week":"2026-W04"}'
```

## Step 11: Weekly Automation (Optional)

Create time-driven trigger for weekly reports:

**Triggers** → **Add Trigger**

- Function: `sendWeeklyTentReport`
- Event source: Time-driven
- Type: Week timer
- Day: Sunday
- Time: 8pm to 9pm

This will send weekly Telegram reports automatically.

## Verification Checklist

- [ ] GAS project created
- [ ] All files uploaded
- [ ] Script properties set
- [ ] initTent() successful
- [ ] ticktickSmokeTest() passing
- [ ] Web app deployed
- [ ] Telegram bot registered
- [ ] Webhook set
- [ ] Bot responds to /start
- [ ] Router bot can reach tent
- [ ] Bridge integration (optional)
- [ ] Weekly trigger set (optional)

## Troubleshooting

### Bot doesn't respond

1. Check webhook: `getTentWebhookInfo()`
2. Check execution log for errors
3. Verify bot token in Script Properties
4. Make sure Web App is deployed with "Anyone" access

### TickTick errors

1. Check token: `ticktickSmokeTest()`
2. Verify token is valid (not expired)
3. Check TickTick API docs for changes

### Bridge unreachable

1. Verify Tailscale is running
2. Check bridge is running: `curl http://100.76.197.55:8080/health`
3. Verify BRIDGE_URL in Script Properties

### Index Node data missing

This is expected when laptop is offline. Tent will use TickTick data only.

## Next Steps

1. Test full weekly flow
2. Export to Vault
3. Monitor weekly reports
4. Adjust automation as needed

## Support

Check logs:
- GAS: **View** → **Execution log**
- Telegram: @BotFather → /mybots → Bot → API logs

## Version

v1.0.0 - Initial standalone deployment
