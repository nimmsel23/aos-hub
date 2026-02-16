#!/usr/bin/env bash
# door_format.sh - Formatting and pretty printing
# Used by: doorctl CLI, Index Node API

set -euo pipefail

# Draw progress bar
# Args: completed total width
# Output: ASCII progress bar
draw_progress_bar() {
  local completed="$1"
  local total="$2"
  local width="${3:-20}"

  if ((total == 0)); then
    echo "$(printf '░%.0s' $(seq 1 "$width"))"
    return
  fi

  local pct=$((completed * 100 / total))
  local filled=$((pct * width / 100))
  local empty=$((width - filled))

  printf '█%.0s' $(seq 1 "$filled")
  printf '░%.0s' $(seq 1 "$empty")
}

# Calculate completion percentage
# Args: completed total
# Output: percentage string (67%)
calc_percentage() {
  local completed="$1"
  local total="$2"

  if ((total == 0)); then
    echo "-"
    return
  fi

  if command -v bc >/dev/null 2>&1; then
    printf "%.0f%%" $(echo "scale=2; $completed * 100 / $total" | bc)
  else
    echo "$((completed * 100 / total))%"
  fi
}

# Format table row
# Args: door_json
# Output: formatted table row
format_door_row() {
  local door="$1"

  local name
  name=$(echo "$door" | jq -r '.name')
  local count
  count=$(echo "$door" | jq -r '.count')
  local done
  done=$(echo "$door" | jq -r '.done')
  local pending
  pending=$(echo "$door" | jq -r '.pending')
  local tags
  tags=$(echo "$door" | jq -r '.tags')
  local modified
  modified=$(echo "$door" | jq -r '.modified')

  # Source phase and health libs
  local phase
  phase=$(get_door_phase "$tags")
  local phase_icon
  phase_icon=$(format_phase "$phase")

  local pct
  pct=$(calc_percentage "$done" "$count")

  local activity
  activity=$(time_ago "$modified")

  # Check health
  local alert=""
  local health_status
  health_status=$(get_health_status "$modified")

  case "$health_status" in
    stalled) alert="🔥" ;;
    attention) alert="⚠️ " ;;
  esac

  printf "║ %-17s ║ %-9s ║ %4s ║ %4s ║ %4s ║ %-13s ║\n" \
    "${name:0:17}" \
    "$phase_icon" \
    "$count" \
    "$done" \
    "$pct" \
    "${activity:0:10} $alert"
}

# Draw table header
draw_table_header() {
  printf "╔═══════════════════╦═══════════╦══════╦══════╦══════╦═══════════════╗\n"
  printf "║ %-17s ║ %-9s ║ %4s ║ %4s ║ %4s ║ %-13s ║\n" \
    "DOOR" "PHASE" "HITS" "DONE" "%" "LAST ACTIVITY"
  printf "╠═══════════════════╬═══════════╬══════╬══════╬══════╬═══════════════╣\n"
}

# Draw table footer
draw_table_footer() {
  printf "╚═══════════════════╩═══════════╩══════╩══════╩══════╩═══════════════╝\n"
}

# Format task list item
# Args: task_json status_emoji
# Output: formatted task line
format_task_item() {
  local task="$1"
  local status_emoji="${2:-🔲}"

  local desc
  desc=$(echo "$task" | jq -r '.description')
  local due
  due=$(echo "$task" | jq -r '.due // "none"')
  local priority
  priority=$(echo "$task" | jq -r '.priority // "M"')
  local uuid
  uuid=$(echo "$task" | jq -r '.uuid[0:7]')

  echo "  $status_emoji [$uuid] $desc (due: $due, priority: $priority)"
}
