#!/usr/bin/env bash
# door_health.sh - Health checks and stalled detection
# Used by: doorctl CLI, Index Node API

set -euo pipefail

STALLED_DAYS="${AOS_DOOR_STALLED_DAYS:-7}"
ATTENTION_DAYS="${AOS_DOOR_ATTENTION_DAYS:-3}"

# Calculate time ago from ISO timestamp
# Args: timestamp (ISO 8601 format: 20260209T105635Z)
# Output: human readable string (2h ago, 3d ago, etc)
time_ago() {
  local timestamp="$1"
  [[ -z "$timestamp" ]] && { echo "never"; return; }

  # Parse ISO timestamp
  local ts_epoch
  ts_epoch=$(date -d "${timestamp}" +%s 2>/dev/null || echo "0")
  [[ "$ts_epoch" == "0" ]] && { echo "?"; return; }

  local now_epoch
  now_epoch=$(date +%s)
  local diff=$((now_epoch - ts_epoch))

  if ((diff < 60)); then
    echo "${diff}s ago"
  elif ((diff < 3600)); then
    echo "$((diff / 60))m ago"
  elif ((diff < 86400)); then
    echo "$((diff / 3600))h ago"
  else
    echo "$((diff / 86400))d ago"
  fi
}

# Check if door is stalled (no activity in N days)
# Args: modified_timestamp
# Returns: 0 if stalled, 1 if not
is_stalled() {
  local modified="$1"
  [[ -z "$modified" ]] && return 0

  local ts_epoch
  ts_epoch=$(date -d "${modified}" +%s 2>/dev/null || echo "0")
  [[ "$ts_epoch" == "0" ]] && return 0

  local now_epoch
  now_epoch=$(date +%s)
  local diff=$((now_epoch - ts_epoch))
  local stalled_threshold=$((STALLED_DAYS * 86400))

  ((diff > stalled_threshold))
}

# Check if door needs attention (no activity in 3+ days)
# Args: modified_timestamp
# Returns: 0 if needs attention, 1 if not
needs_attention() {
  local modified="$1"
  [[ -z "$modified" ]] && return 0

  local ts_epoch
  ts_epoch=$(date -d "${modified}" +%s 2>/dev/null || echo "0")
  [[ "$ts_epoch" == "0" ]] && return 0

  local now_epoch
  now_epoch=$(date +%s)
  local diff=$((now_epoch - ts_epoch))
  local attention_threshold=$((ATTENTION_DAYS * 86400))

  ((diff > attention_threshold))
}

# Get health status for door
# Args: modified_timestamp
# Output: healthy|attention|stalled
get_health_status() {
  local modified="$1"

  if is_stalled "$modified"; then
    echo "stalled"
  elif needs_attention "$modified"; then
    echo "attention"
  else
    echo "healthy"
  fi
}

# Get health emoji
# Args: health_status
# Output: emoji
get_health_emoji() {
  case "$1" in
    healthy) echo "✅" ;;
    attention) echo "⚠️" ;;
    stalled) echo "🔥" ;;
    *) echo "❓" ;;
  esac
}

# Get days since last activity
# Args: modified_timestamp
# Output: number of days
days_since_activity() {
  local modified="$1"
  [[ -z "$modified" ]] && { echo "999"; return; }

  local ts_epoch
  ts_epoch=$(date -d "${modified}" +%s 2>/dev/null || echo "0")
  [[ "$ts_epoch" == "0" ]] && { echo "999"; return; }

  local now_epoch
  now_epoch=$(date +%s)
  local diff=$((now_epoch - ts_epoch))

  echo $((diff / 86400))
}
