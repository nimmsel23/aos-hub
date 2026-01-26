# Quick Start - General's Tent Centre

## 5-Minute Setup

### 1. Create GAS Project

https://script.google.com → New Project → "AlphaOS Tent Centre"

### 2. Upload Files

Drag & drop into GAS editor:

**Backend:**
- backend.gs
- config.gs
- webapp.gs

**TickTick:**
- ticktick_functions.gs
- ticktick_fetch.gs

**Tent:**
- tent_intelligence.gs
- tent_automation.gs
- tent_digest.gs

**Integration:**
- telegram_bot.gs

**UI:**
- Index.html

**Manifest:**
- appsscript.json

### 3. Set Properties

Run once in GAS editor:

```js
function setupProps() {
  PropertiesService.getScriptProperties().setProperties({
    'TICKTICK_TOKEN': 'YOUR_TOKEN',
    'TELEGRAM_BOT_TOKEN': 'YOUR_BOT_TOKEN',
    'TELEGRAM_CHAT_ID': 'YOUR_CHAT_ID'
  });
}
```

### 4. Test Backend

```js
statusTent()         // Should return: {ok: true, status: "operational"}
ticktickSmokeTest()  // Should return: {ok: true, ...}
```

### 5. Deploy

Deploy → New deployment → Web app

- Execute as: **Me**
- Access: **Anyone**

Copy URL.

### 6. Save URL

```js
function saveUrl() {
  const url = 'https://script.google.com/macros/s/ABC.../exec';
  PropertiesService.getScriptProperties().setProperty('TENT_WEBAPP_URL', url);
}
```

### 7. Set Webhook

```js
setTentWebhook()  // Should return: {ok: true, ...}
```

### 8. Test Bot

Telegram → @your_tent_bot → `/start`

---

## First Weekly Digest

```js
testBuildDigest()  // Check execution log for markdown
```

## Telegram Commands

```
/tent     - Open WebApp
/week     - Current week scores
/scores   - TickTick breakdown
/digest   - Full digest
/help     - Commands
```

## Troubleshooting

**"TickTick error"**
→ Check token is valid

**"Bot doesn't respond"**
→ Run `getTentWebhookInfo()` - should show your URL

**"No data"**
→ Normal if laptop offline - will use TickTick only

## Next: Connect to Router

```yaml
# router/config.yaml
centres:
  tent:
    gas_url: "YOUR_DEPLOYMENT_URL"
```

---

**Full docs:** DEPLOYMENT.md
**Architecture:** WHAT_IS_THIS.md
