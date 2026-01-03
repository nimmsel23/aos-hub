#!/usr/bin/env bash
# Rclone Vitaltrainer Copy Script (push/pull)
# Usage: rclone-vitaltrainer-copy.sh [push|pull|status]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOCK_FILE="${AOS_VITALTRAINER_RCLONE_LOCK_FILE:-/tmp/rclone-vitaltrainer-copy.lock}"
PUSH_LOG_FILE="${AOS_VITALTRAINER_PUSH_LOG_FILE:-$HOME/.local/share/alphaos/logs/vitaltrainer-rclone-push.log}"
PULL_LOG_FILE="${AOS_VITALTRAINER_PULL_LOG_FILE:-$HOME/.local/share/alphaos/logs/vitaltrainer-rclone-pull.log}"

LOCAL_PATH="${AOS_VITALTRAINER_LOCAL_PATH:-$HOME/Dokumente/BUSINESS/Vitaltrainer}"
REMOTE_NAME="${AOS_RCLONE_REMOTE_NAME:-eldanioo}"
REMOTE_PATH="${AOS_VITALTRAINER_REMOTE_PATH:-Vitaltrainer}"

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

run_copy() {
  local direction="$1"
  local src="" dst=""
  local filter_from=()
  local ignore_file="$LOCAL_PATH/.rcloneignore"

  if [ -f "$LOCK_FILE" ]; then
    warning "Another copy is already running (lock file exists)"
    return 1
  fi

  mkdir -p "$(dirname "$PUSH_LOG_FILE")" "$(dirname "$PULL_LOG_FILE")"
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

  case "$direction" in
    push)
      src="$LOCAL_PATH"
      dst="${REMOTE_NAME}:${REMOTE_PATH}"
      rclone mkdir --config "$RCLONE_CONFIG" "$dst" 2>/dev/null || true
      log "Pushing Vitaltrainer to ${dst}"
      ;;
    pull)
      src="${REMOTE_NAME}:${REMOTE_PATH}"
      dst="$LOCAL_PATH"
      mkdir -p "$LOCAL_PATH"
      log "Pulling Vitaltrainer from ${src}"
      ;;
    *)
      echo "Usage: $0 [push|pull|status]"
      return 1
      ;;
  esac

  local log_file="$PUSH_LOG_FILE"
  if [ "$direction" = "pull" ]; then
    log_file="$PULL_LOG_FILE"
  fi

  if rclone copy "$src" "$dst" --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${filter_from[@]}" 2>&1 | tee -a "$log_file"; then
    success "Vitaltrainer ${direction} completed"
    return 0
  fi

  local exit_code=$?
  error "Vitaltrainer ${direction} failed (exit code: $exit_code)"
  return $exit_code
}

show_status() {
  check_rclone_config || return 1

  echo "Local path: $LOCAL_PATH"
  echo "Remote: ${REMOTE_NAME}:${REMOTE_PATH}"
  echo ""

  if [ -d "$LOCAL_PATH" ]; then
    local_count=$(find "$LOCAL_PATH" -type f 2>/dev/null | wc -l)
    local_size=$(du -sh "$LOCAL_PATH" 2>/dev/null | cut -f1)
    echo "Local files: $local_count"
    echo "Local size: $local_size"
  else
    echo "Local path: NOT FOUND"
  fi

  echo ""
  echo "Push log (last 10):"
  if [ -f "$PUSH_LOG_FILE" ]; then
    tail -n 10 "$PUSH_LOG_FILE"
  else
    echo "No push logs found"
  fi

  echo ""
  echo "Pull log (last 10):"
  if [ -f "$PULL_LOG_FILE" ]; then
    tail -n 10 "$PULL_LOG_FILE"
  else
    echo "No pull logs found"
  fi

  echo ""
  if [ -f "$LOCK_FILE" ]; then
    warning "Lock file exists - copy may be running"
  else
    echo "✓ No active copy running"
  fi
}

case "${1:-push}" in
  push) run_copy push ;;
  pull) run_copy pull ;;
  status) show_status ;;
  *)
    echo "Usage: $0 [push|pull|status]"
    exit 1
    ;;
esac

