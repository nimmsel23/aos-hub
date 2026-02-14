# AOS Hub

Single control surface for αOS services, scripts, and centres.

## Core Entry Points

- `aosctl` — unified dispatcher (menu + status + doctor + component routing)
- `hubctl` — alias to `aosctl`
- `nodectl` — Index Node operator (status/health/open/dev/autoreload)
- `indexctl` — Index Node systemd install/env/health
- `routerctl` — Router bot control
- `bridgectl` — Bridge service control
- `syncctl` — Rclone sync control (targets + vault copy)
- `gitctl` — Git sync control (vault/vitaltrainer/fadaro)
- `syncvaultctl` — Legacy wrapper to `syncctl`
- `firectl` — Fire tooling wrapper (bot + installers)
- `envctl` — Environment manager (`~/.env` service files)
- `aos-aliasctl` — Alias manager (multi‑shell)

## Quick Start

```bash
# Menu (Gum if available)
aosctl

aosctl menu

aosctl status

aosctl ping

aosctl doctor

# Index UI
aosctl index status
nodectl open
nodectl dev

# Router / Bridge
aosctl router status
aosctl bridge status

# Sync
aosctl sync status
syncctl status
gitctl status

# Env / Aliases
aosctl env list
aosctl alias ui
```

## Command Map (What To Type)

- **One‑stop menu**: `aosctl` or `hubctl`
- **Status (no logs + heartbeat ping)**: `aosctl status`
- **Heartbeat ping only**: `aosctl ping`
- **System health**: `aosctl doctor`
- **Index UI**: `nodectl` (or `aosctl index status`)
- **Router Bot**: `routerctl`
- **Bridge**: `bridgectl`
- **Sync (rclone)**: `syncctl` (legacy: `syncvaultctl`)
- **Git Sync**: `gitctl`
- **Env manager**: `envctl` or `aosctl env`
- **Alias manager**: `aos-aliasctl` or `aosctl alias`

## Aliases (Zsh)

Defined in `~/.dotfiles/config/zsh/system-aliases.zsh`:

```bash
alias aos='~/aos-hub/aos'
alias aosctl='~/aos-hub/aosctl'
alias hubctl='~/aos-hub/aosctl'
alias syncctl='~/aos-hub/scripts/syncctl'
alias gitctl='~/aos-hub/scripts/gitctl'
alias vaultctl='~/aos-hub/scripts/syncvaultctl'
alias vaultct='~/aos-hub/scripts/syncvaultctl'
alias indexctl='~/aos-hub/scripts/indexctl'
alias bridgectl='~/aos-hub/bridgectl'
alias routerctl='~/aos-hub/routerctl'
alias nodectl='~/aos-hub/nodectl'
```

If `~/aos-hub` is already in `PATH`, aliases are optional but provide consistent names.

## Services & Units

- Index Node: `aos-index-dev.service`
- Index auto‑reload watchers:
  - `aos-index-dev-menu.path` (watches `menu.yaml`)
  - `aos-index-dev-public.path` (watches `public/` assets)
- Restart helper: `aos-index-dev-restart.service`

Status examples:

```bash
systemctl --user status aos-index-dev.service
systemctl --user status aos-index-dev-menu.path aos-index-dev-public.path
```

## Index Node (Port 8799)

- Working dir: `~/aos-hub/index-node`
- Service file: `~/.config/systemd/user/aos-index-dev.service`
- Health: `http://127.0.0.1:8799/health`
- Menu: `http://127.0.0.1:8799/menu`
- Service runs `npm run dev` (nodemon) for live reload

Hot‑reload control:

```bash
nodectl autoreload on
nodectl autoreload off
```

Dev vs service:
- `nodectl dev` runs `npm run dev` in the foreground (no systemd)
- `nodectl start|stop|restart` controls the systemd service

## Env Management (`envctl`)

`envctl` manages the global env file under `~/.env/`.

Common file:

- `~/.env/aos.env`

Examples:

```bash
envctl list
envctl get aos
envctl set aos TELEGRAM_BOT_TOKEN <token>
envctl edit aos
```

## Alias Management (`aos-aliasctl`)

Multi‑shell alias manager for zsh/fish/bash configs.

```bash
aos-aliasctl ui
```

## Paths

- Index Node: `~/aos-hub/index-node`
- Scripts: `~/aos-hub/scripts`
- Systemd units: `~/.config/systemd/user/`

## Troubleshooting

- Port 8799 stuck: `nodectl fix`
- Index unit: `indexctl status`
- Full health: `aosctl doctor`
- Quick status: `aosctl status`
- Heartbeat ping: `aosctl ping`
- Env issues: `envctl doctor`

## Notes

- `aosctl` defaults to Gum menu when available; otherwise prints help.
- `hubctl` is intentionally the same as `aosctl` so either name works.
- `nodectl` is index‑only, but can surface router/bridge/index doctors in `nodectl all`.
- `aosctl status` performs a heartbeat ping via `routerctl heartbeat ping`.
