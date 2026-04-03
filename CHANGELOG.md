# aos-hub — Changelog

All notable changes to the aos-hub repository.

## Format

Each entry should include:
- **Component** (bridge/router/index/scripts/core4)
- **Type** (feat/fix/refactor/docs)
- **Description**

## Unreleased

### 2026-03-28

**index-node / pwa:**
- fix: Core4 PWA Port 8781 → 8728 (Mnemonik: 8 Habits, 7 Tage, 28 Punkte)
- refactor: Port-Referenz in menu.yaml, server.js, aosctl, scripts/alphaos.zsh aktualisiert
- refactor: systemd-Unit pwa-core4-ctx.service Port angepasst
- refactor: Monitoring-Skripte boot-notify-enhanced, aos-node-tui, aos-node-watch aktualisiert
- fix: core4ctx.zsh CTX_DEFAULT_URL 8788 → 8728 (war fälschlicherweise vital-hub Coach-Port)

**bridge:**
- refactor: eigene bridge.env statt aos.env (nur bridge-relevante Vars)
- fix: Service EnvironmentFile → ~/.env/bridge.env

**core4:**
- fix: core4_paths.py Fallback auf ~/.core4 (statt vault/Core4)
- refactor: core4_paths.py liest ~/.env/core4.env statt /etc/aos/aos.env
- fix: Tracker + Bridge + c4 zeigen alle auf gleichen Datenpfad ~/.core4
- feat: Neue ~/.env/core4.env für Tracker (Storage, Vault, Bridge-URL)
- refactor: systemd user service (aos-bridge.service) → system service (/etc/systemd/system)
- fix: aos-bridge.service User=alpha mit EnvironmentFile=/etc/aos/bridge.env
- docs: bridge.env Symlink /etc/aos/bridge.env ← ~/.env/bridge.env

**aos-dev (NEW):**
- feat: core4-server.js — Standalone Core4 PWA server (port 8728)
  - Imports routes/core4.js directly (no monolithic imports)
  - Serves public/core4/ statically (clean structure, no /pwa prefix)
  - Exports: createApp(), startServer() functions
  - API endpoints: /api/core4/* (inherited from routes/core4.js)
  - Zero Bridge/Index-Node dependencies — completely independent
  - Template for future standalone servers (fire, fitness, etc.)
  - First implementation of doorctx-server.js pattern in aos-dev

**index-node:**
- fix: scanForCore4Metrics() liest Week-JSON aus ~/.core4/ statt vault/Core4/

### 2026-02-26

**bridge:**
- feat: Desktop notifications via notify-send when Core4 events logged (AOS_CORE4_DESKTOP_NOTIFY=1)
- feat: Systemd drop-in for DISPLAY/DBUS env vars (/etc/systemd/system/aos-bridge.service.d/notifications.conf)
- feat: Helper script lib/setup-notifications.sh for notification setup
- docs: Add CLAUDE.md with development guidelines

**core4:**
- feat: core4ctl sources shows latest event (date, habit, timestamp) per source directory
- feat: Support both ISO timestamp formats (dashes and compact)
- refactor: vault → vault path migration (core4_types.py, core4_paths.py)
- docs: Update CHANGELOG.md

**scripts:**
- refactor: hubctl simplified (465→315 lines, grouped commands, cleaner output)
- refactor: nodectl simplified (430→291 lines, delegation to indexctl)
- docs: Both scripts now have cleaner help and grouped command structure
- refactor: Fire scripts split into Game pillar canonicals (`game/fire/setup-fire-map.sh`, `game/fire/setup-fire-reports.sh`, `game/fire/fire-to-tasks.sh`) with `scripts/*` compatibility wrappers
- refactor: `scripts/firectl` reduced to compatibility wrapper; canonical implementation moved to `game/fire/firectl`

**game:**
- refactor: Fire bot/engine canonicalized under `game/fire/` (`firemap_bot.py`, `firemap.py`, `requirements.txt`)
- refactor: `game/python-firemap/*` kept as legacy compatibility wrappers/mirror docs for older paths
- fix: Fire setup helper (`game/fire/fire_map_setup.sh`) now points to canonical setup script and current timer name (`alphaos-fire-weekly.timer`)
- fix: `firemap` CLI now uses canonical Fire bot path, ISO week-year (`%G`) and safer map listing (no `ls` word-splitting)

**aos:**
- refactor: `aos` defines explicit pillar root dirs and prefers pillar-local Fire/Game/Door entrypoints (e.g. `game/fire/firectl`, `game/gamectl`)

**router:**
- refactor: Fire router extension/config now default to `game/fire/firemap_bot.py`

**docs:**
- refactor: Fire docs updated to canonical `game/fire/*` paths (setup scripts, fire-to-tasks, bot/engine) with compatibility notes

**gas:**
- feat: terminal.gs drivepull/localpull commands for manual Drive→local sync

**env:**
- fix: Bridge rclone sync config (AOS_RCLONE_REMOTE=eldanioo:Alpha_HQ)
- fix: Core4 paths updated for vault migration

## 2026-02-20

**bridge:**
- fix: Bridge deployment changed to symlink (/opt/aos/bridge → ~/aos-hub/bridge)
- fix: Auth token support for external requests (local requests no token needed)

## Earlier Changes

See component-specific CHANGELOGs:
- `bridge/CHANGELOG.md`
- `core4/CHANGELOG.md`
- `router/CHANGELOG.md`
