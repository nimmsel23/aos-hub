# Sync tooling overview

This repo has a few different “sync” mechanisms. This doc explains the hierarchy and where configuration lives.

## 1) `syncctl` (entry point)

`scripts/syncctl` is the top-level CLI that provides:

- **Targets**: forwards to `scripts/aos-sync` (engine) and optionally `scripts/aos-syncctl` (gum UI)
- **Vault copy**: forwards to `scripts/sync-utils/vaultctl`
- **Domains copy**: forwards to `scripts/sync-utils/rclone-domain-sync.sh`
- **Vitaltrainer copy**: forwards to `scripts/sync-utils/rclone-vitaltrainer-copy.sh`
- **FADARO push**: forwards to `scripts/sync-utils/rclone-fadaro-push.sh`

If `sync-utils/` scripts are missing, `syncctl` may fall back to `scripts/utils/` (legacy).

## 2) `aos-sync` targets (rclone sync/bisync)

`scripts/aos-sync` runs a configured target with `rclone sync` or `rclone bisync`.

### Target config location

Targets are plain shell env files named `<target>.env` in:

1. `AOS_SYNC_CONF_DIR` (recommended)
2. `<repo>/.env/sync.d` (recommended default)
3. legacy: `~/.dotfiles/config/aos/sync.d` (auto-detected if it contains `.env` files)

### Target config format

Each `<target>.env` typically contains:

- `AOS_REMOTE="remote:path"` (e.g. `eldanioo:Alpha_Voice`)
- `AOS_LOCAL="/local/path"`
- `AOS_MODE="sync"` or `AOS_MODE="bisync"`
- `AOS_LOG_DIR`, `AOS_LOG_FILE` (optional)
- `AOS_POST_HOOK` (optional executable to run after a successful sync)

Use `scripts/aos-syncctl` to create/edit these interactively.

### Timers

Targets can be scheduled via user units:

- `aos-sync@<target>.service`
- `aos-sync@<target>.timer`

`aos-sync enable <target> [--at HH:MM]` writes a timer override drop-in under:
`~/.config/systemd/user/aos-sync@<target>.timer.d/override.conf`

## 3) Copy-style sync helpers (vault/domains/vitaltrainer/fadaro)

These are “copy” flows (usually `rclone copy`) and are separate from `aos-sync` targets:

- `scripts/sync-utils/vaultctl` — push/pull copy of Vault subfolders to multiple remotes
- `scripts/sync-utils/rclone-domain-sync.sh` — push/pull per domain (BODY/BEING/BALANCE/BUSINESS)
- `scripts/sync-utils/rclone-vitaltrainer-copy.sh` — push/pull Vitaltrainer
- `scripts/sync-utils/rclone-fadaro-push.sh` — push FADARO

## 4) Global env (`aos.env`)

Most scripts now source a single global env file (optional):

- preferred: `<repo>/.env/aos.env` (in this repo `.env` is a symlink to `~/.env`)
- fallback: `~/.env/aos.env`
- override: `AOS_ENV_FILE=/path/to/aos.env`

Useful keys for sync live in `scripts/aos.env.example`.

