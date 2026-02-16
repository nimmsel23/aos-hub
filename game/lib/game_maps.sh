#!/usr/bin/env bash
# game_maps.sh - Map hierarchy and cascade logic
# Used by: gamectl CLI, Index Node API

set -euo pipefail

# Map cascade hierarchy (top → bottom)
# Frame → IPW → Freedom → Focus → Fire → Daily

# Get parent map for a given level
# Args: map_level
# Output: parent level (or empty if none)
get_parent_map() {
  case "$1" in
    ipw) echo "frame" ;;
    freedom) echo "ipw" ;;
    focus) echo "freedom" ;;
    fire) echo "focus" ;;
    daily) echo "fire" ;;
    *) echo "" ;;
  esac
}

# Get child map for a given level
# Args: map_level
# Output: child level (or empty if none)
get_child_map() {
  case "$1" in
    frame) echo "ipw" ;;
    ipw) echo "freedom" ;;
    freedom) echo "focus" ;;
    focus) echo "fire" ;;
    fire) echo "daily" ;;
    *) echo "" ;;
  esac
}

# Check if map cascade is broken
# Args: map_level domain
# Returns: 0 if cascade broken, 1 if OK
cascade_broken() {
  local map_level="$1"
  local domain="$2"

  # Source game_data.sh for map_exists
  local parent
  parent=$(get_parent_map "$map_level")

  [[ -z "$parent" ]] && return 1  # No parent = OK

  # Check if parent exists
  if ! map_exists "$parent" "$domain"; then
    return 0  # Parent missing = cascade broken
  fi

  # Check if parent is newer than current
  local parent_file
  parent_file=$(get_map_file "$parent" "$domain")
  local current_file
  current_file=$(get_map_file "$map_level" "$domain")

  if [[ ! -f "$current_file" ]]; then
    return 1  # Current doesn't exist = not broken, just missing
  fi

  local parent_mtime
  parent_mtime=$(stat -c %Y "$parent_file" 2>/dev/null || stat -f %m "$parent_file" 2>/dev/null || echo "0")
  local current_mtime
  current_mtime=$(stat -c %Y "$current_file" 2>/dev/null || stat -f %m "$current_file" 2>/dev/null || echo "0")

  # Cascade broken if parent newer (changed after child)
  (( parent_mtime > current_mtime ))
}

# Get cascade status
# Args: domain
# Output: JSON array of cascade status
get_cascade_status() {
  local domain="$1"
  local levels=(frame ipw freedom focus fire daily)
  local results=()

  for level in "${levels[@]}"; do
    local exists="false"
    local needs_update="false"

    if map_exists "$level" "$domain"; then
      exists="true"

      if cascade_broken "$level" "$domain"; then
        needs_update="true"
      fi
    fi

    results+=("{\"level\":\"$level\",\"exists\":$exists,\"needs_update\":$needs_update}")
  done

  echo "[$(IFS=,; echo "${results[*]}")]"
}

# Get recommended next action
# Args: domain
# Output: string (create_frame|update_freedom|etc)
get_next_action() {
  local domain="$1"

  # Check in order: Frame → IPW → Freedom → Focus → Fire
  for level in frame ipw freedom focus fire; do
    if ! map_exists "$level" "$domain"; then
      echo "create_${level}"
      return
    fi

    if cascade_broken "$level" "$domain"; then
      echo "update_${level}"
      return
    fi
  done

  # All good, suggest weekly fire
  echo "review_fire"
}
