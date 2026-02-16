#!/usr/bin/env bash
# core4_data.sh - Data access for Core4 tracking
# Used by: core4ctl CLI, Index Node API

set -euo pipefail

VAULT_DIR="${AOS_VAULT_DIR:-$HOME/AlphaOS-Vault}"
CORE4_DIR="$VAULT_DIR/Alpha_Core4"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/alphaos"

# Get week number in YYYY-Wxx format
get_current_week() {
  date +%Y-W%V
}

# Get week file path
# Args: [week] (optional, defaults to current)
get_week_file() {
  local week="${1:-$(get_current_week)}"
  echo "$CORE4_DIR/core4_week_${week}.json"
}

# Check if week file exists
# Args: [week]
week_exists() {
  local week_file
  week_file=$(get_week_file "$@")
  [[ -f "$week_file" ]]
}

# Get today's date in YYYY-MM-DD format
get_today() {
  date +%Y-%m-%d
}

# Read week data
# Args: [week]
# Output: JSON object
read_week_data() {
  local week_file
  week_file=$(get_week_file "$@")

  if [[ ! -f "$week_file" ]]; then
    echo "{}"
    return 1
  fi

  cat "$week_file"
}

# Get today's data from current week
# Output: JSON object
get_today_data() {
  local week_data
  week_data=$(read_week_data)

  local today
  today=$(get_today)

  echo "$week_data" | jq -r --arg date "$today" '.days[$date] // {}'
}

# Get domain habits
# Args: domain
# Output: array of habit names
get_domain_habits() {
  local domain="$1"

  case "$domain" in
    body)
      echo '["fitness","fuel"]'
      ;;
    being)
      echo '["meditation","memoirs"]'
      ;;
    balance)
      echo '["person1","person2"]'
      ;;
    business)
      echo '["discover","declare"]'
      ;;
    *)
      echo '[]'
      ;;
  esac
}

# Get all domains
get_domains() {
  echo "body"
  echo "being"
  echo "balance"
  echo "business"
}

# Calculate weekly totals
# Args: [week]
# Output: JSON object with totals per domain
get_week_totals() {
  local week_data
  week_data=$(read_week_data "$@")

  echo "$week_data" | jq -r '
    .days // {} |
    to_entries |
    map(.value) |
    reduce .[] as $day (
      {body: 0, being: 0, balance: 0, business: 0};
      .body += ($day.body // 0) |
      .being += ($day.being // 0) |
      .balance += ($day.balance // 0) |
      .business += ($day.business // 0)
    )
  '
}

# Get habit label
# Args: habit
get_habit_label() {
  case "$1" in
    fitness) echo "Fitness" ;;
    fuel) echo "Fuel" ;;
    meditation) echo "Meditation" ;;
    memoirs) echo "Memoirs" ;;
    person1|partner) echo "Person1" ;;
    person2|posterity) echo "Person2" ;;
    discover|learn) echo "Discover" ;;
    declare|action) echo "Declare" ;;
    *) echo "$1" ;;
  esac
}

# Get domain label
get_domain_label() {
  case "$1" in
    body) echo "💪 BODY" ;;
    being) echo "🧘 BEING" ;;
    balance) echo "⚖️  BALANCE" ;;
    business) echo "💼 BUSINESS" ;;
    *) echo "$1" ;;
  esac
}

# List recent weeks
# Args: [count] (default 4)
list_recent_weeks() {
  local count="${1:-4}"

  find "$CORE4_DIR" -name "core4_week_*.json" -type f 2>/dev/null |
    sort -r |
    head -n "$count"
}
