# hookctl

Taskwarrior hook manager for AlphaOS.

## What it does

- Installs Taskwarrior hooks from the repo into `~/.task/hooks`.
- Manages hook configuration in `~/.config/alpha-os/hooks.env`.
- Provides a quick preview of hook output.

## Files and paths

- Script: `aos-hub/scripts/hookctl`
- Hook sources:
  - `aos-hub/scripts/taskwarrior/on-add.alphaos.py`
  - `aos-hub/scripts/taskwarrior/on-modify.alphaos.py`
  - `aos-hub/scripts/taskwarrior/on-exit.alphaos.py`
- Install target: `~/.task/hooks/`
- Hook env file: `~/.config/alpha-os/hooks.env`

## Commands

```
hookctl install
hookctl status
hookctl env
hookctl set-target tele|bridge
hookctl set-format human|json
hookctl set-silent on|off
hookctl preview [add|modify|core4]
hookctl menu
hookctl help
```

## How it works

- `on-add` and `on-modify` send task payloads to either:
  - `tele` (local CLI) or
  - Bridge (`/bridge/task/operation`) when `AOS_HOOK_TARGET=bridge`
- `on-exit` writes a Taskwarrior export snapshot (fail-soft):
  - Default: `~/.local/share/alphaos/task_export.json`
  - Optional vault copy: `~/AlphaOS-Vault/.alphaos/task_export.json`

## Key env vars (hooks.env)

- `AOS_HOOK_TARGET=tele|bridge`
- `AOS_HOOK_TELE_BIN=tele`
- `AOS_HOOK_TELE_FORMAT=human|json`
- `AOS_HOOK_TELE_SILENT=1`
- `AOS_BRIDGE_URL=http://127.0.0.1:8080`
- `AOS_TASK_EXPORT_*` (export snapshot settings for on-exit)

## Quick check

```
hookctl status
hookctl preview modify
```
