#!/usr/bin/env bash
# Rclone FADARO Push Backup
# Usage: rclone-fadaro-push.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOG_DIR_DEFAULT="$HOME/.local/share/alphaos/logs"
LOG_FILE="${AOS_FADARO_RCLONE_LOG_FILE:-}"
LOCK_FILE="${AOS_FADARO_RCLONE_LOCK_FILE:-/tmp/rclone-fadaro-push.lock}"
if [ -z "${LOG_FILE}" ]; then
  if [ -f "$HOME/.dotfiles/logs/rclone-fadaro-push.log" ]; then
    LOG_FILE="$HOME/.dotfiles/logs/rclone-fadaro-push.log"
  else
    LOG_FILE="$LOG_DIR_DEFAULT/rclone-fadaro-push.log"
  fi
fi

LOCAL_PATH="${AOS_FADARO_LOCAL_PATH:-$HOME/Dokumente/BUSINESS/FADARO}"
REMOTE_NAME="${AOS_RCLONE_REMOTE_NAME:-eldanioo}"
REMOTE_PATH="${AOS_FADARO_REMOTE_PATH:-FADARO}"
DRY_RUN=0
BACKUP_OVERWRITES="${AOS_SYNC_BACKUP_OVERWRITES:-1}"
BACKUP_BASE_REMOTE="${AOS_SYNC_BACKUP_BASE_REMOTE:-_aos-overwrite-backups}"

RCLONE_OPTIONS=(--verbose --checksum --copy-links --create-empty-src-dirs \
  --exclude '*.tmp' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  --exclude '.obsidian/workspace*' \
  --exclude '.obsidian/workspace-mobile.json' \
  --exclude '.trash/' \
  --exclude '.git/' \
  --exclude '.smart-env/' \
  --exclude '.makemd/' \
  --exclude '.space/')

check_rclone_config() {
  if [ ! -f "$RCLONE_CONFIG" ]; then
    error "Rclone not configured. Run: rclone config"
    return 1
  fi

  if ! rclone listremotes --config "$RCLONE_CONFIG" | tr -d '\r' | grep -qx "${REMOTE_NAME}:"; then
    error "Remote '$REMOTE_NAME' not found in rclone config"
    echo "Available remotes:"
    rclone listremotes --config "$RCLONE_CONFIG"
    return 1
  fi

  return 0
}

run_push() {
  local filter_from=()
  local backup_dir=""
  local -a backup_opts=()
  local ignore_file="$LOCAL_PATH/.rcloneignore"

  if [ -f "$LOCK_FILE" ]; then
    warning "Another backup is already running (lock file exists)"
    return 1
  fi

  mkdir -p "$(dirname "$LOG_FILE")"
  touch "$LOCK_FILE"
  trap "rm -f \"$LOCK_FILE\"" EXIT

  check_rclone_config || return 1

  if [ ! -d "$LOCAL_PATH" ]; then
    error "Local path does not exist: $LOCAL_PATH"
    return 1
  fi
  if [ -f "$ignore_file" ]; then
    filter_from=(--filter-from "$ignore_file")
  fi

  rclone mkdir --config "$RCLONE_CONFIG" "${REMOTE_NAME}:${REMOTE_PATH}" 2>/dev/null || true
  if [ "$BACKUP_OVERWRITES" = "1" ]; then
    backup_dir="${REMOTE_NAME}:${BACKUP_BASE_REMOTE%/}/fadaro/push/$(date +%Y%m%d-%H%M%S)"
    backup_opts=(--backup-dir "$backup_dir")
    log "Overwrite backups enabled: $backup_dir"
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "Dry-run: pushing FADARO to ${REMOTE_NAME}:${REMOTE_PATH}"
    rclone copy "$LOCAL_PATH" "${REMOTE_NAME}:${REMOTE_PATH}" --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${backup_opts[@]}" "${filter_from[@]}" --dry-run 2>&1 | tee -a "$LOG_FILE"
  else
    log "Pushing FADARO to ${REMOTE_NAME}:${REMOTE_PATH}"
    rclone copy "$LOCAL_PATH" "${REMOTE_NAME}:${REMOTE_PATH}" --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${backup_opts[@]}" "${filter_from[@]}" 2>&1 | tee -a "$LOG_FILE"
  fi
}

main() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dry-run|--dry) DRY_RUN=1 ;;
      *) ;;
    esac
    shift || true
  done
  run_push
}

main "$@"
