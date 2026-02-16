#!/usr/bin/env bash
# game_format.sh - Formatting and pretty printing for Game
# Used by: gamectl CLI, Index Node API

set -euo pipefail

# Format map level for display
# Args: map_level
format_map_level() {
  local level="$1"
  local emoji
  emoji=$(get_map_level_emoji "$level")
  local name
  name=$(get_map_level_name "$level")

  echo "$emoji $name"
}

# Format domain
# Args: domain
format_domain() {
  case "$1" in
    body) echo "💪 BODY" ;;
    being) echo "🧘 BEING" ;;
    balance) echo "⚖️  BALANCE" ;;
    business) echo "💼 BUSINESS" ;;
    *) echo "$1" ;;
  esac
}

# Draw cascade status table
# Args: domain cascade_json
draw_cascade_table() {
  local domain="$1"
  local cascade="$2"

  echo "╔════════════╦═══════════╦══════════════╗"
  echo "║ Map Level  ║ Status    ║ Action       ║"
  echo "╠════════════╬═══════════╬══════════════╣"

  echo "$cascade" | jq -r '.[] | @json' | while IFS= read -r entry; do
    local level
    level=$(echo "$entry" | jq -r '.level')
    local exists
    exists=$(echo "$entry" | jq -r '.exists')
    local needs_update
    needs_update=$(echo "$entry" | jq -r '.needs_update')

    local emoji
    emoji=$(get_map_level_emoji "$level")
    local level_name
    level_name=$(echo "$level" | tr '[:lower:]' '[:upper:]')

    local status_icon status_text action
    if [[ "$exists" == "true" ]]; then
      if [[ "$needs_update" == "true" ]]; then
        status_icon="⚠️"
        status_text="Stale"
        action="Update needed"
      else
        status_icon="✅"
        status_text="Current"
        action="-"
      fi
    else
      status_icon="❌"
      status_text="Missing"
      action="Create"
    fi

    printf "║ %-10s ║ %-9s ║ %-12s ║\n" \
      "$emoji $level_name" \
      "$status_icon $status_text" \
      "$action"
  done

  echo "╚════════════╩═══════════╩══════════════╝"
}

# Format tent week
format_tent_week() {
  local week="$1"
  echo "⛺ Tent - Week $week"
}
