# Operations

## Setup

### 1. Install Dependencies
```bash
cd ~/aos-hub/router
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your bot token
nano .env
```

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - Get from @BotFather
- `ALLOWED_USER_ID` (optional) - Restrict to specific user

### 3. Configure Bot
Edit `config.yaml` to customize:

```yaml
# Set Index API endpoint (Tailscale IP)
index_api:
  base: http://100.76.197.55:8799

# Enable/disable extensions
extensions:
  - core4_actions  # Uncomment to enable Core4 shortcuts

# Configure extensions
core4_actions:
  tags:
    fit: fitness
    # ...
```

### 4. Verify Index Node
Ensure AlphaOS Index Node is running:
```bash
# Check if Index API is accessible
curl http://100.76.197.55:8799/api/centres
```

Expected output:
```json
{
  "updated_at": "2025-12-25T...",
  "centres": [...]
}
```

## Running the Bot

### Development (Terminal)
```bash
cd ~/aos-hub/router
python router_bot.py
```

### Background (tmux)
```bash
tmux new -s router-bot
cd ~/aos-hub/router
python router_bot.py
# Detach: Ctrl+B, D
```

### Production (systemd)
Create `/etc/systemd/system/alphaos-router.service`:
```ini
[Unit]
Description=AlphaOS Router Bot
After=network.target

[Service]
Type=simple
User=alpha
WorkingDirectory=/home/alpha/aos-hub/router
EnvironmentFile=/home/alpha/aos-hub/router/.env
ExecStart=/usr/bin/python3 /home/alpha/aos-hub/router/router_bot.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable alphaos-router
sudo systemctl start alphaos-router
sudo systemctl status alphaos-router
```

## Usage

### Core Commands (Always Available)
- `/start` - Initialize bot, show menu
- `/menu` - Show all available centres
- `/reload` - Refresh centre list from Index API
- `/help` - Show help and loaded extensions

### Dynamic Commands (From Index API)
- `/voice`, `/door`, `/game`, `/frame`, `/freedom`, `/focus`, `/fire`, etc.
- Available commands depend on `menu.yaml` in the Index Node

### Extension Commands (If Enabled)
- `/fit`, `/fue`, `/med`, `/mem`, `/par`, `/pos`, `/dis`, `/dec` (Core4 extension)

## Troubleshooting

### No centres returned
**Problem:** Bot responds with "⚠️ Index API unreachable"

**Solutions:**
1. Check if Index Node is running:
   ```bash
   curl http://100.76.197.55:8799/health
   ```
2. Verify Tailscale is connected:
   ```bash
   tailscale status
   ```
3. Check `config.yaml` has correct `index_api.base` URL

### Unknown command
**Problem:** Bot responds with "❌ Unknown command: /something"

**Solutions:**
1. Use `/reload` to refresh centre list
2. Verify command exists in `menu.yaml` (Index Node)
3. Check Index API response:
   ```bash
   curl http://100.76.197.55:8799/api/centres | jq '.centres[] | .cmd'
   ```

### Extension not loading
**Problem:** Extension command doesn't work (e.g., `/fit`)

**Solutions:**
1. Check bot logs for extension load errors
2. Verify extension is enabled in `config.yaml`:
   ```yaml
   extensions:
     - core4_actions  # Must be uncommented
   ```
3. Check extension config is present
4. Restart bot after config changes

### Core4 commands not working
**Problem:** `/fit` returns "❌ No pending +fitness task due today"

**Solutions:**
1. Verify Taskwarrior is installed:
   ```bash
   which task
   ```
2. Check if task exists:
   ```bash
   task +core4 +fitness due:today status:pending
   ```
3. Verify tag mapping in `config.yaml`:
   ```yaml
   core4_actions:
     tags:
       fit: fitness  # Must match Taskwarrior tag
   ```

### Remote access not working
**Problem:** Centre URLs don't work from mobile

**Solutions:**
1. Ensure `menu.yaml` uses GAS URLs (not `/door` local paths) for remote-accessible centres
2. Check if laptop is online (Status Bot 8080)
3. Use GAS Bot as fallback when laptop is offline

## Monitoring

### Check Bot Status
```bash
# If running in tmux
tmux attach -t router-bot

# If running as systemd service
sudo systemctl status alphaos-router
journalctl -u alphaos-router -f  # Follow logs
```

### Test Commands
```bash
# Send test message to bot
# (Use your Telegram client)
/start
/menu
/reload
/help
```

### Check Extension Status
Send `/help` to bot - it will list loaded extensions.

## Maintenance

### Update Dependencies
```bash
cd ~/aos-hub/router
pip install --upgrade -r requirements.txt
```

### Reload Configuration
```bash
# Edit config.yaml
nano config.yaml

# Restart bot
# (tmux: Ctrl+C, then restart)
# (systemd: sudo systemctl restart alphaos-router)
```

### Add New Extension
1. Create `extensions/my_extension.py`
2. Add to `config.yaml`:
   ```yaml
   extensions:
     - my_extension
   my_extension:
     # config here
   ```
3. Restart bot

## Logs

**Location:**
- **Terminal**: stdout
- **Systemd**: `journalctl -u alphaos-router`
- **Tmux**: Attached session

**Log Levels:**
- `INFO` - Normal operations
- `WARNING` - Non-critical issues (e.g., stale cache)
- `ERROR` - Critical failures (e.g., extension load failed)

**Enable debug logging:**
Edit `router_bot.py`:
```python
logging.basicConfig(
    level=logging.DEBUG,  # Change from INFO
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

## Integration with Hub-and-Spoke

### Status Bot (8080)
The router bot should be paired with a status bot on port 8080:

```bash
# Test status bot
curl http://100.76.197.55:8080/health
```

### GAS Bot
GAS bot queries Status Bot, then routes to Router Bot if online:

```javascript
// GAS pseudo-code
const laptopOnline = checkStatus('http://100.76.197.55:8080/health');
if (laptopOnline) {
  routeToRouterBot(command);
} else {
  routeToGASWebApp(command);
}
```

---

**Version:** 2.0 (Dumb Core + Extensions)
**Last Updated:** 2025-12-25
