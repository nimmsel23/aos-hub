# syncvaultctl

syncvaultctl is the unified CLI + menu to control git and rclone sync jobs across the AlphaOS stack. It wraps existing tools (`vaultctl`, `aos-sync`) and uses repo-local copy scripts in `scripts/sync-utils/` (with optional fallback to dotfiles wrappers).

## Features
- Status and timer overview for core sync units.
- Gum-based interactive menu (`syncvaultctl menu`).
- Domain copy push/pull controls (BODY/BEING/BALANCE/BUSINESS).
- Domain push-sync option (delete remote to match local).
- Vitaltrainer copy push/pull controls.
- AOS target management (via `aos-sync`).
- Vault git tools (sync/status/log/diff/remote/check/setup).
- Git auto-sync for AlphaOS-Vault/Vitaltrainer/FADARO (auto-commit + pull/push).
- FADARO git auto-sync (on demand).
- FADARO auto-push timer: `fadaro-auto-push.timer` (22:30 daily).
- FADARO rclone backup timer: `fadaro-rclone-push.timer` (weekly).
- Copy mode is no-delete by default; `.rcloneignore` is respected when present.

## Requirements
- `gum` for the interactive menu.
- `systemctl --user` for timer control.
- `rclone` for actual sync actions.
- Optional: `aos-sync` in PATH (fallbacks to dotfiles path if present).

## Usage (Simple)
- `syncvaultctl` (status overview)
- `syncvaultctl sync` (safe sync all, no deletes)
- `syncvaultctl pull` (safe pull all, no deletes)
- `syncvaultctl menu` (simple menu)
- `syncvaultctl advanced` (advanced menu)

## Usage (Advanced)
- `syncvaultctl timers` (systemd timers)
- `syncvaultctl domains` (domain copy status)
- `syncvaultctl vault status`
- `syncvaultctl vault check`
- `syncvaultctl log` (last 10 pushed files per domain)
- `syncvaultctl vault-sync`
- `syncvaultctl vitaltrainer-sync`
- `syncvaultctl fadaro-sync`

## Aliases
Stored in:
- `~/.dotfiles/config/bash/.bash_aliases`
- `~/.dotfiles/config/shell/domain-aliases.sh` (shared for bash + zsh)

Domain aliases:
- `body_push`, `body_pull`, `body_push_sync`
- `being_push`, `being_pull`, `being_push_sync`
- `balance_push`, `balance_pull`, `balance_push_sync`
- `business_push`, `business_pull`, `business_push_sync`

Vitaltrainer aliases:
- `vitaltrainer_push`, `vitaltrainer_pull`

## Update flow
syncvaultctl lives in this repo:
- Script: `/home/alpha/aos-hub/scripts/syncvaultctl`
- Symlink: `/home/alpha/.dotfiles/bin/syncvaultctl`

To update:
1) Pull latest `aos-hub` changes: `cd ~/aos-hub && git pull`
2) Restart your shell session (or re-run `syncvaultctl`)

If you maintain local edits:
- Commit your changes or rebase them on top of the updated repo.

## Notes
- Copy runs do not delete; cleanup must be manual.
- `push-sync` uses `rclone sync` and deletes remote files not present locally.
- Vitaltrainer copy runs use rclone copy with `--copy-links` (follows symlinks).
- Git auto-sync uses `git-sync-enforcer autosync` when available (fallback: repo-local `git-auto-sync.sh`).
- Set `AOS_GIT_NOTIFY=1` to send Telegram notifications on auto-sync pushes (requires `tele`).
- Timers are managed in `~/.config/systemd/user`.
- `AOS_COMPACT=1` makes domain status output shorter (used by `syncvaultctl status`).
- `AOS_LOG_LIMIT=10` controls how many files `syncvaultctl log` shows.

## Repo-local sync utils (source of truth)

Canonical scripts live in this repo and are used by syncvaultctl:
- `scripts/sync-utils/vaultctl`
- `scripts/sync-utils/rclone-domain-sync.sh`
- `scripts/sync-utils/rclone-vitaltrainer-copy.sh`
- `scripts/sync-utils/git-auto-sync.sh`

Dotfiles scripts are thin wrappers that forward into these files.
