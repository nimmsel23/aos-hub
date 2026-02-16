#!/usr/bin/env bash
# core4_streak.sh - Streak calculation (28-or-Die)
# Used by: core4ctl CLI, Index Node API

set -euo pipefail

# Calculate streak for domain
# Args: domain
# Output: current streak days
get_domain_streak() {
  local domain="$1"
  local streak=0
  local date

  # Go backwards from today
  date=$(date +%Y-%m-%d)

  for ((i=0; i<28; i++)); do
    # Get week for this date
    local week
    week=$(date -d "$date" +%Y-W%V 2>/dev/null || date -v-${i}d +%Y-W%V)

    local week_file
    week_file=$(get_week_file "$week")

    if [[ ! -f "$week_file" ]]; then
      break
    fi

    # Check if domain was completed this day
    local completed
    completed=$(jq -r --arg date "$date" --arg domain "$domain" '.days[$date][$domain] // 0' "$week_file")

    if (( $(echo "$completed > 0" | bc -l) )); then
      ((streak++))
    else
      break
    fi

    # Go to previous day
    date=$(date -d "$date - 1 day" +%Y-%m-%d 2>/dev/null || date -v-1d -j -f "%Y-%m-%d" "$date" +%Y-%m-%d)
  done

  echo "$streak"
}

# Get streak status (0-7, 8-14, 15-21, 22-28+)
# Args: streak_days
# Output: status (building|strong|elite|legendary)
get_streak_status() {
  local streak="$1"

  if ((streak >= 28)); then
    echo "legendary"
  elif ((streak >= 22)); then
    echo "elite"
  elif ((streak >= 15)); then
    echo "strong"
  elif ((streak >= 8)); then
    echo "building"
  else
    echo "starting"
  fi
}

# Get streak emoji
# Args: status
get_streak_emoji() {
  case "$1" in
    legendary) echo "🔥🔥🔥" ;;
    elite) echo "🔥🔥" ;;
    strong) echo "🔥" ;;
    building) echo "💪" ;;
    starting) echo "🌱" ;;
    *) echo "⚪" ;;
  esac
}

# Check if domain is at risk (missed yesterday)
# Args: domain
# Returns: 0 if at risk, 1 if OK
domain_at_risk() {
  local domain="$1"

  # Check yesterday
  local yesterday
  yesterday=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

  local week
  week=$(date -d "$yesterday" +%Y-W%V 2>/dev/null || date -v-1d +%Y-W%V)

  local week_file
  week_file=$(get_week_file "$week")

  if [[ ! -f "$week_file" ]]; then
    return 0  # At risk if no data
  fi

  local completed
  completed=$(jq -r --arg date "$yesterday" --arg domain "$domain" '.days[$date][$domain] // 0' "$week_file")

  (( $(echo "$completed == 0" | bc -l) ))
}
