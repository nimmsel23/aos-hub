# Router Bot On-Demand Architecture (Future Optimization)

**Status:** PLANNED (not implemented)
**Current:** Router Bot runs 24/7 (systemd service)
**Proposed:** Router Bot spawned on-demand via GAS Central Bot
**Priority:** LOW (current architecture works fine)

---

## Problem Statement

**Current Architecture Issues:**

1. **Resource Usage**
   - Router Bot läuft dauerhaft (RAM/CPU even when idle)
   - Polling mode = constant API requests to Telegram
   - Systemd service management overhead

2. **Offline Availability**
   - Router Bot unreachable when laptop offline/suspended
   - User gets no response (commands fail silently)
   - Lost messages when laptop comes back online

3. **Redundancy**
   - GAS bot exists for Tent reports
   - Router bot exists for commands
   - Both connect to Telegram separately

---

## Proposed Architecture: GAS Central Bot

### Overview

```
┌─────────────────────────────────────────────────────┐
│ User (Telegram)                                     │
│  Types: /door, /tent, /warstack, etc.              │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│ Google Cloud (24/7 - Always Reachable)             │
│                                                     │
│  GAS Central Bot (SINGLE bot token)                │
│  ├─ Telegram Webhook (doPost)                      │
│  ├─ Receives ALL messages                          │
│  └─ Decision Logic:                                │
│       ├─ Laptop online?                            │
│       │   ├─ YES → Forward to Bridge              │
│       │   └─ NO  → Fallback response              │
│       └─ Route by command:                         │
│           ├─ /tent → Fetch from Sheet cache       │
│           ├─ /door → Forward to Router            │
│           └─ /help → Handle in GAS                │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS
                 ↓
┌─────────────────────────────────────────────────────┐
│ Laptop (Only when online)                           │
│                                                     │
│  Bridge (8080 - aiohttp)                           │
│  └─ POST /bridge/router/update                     │
│       ├─ Receives Telegram update from GAS         │
│       ├─ Spawns Router Bot subprocess              │
│       └─ Returns response to GAS                   │
│                                                     │
│  Router Bot (Spawned on-demand)                    │
│  ├─ Processes single update                        │
│  ├─ Loads extensions                               │
│  ├─ Routes to appropriate handler                  │
│  ├─ May spawn standalone bots:                     │
│  │   ├─ python-warstack                        │
│  │   ├─ python-firemap                         │
│  │   └─ python-tent-bot                            │
│  └─ Exits after processing                         │
└─────────────────────────────────────────────────────┘
```

### Key Components

**1. GAS Central Bot** (`gas/telegram_router.gs`)
- Single Telegram bot token (shared by all functionality)
- Webhook mode (doPost receives all updates)
- Health check: ping Bridge before forwarding
- Fallback responses when laptop offline
- Sheet cache for data (Tent reports, Door status, etc.)

**2. Bridge Router Endpoint** (`bridge/app.py`)
- `POST /bridge/router/update` - Receive Telegram updates
- Spawns Router Bot subprocess with `--single-update` flag
- Manages state storage (conversation FSM)
- Returns response to GAS

**3. Router Bot Single-Update Mode** (`router/router_bot.py`)
- CLI flag: `--single-update <json>`
- Process one update and exit
- Load extensions on-demand
- State persistence via Bridge/Sheet

---

## Benefits

### 1. Resource Efficiency
- **Before:** Router Bot polling 24/7 (~50MB RAM, constant CPU)
- **After:** Spawned only when needed (~0MB idle, CPU spikes only on message)

### 2. 24/7 Availability
```
Scenario 1: Laptop online
User → GAS → Bridge → Router Bot → Response (fresh data)

Scenario 2: Laptop offline
User → GAS → Cached data → Response (degraded but functional)
```

User always gets response (no "command failed" silence).

### 3. Simplified Architecture
- Single bot token (not multiple bots)
- GAS handles scheduling (no cron/systemd timers)
- Cloud-first with local augmentation

### 4. State Persistence
- Current: Router Bot FSM in memory (lost on restart)
- Proposed: State in Bridge/Sheet (survives restarts)

---

## Implementation Plan

### Phase 1: GAS Central Bot

**File:** `gas/telegram_router.gs`

```javascript
/**
 * GAS Central Bot - Telegram Webhook Handler
 */

function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    const message = update.message || {};
    const text = message.text || "";
    const chatId = message.chat.id;
    const userId = message.from.id;

    // Security: Check allowed user
    const allowedUserId = parseInt(PropertiesService.getScriptProperties().getProperty('TELEGRAM_USER_ID'));
    if (allowedUserId && userId !== allowedUserId) {
      sendTelegramMessage(chatId, "⛔ Unauthorized");
      return ContentService.createTextOutput('unauthorized');
    }

    // Check command type
    if (text.startsWith('/')) {
      return handleCommand(chatId, text, update);
    }

    // Forward to Router Bot (conversation state)
    return forwardToRouter(update);

  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService.createTextOutput('error');
  }
}

function handleCommand(chatId, command, update) {
  const cmd = command.split(' ')[0].toLowerCase();

  // GAS-handled commands (no laptop needed)
  switch (cmd) {
    case '/start':
    case '/help':
      return handleHelp(chatId);

    case '/tent':
      return handleTentCommand(chatId);

    case '/status':
      return handleStatus(chatId);
  }

  // Commands requiring laptop
  const bridgeOnline = checkBridge();

  if (!bridgeOnline) {
    sendTelegramMessage(chatId,
      `⚠️ Laptop offline\n\n` +
      `Command \`${cmd}\` requires laptop to be online.\n\n` +
      `Available offline:\n` +
      `/tent - Latest cached report\n` +
      `/status - System status\n` +
      `/help - Help message`
    );
    return ContentService.createTextOutput('offline');
  }

  // Forward to Router Bot via Bridge
  return forwardToRouter(update);
}

function forwardToRouter(update) {
  const bridgeUrl = PropertiesService.getScriptProperties().getProperty('BRIDGE_URL');

  try {
    const response = UrlFetchApp.fetch(`${bridgeUrl}/bridge/router/update`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(update),
      muteHttpExceptions: true,
      timeout: 25  // GAS doPost has 30s limit
    });

    // Bridge will handle Telegram response directly
    return ContentService.createTextOutput('forwarded');

  } catch (err) {
    Logger.log('forwardToRouter error: ' + err);

    // Fallback response
    const chatId = update.message?.chat?.id;
    if (chatId) {
      sendTelegramMessage(chatId, "❌ Error processing command. Laptop may be unreachable.");
    }

    return ContentService.createTextOutput('error');
  }
}

function handleTentCommand(chatId) {
  // Fetch latest Tent report from Sheet
  const report = getLatestTentReport();

  if (report) {
    const message = formatTentMessage(report.raw_data);
    sendTelegramMessage(chatId, message);
  } else {
    sendTelegramMessage(chatId, "⚠️ No cached Tent report available.");
  }

  return ContentService.createTextOutput('ok');
}

function handleStatus(chatId) {
  const bridgeOnline = checkBridge();
  const lastSync = getLastSyncTime();

  const status =
    `🏛️ *AlphaOS Status*\n\n` +
    `Laptop: ${bridgeOnline ? '🟢 Online' : '🔴 Offline'}\n` +
    `Last sync: ${lastSync || 'Never'}\n\n` +
    (bridgeOnline
      ? `All commands available ✅`
      : `Only cached data available ⚠️`);

  sendTelegramMessage(chatId, status);
  return ContentService.createTextOutput('ok');
}

function checkBridge() {
  try {
    const bridgeUrl = PropertiesService.getScriptProperties().getProperty('BRIDGE_URL');
    const response = UrlFetchApp.fetch(`${bridgeUrl}/health`, {
      method: 'get',
      muteHttpExceptions: true,
      timeout: 3
    });
    return response.getResponseCode() === 200;
  } catch (err) {
    return false;
  }
}

function sendTelegramMessage(chatId, text) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    }),
    muteHttpExceptions: true
  });
}
```

**Setup:**
1. Deploy as Web App
2. Set Telegram Webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEB_APP_URL>`
3. Configure Script Properties

---

### Phase 2: Bridge Router Endpoint

**File:** `bridge/app.py`

```python
async def handle_router_update(request: web.Request) -> web.Response:
    """
    POST /bridge/router/update
    Receive Telegram update from GAS, spawn Router Bot
    """
    update = await _read_json(request)

    # Extract message info
    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")

    LOGGER.info(f"[router/update] Received: {text} from {chat_id}")

    # Spawn Router Bot subprocess
    router_script = Path(__file__).parents[1] / "router" / "router_bot.py"
    router_env = os.path.join(Path.home(), ".env", "router.env")

    # Load env vars
    env = os.environ.copy()
    if os.path.exists(router_env):
        with open(router_env) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    env[key] = val

    try:
        proc = await asyncio.create_subprocess_exec(
            "python3", str(router_script),
            "--single-update", json.dumps(update),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )

        # Wait for completion (with timeout)
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=20.0  # Leave 5s margin for GAS 25s timeout
        )

        output = stdout.decode("utf-8", errors="ignore")
        error = stderr.decode("utf-8", errors="ignore")

        if proc.returncode != 0:
            LOGGER.error(f"[router/update] Router Bot failed: {error}")

            # Send error to user
            if chat_id:
                await _send_telegram_direct(
                    chat_id,
                    f"❌ Command processing failed.\n\nError: {error[:200]}"
                )

            return web.json_response({
                "ok": False,
                "error": error
            }, status=500)

        LOGGER.info(f"[router/update] Router Bot success: {output[:100]}")

        return web.json_response({
            "ok": True,
            "output": output
        })

    except asyncio.TimeoutError:
        LOGGER.error("[router/update] Router Bot timeout")
        proc.kill()

        if chat_id:
            await _send_telegram_direct(
                chat_id,
                "⏱️ Command timeout. Operation may still be processing."
            )

        return web.json_response({
            "ok": False,
            "error": "timeout"
        }, status=504)

    except Exception as e:
        LOGGER.error(f"[router/update] Exception: {e}")

        if chat_id:
            await _send_telegram_direct(
                chat_id,
                f"❌ Internal error: {str(e)}"
            )

        return web.json_response({
            "ok": False,
            "error": str(e)
        }, status=500)


async def _send_telegram_direct(chat_id: int, text: str):
    """Send Telegram message directly (bypass Router Bot)"""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status != 200:
                    LOGGER.error(f"Telegram API error: {resp.status}")
    except Exception as e:
        LOGGER.error(f"_send_telegram_direct failed: {e}")


# Add to routes
app.add_routes([
    # ... existing routes ...
    web.post("/router/update", handle_router_update),
    web.post("/bridge/router/update", handle_router_update),
])
```

---

### Phase 3: Router Bot Single-Update Mode

**File:** `router/router_bot.py`

```python
#!/usr/bin/env python3
import argparse
import asyncio
import json
import sys
from aiogram import Bot, Dispatcher

# ... existing imports ...

async def process_single_update(update_json: str):
    """
    Process a single Telegram update and exit
    Called when spawned by Bridge
    """
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    dp = Dispatcher()

    # Load extensions
    await load_extensions(dp)

    # Parse update
    update_data = json.loads(update_json)
    update = types.Update(**update_data)

    # Process update
    try:
        await dp.feed_update(bot, update)
        print("✅ Update processed successfully", file=sys.stderr)
        return 0
    except Exception as e:
        print(f"❌ Error processing update: {e}", file=sys.stderr)
        return 1
    finally:
        await bot.session.close()


async def main():
    parser = argparse.ArgumentParser(description="AlphaOS Router Bot")
    parser.add_argument(
        "--single-update",
        help="Process single Telegram update JSON and exit (on-demand mode)"
    )
    args = parser.parse_args()

    if args.single_update:
        # Single-update mode (spawned by Bridge)
        exit_code = await process_single_update(args.single_update)
        sys.exit(exit_code)
    else:
        # Normal polling mode (24/7 fallback)
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        dp = Dispatcher()
        await load_extensions(dp)

        print("🤖 Router Bot starting (polling mode)...")
        await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Challenges & Solutions

### Challenge 1: Conversation State

**Problem:** Multi-step conversations (War Stack creation) need state persistence

**Current:** FSM in Router Bot memory
```python
@router.message(StateFilter(WarStackState.waiting_for_obstacle))
async def handle_obstacle(message: Message, state: FSMContext):
    # State lost if bot restarts
```

**Solution:** State in Bridge or GAS Sheet
```python
# Option A: Bridge state storage
@app.post("/bridge/state/save")
async def save_state(request):
    # Store FSM state in JSON file or Redis

@app.get("/bridge/state/load")
async def load_state(request):
    # Restore FSM state
```

**Option B: GAS Sheet state storage**
```javascript
// Sheet: "ConversationState"
// Columns: [user_id, state_name, context_json, updated_at]

function saveState(userId, stateName, context) {
  const sheet = getStateSheet();
  // Upsert row
}

function loadState(userId) {
  const sheet = getStateSheet();
  // Find row, return state
}
```

---

### Challenge 2: Response Timing

**Problem:** GAS doPost has 30-second timeout

**Scenario:** War Stack creation takes 45 seconds (multi-step GPT calls)

**Solution:** Async processing
```javascript
// GAS doPost - return immediately
function doPost(e) {
  forwardToRouter(update);
  return ContentService.createTextOutput('processing');
  // Router Bot sends Telegram response directly (not via GAS)
}
```

Router Bot must send response directly via Telegram API (not return to GAS).

---

### Challenge 3: Extension Loading Time

**Problem:** Loading extensions on every spawn = slow startup

**Solution:** Fast extension detection
```python
# Only load extensions needed for this command
def detect_needed_extensions(text: str):
    if text.startswith('/war'):
        return ['door_flow']
    elif text.startswith('/fire'):
        return ['firemap_commands']
    else:
        return []  # Core handlers only

# Load selectively
extensions = detect_needed_extensions(update.message.text)
for ext in extensions:
    dp.include_router(load_extension(ext))
```

---

### Challenge 4: Bot Token Management

**Problem:** GAS Central Bot needs same token as Router Bot

**Solution:** Single token, multiple entry points
```
Telegram Bot Token: 123456:ABC-DEF...
  ↓
GAS Webhook:     https://script.google.com/.../exec (doPost)
  OR
Router Polling:  await bot.get_updates() (fallback)
```

Can't have both webhook and polling active simultaneously.

**Migration Path:**
1. Deploy GAS webhook
2. Set webhook: `/setWebhook`
3. Stop Router Bot polling
4. Router Bot = spawn-only mode

---

## Migration Path

### Step 1: Add Bridge Endpoint (non-breaking)
```bash
# Add /bridge/router/update to bridge/app.py
# Test manually:
curl -X POST http://127.0.0.1:8080/bridge/router/update \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "/test", "chat": {"id": 123}}}'
```

### Step 2: Add Router Single-Update Mode (non-breaking)
```bash
# Test Router Bot single-update:
python router_bot.py --single-update '{"message":{"text":"/help","chat":{"id":123}}}'
```

### Step 3: Deploy GAS Central Bot (parallel)
```bash
# Deploy gas/telegram_router.gs
# Don't set webhook yet (test manually)
```

### Step 4: Test Integration (parallel)
```bash
# GAS → Bridge → Router (manual trigger)
# Verify responses work
```

### Step 5: Switch Webhook (BREAKING - commit point)
```bash
# Set Telegram webhook to GAS
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<GAS_URL>"

# Stop Router Bot systemd service
systemctl --user stop alphaos-router.service
systemctl --user disable alphaos-router.service

# Router Bot now spawn-only
```

### Step 6: Cleanup (post-migration)
```bash
# Remove Router Bot polling code (keep single-update only)
# Update documentation
# Remove systemd service files
```

---

## Rollback Plan

**If something breaks:**

```bash
# 1. Delete Telegram webhook
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# 2. Restart Router Bot polling
systemctl --user start alphaos-router.service

# 3. Disable GAS Central Bot
# (just don't forward updates from GAS)
```

Router Bot polling works independently of GAS webhook.

---

## Testing Checklist

### Pre-Migration Tests

- [ ] Bridge endpoint responds: `curl -X POST .../bridge/router/update`
- [ ] Router single-update works: `python router_bot.py --single-update ...`
- [ ] GAS doPost receives updates (test with dummy webhook)
- [ ] GAS can reach Bridge health endpoint
- [ ] State storage works (Bridge or Sheet)

### Post-Migration Tests

- [ ] `/start` command works (GAS handles)
- [ ] `/help` command works (GAS handles)
- [ ] `/tent` command works offline (GAS cache)
- [ ] `/door` command works online (Bridge → Router)
- [ ] `/warstack` conversation works (multi-step state)
- [ ] Laptop offline → graceful fallback message
- [ ] Laptop back online → commands work again

---

## Performance Expectations

### Current (Polling)
- **RAM:** ~50MB constant
- **CPU:** ~1-2% constant (polling)
- **Latency:** < 1s (bot always ready)

### Proposed (On-Demand)
- **RAM:** ~0MB idle, ~80MB during spawn
- **CPU:** 0% idle, ~20% spike during spawn
- **Latency:** ~2-3s (spawn + process)

**Trade-off:** Slightly slower response for massive resource savings.

---

## Cost/Benefit Analysis

### Benefits
- ✅ ~50MB RAM saved (laptop idle most of time)
- ✅ 24/7 availability (GAS cloud)
- ✅ Graceful degradation (offline fallback)
- ✅ Single bot token (simpler management)
- ✅ Cloud-first architecture

### Costs
- ❌ 2-3s latency increase
- ❌ Migration complexity (2-3 hours work)
- ❌ State storage complexity
- ❌ GAS doPost 30s timeout constraint
- ❌ Testing burden (regression risk)

### Verdict: **LOW PRIORITY**
Current architecture works fine. Optimize later if resource usage becomes problem.

---

## Related Documentation

- `TENT_ARCHITECTURE.md` - Tent synthesis system
- `router/AGENTS.md` - Router Bot patterns
- `bridge/AGENTS.md` - Bridge patterns
- `gas/TENT_GAS_SETUP.md` - GAS bot setup

---

## Status: NOT STARTED

**Last Updated:** 2026-01-19
**Decision:** Defer to later (Option B - current architecture sufficient)
**Next Review:** When resource usage becomes issue OR when adding new bots

---

## Quick Reference: If We Build This

```bash
# Test single-update mode
python router/router_bot.py --single-update '{"message":{"text":"/help","chat":{"id":123}}}'

# Test Bridge endpoint
curl -X POST http://127.0.0.1:8080/bridge/router/update \
  -H "Content-Type: application/json" \
  -d @test_update.json

# Set Telegram webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<GAS_URL>"

# Delete webhook (rollback)
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```
