#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-bisync}" # pull | push | bisync

LOCAL="${VAULT_LOCAL:-$HOME/AlphaOS-Vault}"
REMOTE="${VAULT_REMOTE:-fabian:AlphaOS-Vault}"
REMOTE_BACKUP="${VAULT_REMOTE_BACKUP:-fabian:AlphaOS-Vault-backups}"
LOCAL_BACKUP="${VAULT_LOCAL_BACKUP:-$HOME/.local/share/alphaos/vault-backups}"
RCLONE_FLAGS="${VAULT_RCLONE_FLAGS:---skip-links}"

STAMP="$(date +%Y%m%d-%H%M%S)"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone not found in PATH" >&2
  exit 1
fi

mkdir -p "$LOCAL_BACKUP"

case "$MODE" in
  pull)
    # Remote → Local, keep local overwritten/deleted files in a dated local backup folder
    BACKUP_DIR="${LOCAL_BACKUP}/pull-${STAMP}"
    mkdir -p "$BACKUP_DIR"
    exec rclone sync "$REMOTE" "$LOCAL" \
      --create-empty-src-dirs \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR"
    ;;
  push)
    # Local → Remote, keep remote-overwritten/deleted files in a dated remote backup folder
    BACKUP_DIR="${REMOTE_BACKUP}/push-${STAMP}"
    exec rclone sync "$LOCAL" "$REMOTE" \
      --create-empty-src-dirs \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR"
    ;;
  bisync|*)
    # Two-way sync with backup on remote, prefer newer files on conflicts
    BACKUP_DIR="${REMOTE_BACKUP}/bisync-${STAMP}"
    exec rclone bisync "$LOCAL" "$REMOTE" \
      --create-empty-src-dirs \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR" \
      --check-sync \
      --conflict-resolve newer \
      --track-renames \
      --resilient
    ;;
esac
