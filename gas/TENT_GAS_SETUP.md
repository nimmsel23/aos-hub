# GAS Tent Bot Setup Guide

Complete setup guide for the General's Tent Strategic Intelligence Bot running on Google Apps Script.

## Overview

The GAS Tent Bot provides weekly Strategic Intelligence reports via Telegram, with these advantages:

- ✅ **24/7 Cloud availability** (works when laptop offline)
- ✅ **Automatic fallback** (cached data when Index Node unreachable)
- ✅ **Bridge integration** (syncs fresh data when laptop online)
- ✅ **Built-in scheduling** (GAS time-driven triggers)
- ✅ **Sheet storage** (TentReports sheet for history)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Laptop (when online)                                │
│                                                     │
│  Index Node (8799)                                  │
│  └─ Tent Synthesis APIs                            │
│       ↓                                             │
│  Bridge (8080)                                      │
│  └─ POST /bridge/tent/sync                         │
│       ↓ HTTPS                                       │
└──────────┼──────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────┐
│ Google Cloud (24/7)                                 │
│                                                     │
│  GAS Tent Bot (tent.gs)                            │
│  ├─ doPost() → Receive from Bridge                 │
│  ├─ Sheet "TentReports" → Store history           │
│  ├─ sendWeeklyTentReport() → Sunday 20:00         │
│  └─ Telegram Bot API → Send messages              │
└─────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Deploy GAS Web App

1. Open Google Apps Script Editor
2. Create new project or open existing AlphaOS project
3. Add `tent.gs` file with code from `~/aos-hub/gas/tent.gs`
4. Deploy as Web App:
   - Click "Deploy" → "New deployment"
   - Type: Web app
   - Execute as: Me (your@email.com)
   - Who has access: Anyone
   - Click "Deploy"
   - Copy Web App URL (needed for Bridge config)

**Example URL:**
```
https://script.google.com/macros/s/AKfycbz.../exec
```

### 2. Configure Script Properties

1. In Apps Script Editor: Project Settings (⚙️) → Script Properties
2. Add the following properties:

| Property | Value | Description |
|----------|-------|-------------|
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | From @BotFather |
| `TELEGRAM_CHAT_ID` | `123456789` | Your Telegram user ID |
| `BRIDGE_URL` | `http://127.0.0.1:8080` | Bridge URL (optional) |

**How to get values:**

- **TELEGRAM_BOT_TOKEN**: Open Telegram → @BotFather → `/newbot` → Copy token
- **TELEGRAM_CHAT_ID**: Open Telegram → @userinfobot → `/start` → Copy ID
- **BRIDGE_URL**: Default is `http://127.0.0.1:8080` (leave default)

### 3. Create TentReports Sheet

The bot will auto-create the sheet on first run, but you can create it manually:

1. In Google Sheets, create new sheet named `TentReports`
2. Header row:
   ```
   Week | Timestamp | Domain_Health | Strategic_Insights | Pipeline_Issues | Cascade_Health | Overall_Score | Raw_JSON
   ```

### 4. Configure Time-Driven Trigger

1. In Apps Script Editor: Triggers (⏰)
2. Click "+ Add Trigger"
3. Configure:
   - Function: `sendWeeklyTentReport`
   - Event source: Time-driven
   - Type: Week timer
   - Day: Sunday
   - Time: 8pm to 9pm
4. Save trigger

### 5. Configure Bridge (Laptop Side)

On your laptop, configure Bridge to push to GAS:

**Edit `~/.env/bridge.env` or set environment variables:**

```bash
# GAS Tent Bot Webhook URL (from Step 1)
AOS_GAS_TENT_WEBHOOK=https://script.google.com/macros/s/AKfycbz.../exec

# Or reuse existing webhook (if same project)
# AOS_GAS_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbz.../exec

# Index Node URL (default)
INDEX_NODE_URL=http://127.0.0.1:8799
```

**Restart Bridge:**
```bash
cd ~/aos-hub/bridge
./bridgectl restart
```

### 6. Test Setup

**Test GAS Bot manually:**

1. In Apps Script Editor, open `tent.gs`
2. Select function: `testTentReport`
3. Click "Run"
4. Check:
   - Execution log (View → Logs)
   - Telegram for message
   - TentReports sheet for data

**Test Bridge → GAS sync:**

```bash
# Sync current week Tent data to GAS
curl -X POST http://127.0.0.1:8080/bridge/tent/sync

# Check response
curl -X POST http://127.0.0.1:8080/bridge/tent/sync | jq
```

**Test GAS → Index Node fetch (via Bridge proxy):**

```bash
# This tests if GAS can reach Index Node via Bridge
curl http://127.0.0.1:8080/bridge/tent/fetch?week=2026-W04 | jq
```

## Usage

### Automatic Weekly Reports

Every Sunday 20:00, GAS will:

1. Try to fetch fresh data from Bridge (if laptop online)
2. Fallback to cached data in TentReports sheet (if laptop offline)
3. Format message with Strategic Intelligence
4. Send to Telegram

### Manual Trigger

To manually trigger a report:

1. Open Apps Script Editor
2. Select function: `sendWeeklyTentReport`
3. Click "Run"

Or from Bridge (when laptop online):

```bash
# Sync fresh data to GAS
curl -X POST http://127.0.0.1:8080/bridge/tent/sync

# This will also save to TentReports sheet
```

### Message Format

Example Telegram message:

```
🏛️ GENERAL'S TENT - Week 2026-W04

📊 DOMAIN HEALTH MATRIX:
Domain    V→D→F  Core4  Status
────────────────────────────────────
BODY      6→0→0   0/7  🔴 BLOCKED
BEING     4→0→0   0/7  🔴 BLOCKED
BALANCE   8→0→0   0/7  🔴 BLOCKED
BUSINESS  6→0→0   0/7  🔴 BLOCKED

🚨 STRATEGIC INTELLIGENCE:
🟡 VOICE sessions exist but not integrated into practice.
   → Create War Stack from VOICE insights

⚠️ PIPELINE BLOCKAGES:
• BODY voice_to_door: 6 VOICE sessions but 0 War Stacks
   ✅ Create War Stack from latest VOICE STRIKE

📈 CASCADE ALIGNMENT:
Fire→Focus→Freedom→Frame
BODY      ⚪   ⚪      ⚪      ⚪
BEING     ⚪   ⚪      ⚪      ⚪
BALANCE   ⚪   ⚪      ⚪      ⚪
BUSINESS  ⚪   ⚪      ⚪      ⚪

💾 Full report: http://127.0.0.1:8799/tent
React with ✅ when reviewed
```

## Troubleshooting

### No messages received

**Check trigger:**
- Apps Script Editor → Triggers → Verify `sendWeeklyTentReport` trigger exists
- Check trigger execution history for errors

**Check Script Properties:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Verify `TELEGRAM_CHAT_ID` is correct

**Check GAS logs:**
- View → Logs → Look for errors

### "No Tent data available" message

**Laptop offline:**
- Expected behavior when laptop is off and no cached data exists
- First week after setup, cache will be empty
- After first sync, cached data will be available

**Laptop online but data not syncing:**
- Check Bridge is running: `curl http://127.0.0.1:8080/health`
- Check Index Node is running: `curl http://127.0.0.1:8799/health`
- Manually sync: `curl -X POST http://127.0.0.1:8080/bridge/tent/sync`
- Check Bridge logs: `./bridgectl logs`

### Telegram API errors

**"Chat not found":**
- Verify `TELEGRAM_CHAT_ID` in Script Properties
- Make sure you've started conversation with bot (`/start`)

**"Unauthorized":**
- Verify `TELEGRAM_BOT_TOKEN` in Script Properties
- Regenerate token via @BotFather if needed

### GAS execution timeout

**"Exceeded maximum execution time":**
- GAS has 6-minute limit per execution
- Reduce message complexity (remove sections)
- Use simpler formatting

## Bridge Endpoints

### POST /bridge/tent/sync

**Purpose:** Sync Tent data from Index Node to GAS

**When to use:**
- Laptop is online with Index Node running
- You want to push latest Tent data to GAS
- Manual refresh of cached data

**Example:**
```bash
curl -X POST http://127.0.0.1:8080/bridge/tent/sync?week=2026-W04
```

**Response:**
```json
{
  "ok": true,
  "week": "2026-W04",
  "gas_response": {
    "ok": true,
    "message": "Tent report saved"
  }
}
```

### GET /bridge/tent/fetch

**Purpose:** Proxy endpoint for GAS to fetch from Index Node

**When to use:**
- Called by GAS bot automatically
- GAS can't reach localhost:8799 directly
- Bridge proxies the request

**Example:**
```bash
curl http://127.0.0.1:8080/bridge/tent/fetch?week=2026-W04
```

**Response:**
```json
{
  "ok": true,
  "week": "2026-W04",
  "component": { ... }
}
```

## Maintenance

### Update GAS Bot

1. Edit `gas/tent.gs` in Apps Script Editor
2. Save changes
3. No redeployment needed (same Web App URL)
4. Test with `testTentReport` function

### View Historical Reports

Open TentReports sheet:
- Filter by Week
- Check Domain_Health trends
- Review Overall_Score history
- Read Raw_JSON for full details

### Change Schedule

To change from Sunday 20:00 to different time:

1. Apps Script Editor → Triggers
2. Delete existing trigger
3. Create new trigger with desired schedule
4. Week timer, Day, Time

## Security

**Script Properties:**
- Never commit `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` to git
- Stored securely in Google Apps Script Project Settings

**Web App Access:**
- "Who has access: Anyone" is needed for Bridge to POST data
- No sensitive data exposed (Tent data is user-specific)
- Add authentication if needed (check Bridge token)

**Telegram Bot:**
- Only sends messages to configured `TELEGRAM_CHAT_ID`
- No public commands (not listening for incoming messages)
- One-way push notification bot

## Related Documentation

- `TENT_ARCHITECTURE.md` - Backend synthesis engine architecture
- `bridge/AGENTS.md` - Bridge configuration and patterns
- `gas/AGENTS.md` - General GAS guidelines
- `python-tent-bot/README.md` - Alternative Python implementation

## Support

**Check these first:**
1. GAS Execution Log (View → Logs)
2. Bridge logs (`./bridgectl logs`)
3. Index Node logs (`journalctl -u aos-index -f`)
4. TentReports sheet (verify data exists)
5. Script Properties (verify all configured)

**Common fixes:**
- Restart Bridge: `./bridgectl restart`
- Restart Index Node: `node server.js`
- Re-sync data: `curl -X POST http://127.0.0.1:8080/bridge/tent/sync`
- Test GAS manually: Run `testTentReport` function
