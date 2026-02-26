# Bridge — CLAUDE.md

Guidelines for working with the AOS Bridge service.

## Overview

**aos-bridge** is an aiohttp-based service that handles:
- Core4 event logging + desktop notifications
- Fruits/Facts storage
- Tent summaries
- Task operations
- War Stack drafts
- Queue management + sync operations

**Service Architecture:**
- Runs as system service: `aos-bridge.service`
- Working directory: `/opt/aos/bridge` (symlink → `~/aos-hub/bridge`)
- Source location: `~/aos-hub/bridge/`
- Port: 8080
- User: `alpha`

## Development Workflow

### Making Changes

```bash
# 1. Edit source files
vim ~/aos-hub/bridge/app.py

# 2. Restart bridge (changes are live via symlink)
bridgectl restart

# 3. Check status
bridgectl status
bridgectl health
```

**No deployment needed!** `/opt/aos/bridge/` is a symlink to source.

### Running bridgectl

All commands work from anywhere (bridgectl is in PATH):

```bash
bridgectl status          # Service status
bridgectl restart         # Restart bridge
bridgectl start           # Start bridge
bridgectl stop            # Stop bridge
bridgectl logs            # Follow logs
bridgectl health          # Health check
bridgectl doctor          # Full diagnostics
bridgectl debug           # Debug info
bridgectl flush           # Flush queue
```

**Never use `sudo systemctl` directly** — use bridgectl!

## Desktop Notifications

**Feature:** Bridge sends desktop notifications when Core4 events are logged.

**Setup:** Run once (already configured):
```bash
sudo ~/aos-hub/bridge/lib/setup-notifications.sh
```

**How it works:**
1. Core4 event logged via `/bridge/core4/log`
2. Bridge calls `_send_desktop_notify()` function
3. Uses `systemd-run --user notify-send` to send notification
4. Appears as Plasma/dunst notification

**Configuration:**
- Drop-in: `/etc/systemd/system/aos-bridge.service.d/notifications.conf`
- Env vars: `DISPLAY`, `DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`
- Enable/disable: `AOS_CORE4_DESKTOP_NOTIFY=1` (default: enabled)

**Notification format:**
- Title: `Core4: {domain}/{task}`
- Body: `+{points} points | Today: {total}`
- Icon: `checkbox-checked-symbolic`

## Authentication

**Auth token:** `AOS_BRIDGE_TOKEN` in `/etc/aos/aos.env`

**Pattern:**
- **Local requests (localhost):** No token required
- **External requests (Tailscale/remote):** Token required via `X-Bridge-Token` header

**Testing with auth:**
```bash
curl -X POST http://127.0.0.1:8080/bridge/core4/log \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Token: $AOS_BRIDGE_TOKEN" \
  -d '{"domain":"body","task":"fitness","done":true}'
```

## Code Patterns

### Non-throwing Handlers

All handlers should **never throw exceptions**. Always return JSON with `ok` field:

```python
async def handle_something(request: web.Request) -> web.Response:
    try:
        # ... logic
        return web.json_response({"ok": True, "result": data})
    except Exception as e:
        LOGGER.error("something failed: %s", e)
        return web.json_response({"ok": False, "error": str(e)}, status=500)
```

### Desktop Notifications

When adding new notification triggers:

```python
# Call after successful operation
if CORE4_DESKTOP_NOTIFY:
    _send_desktop_notify(domain, task, points, total_today)
```

**Important:** Keep `subprocess.run` with `capture_output=True` for error logging!

### Environment Variables

Read at module level (not in functions):

```python
# Top of app.py
CORE4_DESKTOP_NOTIFY = os.getenv("AOS_CORE4_DESKTOP_NOTIFY", "1").strip() == "1"
BRIDGE_TOKEN = os.getenv("AOS_BRIDGE_TOKEN", "").strip()
```

### Logging

Use structured logging:

```python
LOGGER.info("core4 event logged: %s/%s total=%.1f", domain, task, total)
LOGGER.warning("desktop notify failed (rc=%d): %s", rc, stderr)
LOGGER.error("unexpected error: %s", e)
```

## Helper Scripts

Located in `bridge/lib/`:

- `setup-notifications.sh` — Configure systemd drop-in for desktop notifications
- `bridge-lib.sh` — Shared bash helpers (curl with auth, config, etc.)

**Creating new helpers:**
```bash
vim ~/aos-hub/bridge/lib/my-helper.sh
chmod +x ~/aos-hub/bridge/lib/my-helper.sh
```

## Testing

### Manual Tests

```bash
# Health check
curl http://127.0.0.1:8080/health | jq

# Core4 log (with notification)
curl -X POST http://127.0.0.1:8080/bridge/core4/log \
  -H "Content-Type: application/json" \
  -d '{"domain":"body","task":"fitness","done":true}'

# Check logs
bridgectl logs
```

### Smoke Tests

Run selftest (if available):
```bash
cd ~/aos-hub/bridge
python selftest.py
```

## Common Issues

### Notifications not appearing

**Check:**
1. Systemd drop-in exists: `ls /etc/systemd/system/aos-bridge.service.d/notifications.conf`
2. Bridge has env vars: `systemctl show aos-bridge.service | grep Environment`
3. Check logs: `journalctl -u aos-bridge.service | grep notify`
4. Test manually: `systemd-run --user --scope notify-send "Test" "Body"`

**Fix:**
```bash
sudo ~/aos-hub/bridge/lib/setup-notifications.sh
```

### "unauthorized" errors

**Problem:** External requests without token.

**Fix:** Add token to request:
```bash
-H "X-Bridge-Token: $(grep AOS_BRIDGE_TOKEN /etc/aos/aos.env | cut -d= -f2)"
```

### Service won't start

**Debug:**
```bash
bridgectl status        # Check status
journalctl -u aos-bridge.service -n 50  # Check logs
bridgectl doctor        # Full diagnostics
```

**Common causes:**
- Port 8080 already in use
- Missing dependencies (aiohttp)
- Syntax errors in app.py
- Missing env file

## File Structure

```
bridge/
├── app.py                    # Main bridge service
├── bridgectl                 # CLI wrapper (in PATH)
├── bridge-apictl             # API subcommands
├── bridge-servicectl         # Service subcommands
├── bridge-lib.sh             # Shared bash helpers
├── lib/
│   └── setup-notifications.sh   # Notification setup helper
├── CHANGELOG.md              # Change history
├── AGENTS.md                 # Component patterns
└── CLAUDE.md                 # This file
```

## Integration Points

**Receives from:**
- Index Node web UI (Core4 toggles)
- GAS HQ (webhook operations)
- Router Bot (via local API)
- CLI tools (core4ctl, etc.)

**Sends to:**
- GAS HQ (webhook forwarding)
- Telegram (tele notifications)
- Desktop (notify-send)
- Vault (file writes)
- Taskwarrior (task completion)

## Environment Variables

Key vars (see `/etc/aos/aos.env`):

```bash
AOS_BRIDGE_HOST=0.0.0.0
AOS_BRIDGE_PORT=8080
AOS_BRIDGE_TOKEN=<secret>              # Auth token for external requests
AOS_BRIDGE_TOKEN_HEADER=X-Bridge-Token

AOS_VAULT_DIR=~/vault
AOS_CORE4_LOCAL_DIR=~/.core4
AOS_FRUITS_DIR=~/vault/Alpha_Fruits
AOS_TENT_DIR=~/vault/Game/Tent

AOS_GAS_WEBHOOK_URL=<gas-url>
AOS_GAS_CHAT_ID=<telegram-id>

AOS_CORE4_NOTIFY=1                     # Telegram notifications
AOS_CORE4_DESKTOP_NOTIFY=1             # Desktop notifications (default: enabled)
AOS_CORE4_AUTO_PUSH=0                  # Auto-push to Drive

AOS_TASK_EXECUTE=1                     # Allow taskwarrior execution
```

## Deployment

**System service deployment (already done):**

```bash
# 1. Create symlink (one-time setup)
sudo ln -s /home/alpha/aos-hub/bridge /opt/aos/bridge

# 2. Service file: /etc/systemd/system/aos-bridge.service
# 3. Env file: /etc/aos/aos.env (symlink to ~/.env/aos.env)

# No deployment needed after changes — just restart:
bridgectl restart
```

## Version Control

**Before committing:**

```bash
# 1. Update CHANGELOGs
vim bridge/CHANGELOG.md        # Component-specific changes
vim ~/aos-hub/CHANGELOG.md     # Add entry to repository changelog

# 2. Test changes
bridgectl restart
bridgectl health

# 3. Commit
cd ~/aos-hub
git add bridge/
git commit -m "bridge: your change description"
```

**IMPORTANT:** Always update **both** CHANGELOGs:
- `bridge/CHANGELOG.md` — Detailed component changes
- `~/aos-hub/CHANGELOG.md` — Repository-wide changelog (one-line entry)

## See Also

- `AGENTS.md` — Component-specific patterns and gotchas
- `TODO.md` — Pending tasks and technical debt
- `CHANGELOG.md` — Component change history
- `README.md` — Bridge overview
- `~/aos-hub/CLAUDE.md` — Repository-wide guidelines
- `~/aos-hub/CHANGELOG.md` — Repository changelog (**always update before committing!**)
