#!/usr/bin/env bash
# Push-only live backup for ~/aos-hub (rclone copy, no deletes).
#
# Env:
#   AOS_AOS_HUB_LOCAL_PATH=$HOME/aos-hub
#   AOS_AOS_HUB_REMOTE=eldanioo:aos-hub-live
#   AOS_AOS_HUB_COPY_LINKS=0|1
#   AOS_AOS_HUB_LOG_FILE=...
#   AOS_AOS_HUB_LOCK_FILE=/tmp/rclone-aos-hub-live-push.lock
#   AOS_RCLONE_CONFIG=$HOME/.config/rclone/rclone.conf
#   AOS_LOG_DIR=$HOME/.local/share/alphaos/logs
#
# Usage:
#   rclone-aos-hub-live-push.sh status
#   rclone-aos-hub-live-push.sh push [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

LOCAL_PATH="${AOS_AOS_HUB_LOCAL_PATH:-$HOME/aos-hub}"
REMOTE="${AOS_AOS_HUB_REMOTE:-eldanioo:aos-hub-live}"
RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOG_DIR="${AOS_LOG_DIR:-$HOME/.local/share/alphaos/logs}"
LOG_FILE="${AOS_AOS_HUB_LOG_FILE:-$LOG_DIR/aos-hub-live-push.log}"
LOCK_FILE="${AOS_AOS_HUB_LOCK_FILE:-/tmp/rclone-aos-hub-live-push.lock}"
COPY_LINKS_MODE="${AOS_AOS_HUB_COPY_LINKS:-${AOS_COPY_LINKS:-0}}"
DRY_RUN=0

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
      warning "Another aos-hub live push is already running (lock: $LOCK_FILE)"
      exit 0
    fi
    return 0
  fi

  if [ -f "$LOCK_FILE" ]; then
    warning "Another aos-hub live push may be running (lock file exists: $LOCK_FILE)"
    exit 0
  fi
  touch "$LOCK_FILE"
  trap 'rm -f "$LOCK_FILE"' EXIT
}

status() {
  echo "aos-hub live push"
  echo "  local:  $LOCAL_PATH"
  echo "  remote: $REMOTE"
  echo "  config: $RCLONE_CONFIG"
  echo "  log:    $LOG_FILE"
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
    exit 1
  fi

  if is_remote_root; then
    error "Refusing remote root destination: '$REMOTE' (set AOS_AOS_HUB_REMOTE to a folder like 'eldanioo:aos-hub-live')"
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

  if [ "$COPY_LINKS_MODE" = "1" ]; then
    rclone_opts+=(--copy-links)
  else
    rclone_opts+=(--skip-links)
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "Dry-run: pushing aos-hub to $REMOTE (copy)"
    rclone copy "$LOCAL_PATH" "$REMOTE" "${rclone_opts[@]}" --dry-run
  else
    log "Pushing aos-hub to $REMOTE (copy)"
    rclone copy "$LOCAL_PATH" "$REMOTE" "${rclone_opts[@]}"
  fi

  success "aos-hub live push completed"
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
