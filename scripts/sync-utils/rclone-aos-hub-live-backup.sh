#!/usr/bin/env bash
# Live backup for ~/aos-hub -> rclone remote (copy + versioned history).
#
# Usage:
#   rclone-aos-hub-live-backup.sh [run|doctor] [--dry-run]
#
# Env (optional):
#   AOS_HUB_LIVE_LOCAL_PATH=$HOME/aos-hub
#   AOS_HUB_LIVE_REMOTE_CURRENT=eldanioo:.aos-hub/live/current
#   AOS_HUB_LIVE_REMOTE_HISTORY_ROOT=eldanioo:.aos-hub/live/history
#   AOS_RCLONE_CONFIG=$HOME/.config/rclone/rclone.conf
#   AOS_HUB_LIVE_LOG_FILE=$HOME/.local/share/alphaos/logs/aos-hub-live-backup.log
#   AOS_HUB_LIVE_LOCK_FILE=/tmp/rclone-aos-hub-live-backup.lock
#   AOS_HUB_LIVE_COPY_LINKS=0|1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

LOCAL_PATH="${AOS_HUB_LIVE_LOCAL_PATH:-$HOME/aos-hub}"
REMOTE_CURRENT="${AOS_HUB_LIVE_REMOTE_CURRENT:-eldanioo:.aos-hub/live/current}"
REMOTE_HISTORY_ROOT="${AOS_HUB_LIVE_REMOTE_HISTORY_ROOT:-eldanioo:.aos-hub/live/history}"
RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOG_FILE="${AOS_HUB_LIVE_LOG_FILE:-$HOME/.local/share/alphaos/logs/aos-hub-live-backup.log}"
LOCK_FILE="${AOS_HUB_LIVE_LOCK_FILE:-/tmp/rclone-aos-hub-live-backup.lock}"
COPY_LINKS_MODE="${AOS_HUB_LIVE_COPY_LINKS:-0}"
DRY_RUN=0

is_remote_root() {
  local remote="$1"
  case "$remote" in
    *:) return 0 ;;
    *:/) return 0 ;;
    *) return 1 ;;
  esac
}

acquire_lock() {
  mkdir -p "$(dirname "$LOG_FILE")"
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      warning "Another live backup run is already active (lock: $LOCK_FILE)"
      exit 0
    fi
    return 0
  fi

  if [ -f "$LOCK_FILE" ]; then
    warning "Another live backup may be active (lock file exists: $LOCK_FILE)"
    exit 0
  fi
  touch "$LOCK_FILE"
  trap 'rm -f "$LOCK_FILE"' EXIT
}

doctor() {
  local rc=0

  if command -v rclone >/dev/null 2>&1; then
    success "rclone binary found"
  else
    error "rclone binary missing in PATH"
    rc=1
  fi

  if [ -f "$RCLONE_CONFIG" ]; then
    success "rclone config present: $RCLONE_CONFIG"
  else
    error "rclone config missing: $RCLONE_CONFIG"
    rc=1
  fi

  if [ -d "$LOCAL_PATH" ]; then
    success "local source present: $LOCAL_PATH"
  else
    error "local source missing: $LOCAL_PATH"
    rc=1
  fi

  if is_remote_root "$REMOTE_CURRENT"; then
    error "refusing remote root for current: $REMOTE_CURRENT"
    rc=1
  else
    success "remote current path looks safe: $REMOTE_CURRENT"
  fi

  if is_remote_root "$REMOTE_HISTORY_ROOT"; then
    error "refusing remote root for history: $REMOTE_HISTORY_ROOT"
    rc=1
  else
    success "remote history path looks safe: $REMOTE_HISTORY_ROOT"
  fi

  return "$rc"
}

run_backup() {
  acquire_lock
  doctor

  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local backup_dir="${REMOTE_HISTORY_ROOT}/${stamp}"

  local -a rclone_opts=(
    --config "$RCLONE_CONFIG"
    --create-empty-src-dirs
    --fast-list
    --update
    --log-file "$LOG_FILE"
    --log-level INFO
    --backup-dir "$backup_dir"
    --exclude "**/.git/index.lock"
    --exclude "**/node_modules/**"
    --exclude "**/.cache/**"
    --exclude "**/.Trash-*/**"
    --exclude "**/.DS_Store"
    --exclude "**/Thumbs.db"
  )

  if [ "$COPY_LINKS_MODE" = "1" ]; then
    rclone_opts+=(--copy-links)
  else
    rclone_opts+=(--skip-links)
  fi

  # Ensure destination root exists before copy.
  rclone mkdir --config "$RCLONE_CONFIG" "$REMOTE_CURRENT" >/dev/null 2>&1 || true

  if [ "$DRY_RUN" = "1" ]; then
    log "Dry-run: live backup $LOCAL_PATH -> $REMOTE_CURRENT"
    rclone copy "$LOCAL_PATH" "$REMOTE_CURRENT" "${rclone_opts[@]}" --dry-run
  else
    log "Live backup $LOCAL_PATH -> $REMOTE_CURRENT (history: $backup_dir)"
    rclone copy "$LOCAL_PATH" "$REMOTE_CURRENT" "${rclone_opts[@]}"
    success "Live backup completed"
  fi
}

main() {
  local cmd="run"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      run|doctor) cmd="$1"; shift ;;
      --dry-run|--dry) DRY_RUN=1; shift ;;
      *)
        error "Unknown argument: $1"
        exit 2
        ;;
    esac
  done

  case "$cmd" in
    doctor) doctor ;;
    run) run_backup ;;
    *)
      error "Unknown command: $cmd"
      exit 2
      ;;
  esac
}

main "$@"
