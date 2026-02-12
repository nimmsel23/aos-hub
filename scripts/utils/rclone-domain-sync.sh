#!/usr/bin/env bash
# Rclone αOS Domain Copy Script
# Push/pull copy of αOS domains to Google Drive (push-sync deletes remote files)
# Usage: rclone-domain-sync.sh <DOMAIN> [push|pull|push-sync|sync|status|log]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

RCLONE_CONFIG="${AOS_RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
REMOTE_NAME="${AOS_RCLONE_REMOTE_NAME:-eldanioo}"

DOMAIN="${1^^}"
if [[ ! "$DOMAIN" =~ ^(BODY|BEING|BALANCE|BUSINESS)$ ]]; then
  echo "Error: Invalid domain. Must be one of: BODY, BEING, BALANCE, BUSINESS"
  echo "Usage: $0 <DOMAIN> [push|pull|push-sync|sync|status|log]"
  exit 1
fi

LOCAL_PATH="${AOS_DOMAIN_LOCAL_BASE:-$HOME/Dokumente}/${DOMAIN}"
REMOTE_PATH="${AOS_DOMAIN_REMOTE_BASE:-}${DOMAIN}"
LOG_FILE="${AOS_DOMAIN_LOG_DIR:-$HOME/.local/share/alphaos/logs}/rclone-${DOMAIN,,}-sync.log"
LOCK_FILE="${AOS_DOMAIN_LOCK_DIR:-/tmp}/rclone-${DOMAIN,,}-sync.lock"

RCLONE_OPTIONS=(--verbose --checksum --create-empty-src-dirs \
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

declare -A DOMAIN_EMOJI=(
  [BODY]="💪"
  [BEING]="🧘"
  [BALANCE]="⚖️"
  [BUSINESS]="💼"
)

log_limit() {
  local limit="${AOS_LOG_LIMIT:-10}"
  if [[ ! "$limit" =~ ^[0-9]+$ ]]; then
    limit=10
  fi
  echo "$limit"
}

extract_log_entries() {
  local limit
  limit="$(log_limit)"
  if [ ! -f "$LOG_FILE" ]; then
    echo "No sync logs found"
    return 0
  fi
  local entries
  entries="$(grep -E "INFO  : .*: (Copied|Updated|Moved|Transferred)" "$LOG_FILE" \
    | sed -E 's/^.*INFO  : //; s/: (Copied|Updated|Moved|Transferred).*//' \
    | tail -n "$limit")"
  if [ -z "$entries" ]; then
    echo "No file transfers found in log"
    return 0
  fi
  echo "$entries"
}

show_log() {
  local limit
  limit="$(log_limit)"
  script_header "${DOMAIN_EMOJI[$DOMAIN]} ${DOMAIN} Recent Transfers" "Last ${limit} pushed files"
  extract_log_entries
}

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
  local filter_from=()
  local ignore_file="$LOCAL_PATH/.rcloneignore"

  if [ -f "$LOCK_FILE" ]; then
    warning "Another sync is already running (lock file exists)"
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

  case "$direction" in
    push|sync)
      log "Starting copy push: $LOCAL_PATH -> ${REMOTE_NAME}:${REMOTE_PATH}"
      rclone mkdir --config "$RCLONE_CONFIG" "${REMOTE_NAME}:${REMOTE_PATH}" 2>/dev/null || true
      if rclone copy "$LOCAL_PATH" "${REMOTE_NAME}:${REMOTE_PATH}" \
        --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${filter_from[@]}" 2>&1 | tee -a "$LOG_FILE"; then
        success "${DOMAIN_EMOJI[$DOMAIN]} ${DOMAIN} push completed successfully"
        return 0
      fi
      ;;
    pull)
      log "Starting copy pull: ${REMOTE_NAME}:${REMOTE_PATH} -> $LOCAL_PATH"
      mkdir -p "$LOCAL_PATH"
      if rclone copy "${REMOTE_NAME}:${REMOTE_PATH}" "$LOCAL_PATH" \
        --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${filter_from[@]}" 2>&1 | tee -a "$LOG_FILE"; then
        success "${DOMAIN_EMOJI[$DOMAIN]} ${DOMAIN} pull completed successfully"
        return 0
      fi
      ;;
    *)
      error "Unknown direction: $direction"
      return 1
      ;;
  esac

  local exit_code=$?
  error "Copy failed with exit code: $exit_code"
  return $exit_code
}

run_push_sync() {
  local filter_from=()
  local ignore_file="$LOCAL_PATH/.rcloneignore"

  if [ -f "$LOCK_FILE" ]; then
    warning "Another sync is already running (lock file exists)"
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

  log "Starting sync push (delete remote): $LOCAL_PATH -> ${REMOTE_NAME}:${REMOTE_PATH}"
  rclone mkdir --config "$RCLONE_CONFIG" "${REMOTE_NAME}:${REMOTE_PATH}" 2>/dev/null || true
  if rclone sync "$LOCAL_PATH" "${REMOTE_NAME}:${REMOTE_PATH}" \
    --config "$RCLONE_CONFIG" "${RCLONE_OPTIONS[@]}" "${filter_from[@]}" 2>&1 | tee -a "$LOG_FILE"; then
    success "${DOMAIN_EMOJI[$DOMAIN]} ${DOMAIN} push-sync completed successfully"
    return 0
  fi

  local exit_code=$?
  error "Push-sync failed with exit code: $exit_code"
  return $exit_code
}

show_status() {
  script_header "${DOMAIN_EMOJI[$DOMAIN]} ${DOMAIN} Copy Status" "Copy push/pull (no deletes). push-sync deletes remote"
  check_rclone_config || return 1

  if [ "${AOS_COMPACT:-0}" = "1" ]; then
    if [ -d "$LOCAL_PATH" ]; then
      local_count=$(find "$LOCAL_PATH" -type f 2>/dev/null | wc -l)
      local_size=$(du -sh "$LOCAL_PATH" 2>/dev/null | cut -f1)
      echo "Local: $local_count files, $local_size"
    else
      echo "Local: NOT FOUND"
    fi

    local remote_line
    remote_line=$(rclone size "${REMOTE_NAME}:${REMOTE_PATH}" --config "$RCLONE_CONFIG" 2>/dev/null | awk -F: '
      /Total objects/ {gsub(/^[[:space:]]+/, "", $2); o=$2}
      /Total size/ {gsub(/^[[:space:]]+/, "", $2); s=$2}
      END { if (o || s) printf "Remote: %s files, %s\n", (o==""?"?":o), (s==""?"?":s) }')
    if [ -n "$remote_line" ]; then
      echo "$remote_line"
    else
      echo "Remote: not accessible or empty"
    fi

    if [ -f "$LOG_FILE" ]; then
      echo "Last log: $(tail -n 1 "$LOG_FILE")"
    else
      echo "Last log: none"
    fi
    return 0
  fi

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
  echo "Remote contents:"
  rclone size "${REMOTE_NAME}:${REMOTE_PATH}" --config "$RCLONE_CONFIG" 2>/dev/null || echo "Remote not accessible or empty"

  echo ""
  echo "Last log lines (last 15):"
  if [ -f "$LOG_FILE" ]; then
    tail -n 15 "$LOG_FILE"
  else
    echo "No sync logs found"
  fi

  echo ""
  if [ -f "$LOCK_FILE" ]; then
    warning "Lock file exists - sync may be running"
  else
    echo "✓ No active sync running"
  fi
}

main() {
  case "${2:-sync}" in
    push|sync) run_copy push ;;
    push-sync|pushsync) run_push_sync ;;
    pull) run_copy pull ;;
    log) show_log ;;
    status) show_status ;;
    init) echo "Init not required for copy mode. Use: $0 $DOMAIN push|pull" ;;
    *)
      echo "Usage: $0 <DOMAIN> [push|pull|push-sync|sync|status|log]"
      exit 1
      ;;
  esac
}

main "$@"

