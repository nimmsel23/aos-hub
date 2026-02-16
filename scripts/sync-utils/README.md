# sync-utils

Canonical sync helper scripts for the repo.

## Source of truth

- This folder is the only supported location for sync helper scripts.
- Legacy fallbacks to `scripts/utils/*` and `~/.dotfiles/*` are intentionally not used by `syncctl`.

## Scripts

- `vaultctl` - Vault copy/pull workflows.
- `rclone-domain-sync.sh` - BODY/BEING/BALANCE/BUSINESS copy flows.
- `rclone-vitaltrainer-copy.sh` - Vitaltrainer copy flows.
- `rclone-fadaro-push.sh` - FADARO push flow.
- `git-auto-sync.sh` - git helper used by sync-related tooling.
- `common.sh` - shared shell helpers for scripts in this folder.

## Entry points

- Use `scripts/syncctl` as the primary CLI.
- `scripts/aos-sync` handles target-based sync/bisync (`.env/sync.d/*.env`).
