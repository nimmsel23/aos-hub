# αOS Tent Bot

Strategic Intelligence Weekly Reports via Telegram.

## ⚠️ PREFERRED IMPLEMENTATION: GAS Tent Bot

**This Python bot is a fallback option.** The **recommended implementation** is the **GAS Tent Bot** (`gas/tent.gs`) because:

- ✅ **24/7 Cloud availability** - Works even when laptop is offline
- ✅ **No local service** - No systemd service or dependencies needed
- ✅ **Bridge integration** - Seamlessly integrates with existing infrastructure
- ✅ **Built-in timers** - Google Apps Script time-driven triggers
- ✅ **Sheet storage** - Automatic fallback data storage

**Use this Python bot only if:**
- You want manual `/tent` command in Telegram (interactive mode)
- You need local-only deployment (no cloud dependencies)
- You're testing Tent message formatting

**Otherwise, use the GAS Tent Bot** (see `gas/tent.gs` and `bridge/app.py` for Bridge endpoints).

---

## Overview (Python Implementation)

This Python bot sends weekly General's Tent reports every Sunday at 20:00, providing:
- Domain Health Matrix (VOICE→DOOR→FIRE pipeline status)
- Strategic Intelligence Alerts (pattern recognition)
- Pipeline Blockages (conversion gaps)
- Cascade Alignment (Frame→Freedom→Focus→Fire)

## Features

- **Scheduled Reports**: Automatic weekly reports every Sunday 20:00
- **Manual Reports**: `/tent` command for on-demand reports
- **Strategic Intelligence**: Cross-domain synthesis, temporal cascade, pipeline flow
- **Actionable Corrections**: Not just numbers, but what to do next

## Setup

### 1. Install Dependencies

```bash
cd ~/aos-hub/python-tent-bot
pip install -r requirements.txt
```

### 2. Create Bot Token

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy token

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set:
- `TELEGRAM_BOT_TOKEN` - Your bot token from BotFather
- `ALLOWED_USER_ID` - Your Telegram user ID (optional, for security)
- `INDEX_API_BASE` - Index Node API URL (default: http://127.0.0.1:8799)

### 4. Run Bot

**Manual (foreground):**
```bash
python tent_bot.py
```

**Systemd service (background):**
```bash
./tentctl install
./tentctl start
./tentctl status
```

## Commands

- `/start` - Show welcome message
- `/tent` - Generate current week report
- `/tent_last` - Previous week report (coming soon)
- `/tent_schedule` - Show schedule (coming soon)

## Architecture

```
User (Telegram)
    ↓
Tent Bot (Python + aiogram)
    ↓
Index Node API (localhost:8799)
    ↓ /api/tent/component/return-report
Domain States (~/.AlphaOS-Vault/.states/*.json)
    ↓
Synthesis Engines (Cross-Domain, Temporal, Pipeline)
    ↓
Strategic Intelligence Output
```

## Weekly Report Schedule

- **Trigger**: Every Sunday 20:00
- **Content**: Full General's Tent Strategic Intelligence
- **Format**: Telegram message with Markdown formatting
- **Action**: React with ✅ when reviewed (tracking coming soon)

## Message Format Example

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
🟡 VOICE sessions exist for BODY, BEING, BUSINESS but not integrated into daily practice.
   → Create War Stack 'Daily Practice Foundation' with 4 Hits derived from VOICE insights.

⚠️ PIPELINE BLOCKAGES:
• BODY voice_to_door: BODY has 6 VOICE sessions but 0 active War Stacks...
   ✅ Create War Stack from latest VOICE STRIKE. Extract 4 Hits from VOICE insights.

📈 CASCADE ALIGNMENT:
Fire→Focus→Freedom→Frame
BODY      ⚪   ⚪      ⚪      ⚪
BEING     ⚪   ⚪      ⚪      ⚪
BALANCE   ⚪   ⚪      ⚪      ⚪
BUSINESS  ⚪   ⚪      ⚪      ⚪

💾 Full report: http://127.0.0.1:8799/tent
React with ✅ when reviewed
```

## Integration with αOS Ecosystem

**Related Services:**
- **Index Node** (port 8799) - Provides Tent APIs
- **Router Bot** - Command routing (separate concern)
- **War Stack Bot** - War Stack creation (separate concern)
- **Fire Map Bot** - Fire Map triggers (separate concern)
- **Tent Bot** - Strategic Intelligence reports (THIS bot)

**Data Flow:**
1. Domain-states updated by Index Node (on Map updates)
2. Synthesis engines run on-demand (API calls)
3. Tent Bot fetches synthesis results (Sunday 20:00)
4. Telegram message sent with actionable intelligence

## Troubleshooting

**Bot doesn't send weekly reports:**
- Check systemd service: `./tentctl status`
- Check logs: `./tentctl logs`
- Verify ALLOWED_USER_ID in .env

**API connection failed:**
- Check Index Node is running: `curl http://127.0.0.1:8799/health`
- Verify INDEX_API_BASE in .env
- Check domain-states exist: `ls ~/AlphaOS-Vault/.states/`

**Message formatting broken:**
- Markdown parse errors → Check escape characters
- Emoji rendering → Telegram client issue
- Missing data → Check API response with `/tent` command

## Development

**Test message formatting:**
```bash
python tent_bot.py
# In Telegram: /tent
```

**Manual API test:**
```bash
curl http://127.0.0.1:8799/api/tent/component/return-report | jq
```

**Update schedule:**
Edit `weekly_report_loop()` in `tent_bot.py` to change schedule (default: Sunday 20:00).

## Future Enhancements

- [ ] Reaction tracking (✅ = reviewed)
- [ ] Historical reports (`/tent_last`, `/tent_w03`)
- [ ] Custom report scheduling (`/tent_schedule friday 18:00`)
- [ ] Export to PDF/Markdown file
- [ ] Integration with General's Tent web UI
- [ ] Multi-user support (team Tent reports)

## License

Part of αOS ecosystem. See main repo for license.
