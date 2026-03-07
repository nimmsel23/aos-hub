#!/usr/bin/env bash
# Push backup for ~/vital-hub (rclone copy, no deletes).
#
# Env:
#   AOS_VITAL_HUB_LOCAL_PATH=$HOME/vital-hub
#   AOS_VITAL_HUB_REMOTE=eldanioo:alpha/vital-hub
#   AOS_VITAL_HUB_COPY_LINKS=1|0
#   AOS_VITAL_HUB_LOG_FILE=...
#   AOS_VITAL_HUB_LOCK_FILE=/tmp/rclone-vital-hub-push.lock
#   AOS_RCLONE_CONFIG=$HOME/.config/rclone/rclone.conf
#   AOS_LOG_DIR=$HOME/.local/share/alphaos/logs
#
# Usage:
#   rclone-vital-hub-push.sh status
#   rclone-vital-hub-push.sh push [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

LOCAL_PATH="${AOS_VITAL_HUB_LOCAL_PATH:-$HOME/vital-hub}"
REMOTE="${AOS_VITAL_HUB_REMOTE:-eldanioo:alpha/vital-hub}"
RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOG_DIR="${AOS_LOG_DIR:-$HOME/.local/share/alphaos/logs}"
LOG_FILE="${AOS_VITAL_HUB_LOG_FILE:-$LOG_DIR/vital-hub-push.log}"
LOCK_FILE="${AOS_VITAL_HUB_LOCK_FILE:-/tmp/rclone-vital-hub-push.lock}"
COPY_LINKS_MODE="${AOS_VITAL_HUB_COPY_LINKS:-1}"
DRY_RUN=0
BACKUP_OVERWRITES="${AOS_SYNC_BACKUP_OVERWRITES:-1}"
BACKUP_BASE_REMOTE="${AOS_SYNC_BACKUP_BASE_REMOTE:-_aos-overwrite-backups}"

is_remote_root() {
  case "$REMOTE" in
    *:) return 0 ;;
    *:/) return 0 ;;
  esac
  return 1
}

acquire_lock() {
  mkdir -p "$(dirname "$LOG_FILE")"
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      warning "Another vital-hub push is already running (lock: $LOCK_FILE)"
      exit 0
    fi
    return 0
  fi

  if [ -f "$LOCK_FILE" ]; then
    warning "Another vital-hub push may be running (lock file exists: $LOCK_FILE)"
    exit 0
  fi
  touch "$LOCK_FILE"
  trap 'rm -f "$LOCK_FILE"' EXIT
}

status() {
  echo "vital-hub push"
  echo "  local:  $LOCAL_PATH"
  echo "  remote: $REMOTE"
  echo "  config: $RCLONE_CONFIG"
  echo "  log:    $LOG_FILE"
  echo "  links:  $([[ "$COPY_LINKS_MODE" == "1" ]] && echo copy || echo skip)"
  if [ -d "$LOCAL_PATH" ]; then
    success "local path exists"
  else
    warning "local path missing: $LOCAL_PATH"
  fi
  if [ -f "$RCLONE_CONFIG" ]; then
    success "rclone config present"
  else
    warning "rclone config missing"
  fi
}

push() {
  acquire_lock

  if [ ! -f "$RCLONE_CONFIG" ]; then
    warning "rclone config missing; nothing to do ($RCLONE_CONFIG)"
    exit 0
  fi

  if [ ! -d "$LOCAL_PATH" ]; then
    error "Local path not found: $LOCAL_PATH"
    sync_alert_error "vital-hub" "local path missing: $LOCAL_PATH"
    exit 1
  fi

  if is_remote_root; then
    error "Refusing remote root destination: '$REMOTE' (set AOS_VITAL_HUB_REMOTE to a folder like 'eldanioo:alpha/vital-hub')"
    sync_alert_error "vital-hub" "remote root refused: $REMOTE"
    exit 1
  fi

  local -a rclone_opts=(
    --config "$RCLONE_CONFIG"
    --create-empty-src-dirs
    --fast-list
    --log-file "$LOG_FILE"
    --log-level INFO
    --exclude ".git/**"
    --exclude "**/node_modules/**"
    --exclude "**/.venv/**"
    --exclude "**/__pycache__/**"
    --exclude "**/.pytest_cache/**"
    --exclude "**/.mypy_cache/**"
    --exclude "**/.ruff_cache/**"
    --exclude "**/.cache/**"
    --exclude "**/.DS_Store"
    --exclude "**/Thumbs.db"
    --exclude "**/*.tmp"
  )
  local -a backup_opts=()

  if [ "$COPY_LINKS_MODE" = "1" ]; then
    rclone_opts+=(--copy-links)
  else
    rclone_opts+=(--skip-links)
  fi

  if [ "$BACKUP_OVERWRITES" = "1" ]; then
    local backup_dir="${REMOTE%%:*}:${BACKUP_BASE_REMOTE%/}/vital-hub/push/$(date +%Y%m%d-%H%M%S)"
    backup_opts+=(--backup-dir "$backup_dir")
    log "Overwrite backups enabled: $backup_dir"
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "Dry-run: pushing vital-hub to $REMOTE (copy)"
    if rclone copy "$LOCAL_PATH" "$REMOTE" "${rclone_opts[@]}" "${backup_opts[@]}" --dry-run; then
      success "vital-hub push completed (dry-run)"
      sync_alert_success "vital-hub" "dry-run $LOCAL_PATH -> $REMOTE"
      return 0
    fi
    error "vital-hub push failed (dry-run)"
    sync_alert_error "vital-hub" "dry-run $LOCAL_PATH -> $REMOTE"
    return 1
  fi

  log "Pushing vital-hub to $REMOTE (copy)"
  if rclone copy "$LOCAL_PATH" "$REMOTE" "${rclone_opts[@]}" "${backup_opts[@]}"; then
    success "vital-hub push completed"
    sync_alert_success "vital-hub" "$LOCAL_PATH -> $REMOTE"
    return 0
  fi

  error "vital-hub push failed"
  sync_alert_error "vital-hub" "$LOCAL_PATH -> $REMOTE"
  return 1
}

main() {
  local cmd="${1:-push}"
  shift || true

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dry-run|--dry) DRY_RUN=1 ;;
      *) ;;
    esac
    shift || true
  done

  case "$cmd" in
    status) status ;;
    push|"") push ;;
    *)
      echo "Usage: $(basename "$0") <status|push> [--dry-run]" >&2
      exit 2
      ;;
  esac
}

main "$@"
