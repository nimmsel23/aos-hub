# systemd Services

This directory contains systemd service and timer files for the aos-hub infrastructure.

## Service Types

### User Services (Recommended)
Services that run under your user account, don't require root.

**Location:** `~/.config/systemd/user/`

**Active Services (Dev/User):**
- `aos-index-dev.service` - Index Node (dev)
- `aos-pwa-dev.service` - Standalone PWA runtime (mode via `~/.env/pwa.env`)
- `aos-router-dev.service` - Router Bot (dev)
- `aos-bridge-dev.service` - Bridge (dev)

**Active Timers:**
- `aos-hub-push.timer` (optional, user scope mirror sync)

**Behavior:**
- User services only use user-owned env files (e.g. `~/.env/*.env`). They must not depend on `/etc/*`.
- User services require a user session (login) to be started.

### System Services (Optional / Infra)
Services that run as system services, require root installation.

**Location:** `/etc/systemd/system/`

**Available:**
- `aos-router.service` - Router Bot (system-wide)
- `aos-bridge.service` - Bridge (system-wide)
- `aos-vault-push-eldanioo.service` + `.timer` - Vault sync
- `dokumente-push-fabian.service` + `.timer` - Dokumente sync

**Behavior:**
- System services use `/etc/aos/*` for EnvironmentFile entries.
- System services can run without any user logged in (ideal for always-on services).

## Index Node Runtime Mode

The Index Node is operated as a user service:

- `aos-index-dev.service` (systemd user scope)
- `scripts/indexctl` and `index-node/nodectl` are user-service-only for index control.

Note: If your user service name differs (legacy installs), set:

`AOS_INDEX_USER_SERVICE=<legacy-user-unit>.service`

## PWA Runtime Mode

The standalone PWA runtime is operated as a user service:

- `aos-pwa-dev.service` (systemd user scope)
- mode source: `~/.env/pwa.env`

Supported mode values:

- `AOS_PWA_RUN_MODE=dev` -> `npm run pwa:dev`
- `AOS_PWA_RUN_MODE=normal` -> `npm run pwa`

Template:

- `systemd/user/pwa.env.example`

## Installation

### User Services (No Root Required)

```bash
# Index Node
cp systemd/user/aos-index-dev.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable aos-index-dev.service
systemctl --user start aos-index-dev.service

# Standalone PWA runtime
cp systemd/user/aos-pwa-dev.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable aos-pwa-dev.service
systemctl --user start aos-pwa-dev.service

# Router Bot (dev/user)
cd router
./routerctl unit
./routerctl enable
./routerctl start

# Bridge (dev/user)
cd bridge
./bridgectl enable
```

### System Services (Requires Root)

```bash
# Create env file
sudo mkdir -p /etc/aos
sudo cp systemd/aos.env.example /etc/aos/aos.env
sudo nano /etc/aos/aos.env  # Edit paths

# Install services (router/bridge/sync)
sudo cp systemd/aos-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable aos-router.service aos-bridge.service
sudo systemctl start aos-router.service aos-bridge.service
```

## Configuration

### Index Node User Service

**File:** `~/.config/systemd/user/aos-index-dev.service`

**Critical Settings:**

```ini
[Service]
WorkingDirectory=%h/aos-hub/index-node
Environment=HOST=0.0.0.0
Environment=PORT=8799
ExecStart=/usr/bin/npm run dev

# Security Hardening
ProtectSystem=strict
ProtectHome=read-only

# Required Write Access (Added 2026-01-01)
ReadWritePaths=%h/.task                    # Taskwarrior database
ReadWritePaths=%h/.local/share/alphaos     # Task export + sync map
ReadWritePaths=%h/.alpha_os                # TickTick config
ReadWritePaths=%h/vault            # Door/Game/Voice exports
```

**Why ReadWritePaths is Critical:**

1. **Taskwarrior Integration:**
   - SQLite database uses WAL (Write-Ahead Logging) mode
   - Requires write access to `~/.task/taskchampion.sqlite3`
   - Without it: "Error code 14: Unable to open the database file"

2. **Task Export:**
   - Index Node generates `/api/taskwarrior/tasks` from export file
   - Needs write to `~/.local/share/alphaos/task_export.json`

3. **TickTick Sync:**
   - UUID mapping in `~/.local/share/alphaos/task_sync_map.json`
   - Config in `~/.alpha_os/tick.env`

4. **Centre Exports:**
   - Door: War Stacks → `~/vault/Door/War-Stacks/`
   - Game: Maps → `~/vault/Game/`
   - Voice: Sessions → `~/vault/VOICE/`

**Environment Variables:**

Can be set via:
1. Service file `Environment=` directives
2. Env file: `~/.env/aos.env` (via `EnvironmentFile=`)

See `index-node/README.md` for full list.

### Router Bot User Service

Managed via `router/routerctl` - see `router/README.md`.

**Key Features:**
- Auto-installs to `~/.config/systemd/user/aos-router-dev.service`
- Includes heartbeat timer (optional)
- Single-env support (`~/.env/aos.env`)

### Bridge User Service

Managed via `bridge/bridgectl` - see `bridge/README.md`.

**Key Features:**
- Auto-installs to `~/.config/systemd/user/aos-bridge-dev.service`
- Port 8080
- Requires env: `~/.env/aos.env`

## Common Operations

### Check Status

```bash
# User services
systemctl --user status aos-index-dev.service
systemctl --user status aos-router-dev.service
systemctl --user status aos-bridge-dev.service

# System services
sudo systemctl status aos-router.service aos-bridge.service

# Health check
./scripts/aos-doctor
```

### View Logs

```bash
# User services
journalctl --user -u aos-index-dev.service -f
journalctl --user -u aos-router-dev.service -f

# System services
sudo journalctl -u aos-router.service -f
sudo journalctl -u aos-bridge.service -f

# Recent errors
journalctl --user -u aos-index-dev.service --since "1 hour ago" | grep -i error
```

### Restart After Config Changes

```bash
# User services
systemctl --user daemon-reload
systemctl --user restart aos-index-dev.service

# System services
sudo systemctl daemon-reload
sudo systemctl restart aos-router.service aos-bridge.service
```

### Enable/Disable Services

```bash
# User services
systemctl --user enable aos-index-dev.service   # Start on boot (with linger)
systemctl --user disable aos-index-dev.service

# For always-on (even when not logged in)
sudo loginctl enable-linger alpha
```

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
journalctl --user -u aos-index-dev.service --since "5 minutes ago"
```

**Common Issues:**

1. **WorkingDirectory doesn't exist:**
   ```
   Failed to set up mount namespacing: No such file or directory
   ```
   Fix: Update `WorkingDirectory=%h/aos-hub/index-node` to correct path

2. **Permission denied (ReadWritePaths):**
   ```
   EACCES: permission denied
   ```
   Fix: Add directory to `ReadWritePaths=`

3. **Port already in use:**
   ```
   Error: listen EADDRINUSE :::8799
   ```
   Fix: `ss -tlnp | grep 8799` to find conflicting process

4. **Environment variables not loaded:**
   Fix: Add `EnvironmentFile=` or inline `Environment=` directives

### Taskwarrior Integration Broken

**Symptom:**
```json
{"ok": false, "error": "Error code 14: Unable to open the database file"}
```

**Fix:**
Ensure `ReadWritePaths=%h/.task` is in service file (see Configuration section above).

### Service Fails on Boot

**Issue:** Service tries to start before network is ready

**Fix:**
```ini
[Unit]
Wants=network-online.target
After=network-online.target
```

## Security Considerations

### Hardening (User Services)

The user services use systemd hardening options:

```ini
NoNewPrivileges=true           # Can't gain privileges
PrivateTmp=true                # Isolated /tmp
ProtectSystem=strict           # Read-only system dirs
ProtectHome=read-only          # Read-only home (except ReadWritePaths)
ProtectControlGroups=true      # No cgroup manipulation
ProtectKernelTunables=true     # No kernel tuning
ProtectKernelModules=true      # No module loading
LockPersonality=true           # Prevent personality changes
RestrictSUIDSGID=true          # Prevent SUID/SGID
```

**Trade-off:** More restrictions = more explicit `ReadWritePaths` needed

### Relaxing Security (If Needed)

If hardening causes issues, you can relax:

```ini
# Remove ProtectHome to allow all home writes
# ProtectHome=read-only

# Or switch to less strict
ProtectSystem=full  # Instead of 'strict'
```

**Not recommended** unless you understand the implications.

## File Structure

```
systemd/
├── README.md                           # This file
├── aos.env.example             # Example system env
├── aos-router.service                  # System service
├── aos-bridge.service                  # System service
├── alphaos-vault-sync-pull.service     # Vault pull on boot
├── alphaos-vault-sync-push.service     # Vault push on shutdown
├── aos-vault-push-eldanioo.service     # Vault sync (timer)
├── aos-vault-push-eldanioo.timer       # Daily 23:00
├── dokumente-push-fabian.service       # Dokumente sync
├── dokumente-push-fabian.timer         # Daily 23:00
└── user/
    ├── aos.env.example         # Example user env
    └── aos-bridge.service              # Example user service
```

**Note:** Active user service with critical fixes lives at:
- `~/.config/systemd/user/aos-index-dev.service` (includes ReadWritePaths)
- `~/.config/systemd/user/alphaos-router.service` (managed by routerctl)
- `~/.config/systemd/user/aos-bridge.service` (managed by bridgectl)

The repo `systemd/user/` directory only contains example/template files.
See CHANGELOG.md for details on the 2026-01-01 ReadWritePaths fix.

## Best Practices

1. **Prefer User Services:**
   - No root required
   - Isolated to your account
   - Easier to debug

2. **Use Control Scripts:**
   - `router/routerctl` for Router Bot
   - `bridge/bridgectl` for Bridge
   - `scripts/aos-doctor` for health checks

3. **Environment Files:**
   - Store secrets in `~/.env/*.env`
   - Use `EnvironmentFile=-/path/to/file` (- = optional)
   - Never commit `.env` files to git

4. **Logging:**
   - Services log to journal (systemd)
   - Use `journalctl` for debugging
   - Set up log rotation if needed

5. **Monitoring:**
   - Run `./scripts/aos-doctor` regularly
   - Check heartbeat timer status
   - Monitor resource usage

## Migration Notes

### From Codex to Claude Code (2026-01-01)

**Changes Made:**
- Added `ReadWritePaths` for Taskwarrior integration
- Documented security hardening implications
- Created this README for maintainability

**No Breaking Changes:**
- All existing services continue to work
- Only fix was permissions (not functionality)

## References

- [systemd.service(5)](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [systemd.exec(5)](https://www.freedesktop.org/software/systemd/man/systemd.exec.html) - Hardening options
- [systemd/User](https://wiki.archlinux.org/title/Systemd/User) - Arch Wiki guide
