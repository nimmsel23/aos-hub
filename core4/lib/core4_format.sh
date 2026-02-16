#!/usr/bin/env bash
# core4_format.sh - Formatting and pretty printing for Core4
# Used by: core4ctl CLI, Index Node API

set -euo pipefail

# Draw weekly summary table
# Args: week totals_json
draw_week_summary() {
  local week="$1"
  local totals="$2"

  echo "╔═══════════╦═══════╦═════════╗"
  echo "║ Domain    ║ Total ║ Status  ║"
  echo "╠═══════════╬═══════╬═════════╣"

  for domain in body being balance business; do
    local label
    label=$(get_domain_label "$domain")
    local total
    total=$(echo "$totals" | jq -r ".${domain} // 0")
    local target=14  # 7 days × 2 habits

    local status="✅"
    if (( $(echo "$total < $target" | bc -l) )); then
      status="⚠️"
    fi
    if (( $(echo "$total < $(echo "$target / 2" | bc)" | bc -l) )); then
      status="❌"
    fi

    printf "║ %-9s ║ %5.1f ║ %-7s ║\n" \
      "$label" \
      "$total" \
      "$status"
  done

  echo "╚═══════════╩═══════╩═════════╝"
}

# Draw today's status
# Args: today_data_json
draw_today_status() {
  local today="$1"

  echo "╔═══════════╦══════════╦══════════╗"
  echo "║ Domain    ║ Fitness  ║ Fuel     ║"
  echo "╠═══════════╬══════════╬══════════╣"

  # BODY
  local body_1 body_2
  body_1=$(echo "$today" | jq -r '.habits.fitness // 0')
  body_2=$(echo "$today" | jq -r '.habits.fuel // 0')

  printf "║ 💪 BODY    ║ %-8s ║ %-8s ║\n" \
    "$(format_check "$body_1")" \
    "$(format_check "$body_2")"

  # BEING
  echo "╠═══════════╬══════════╬══════════╣"
  echo "║ Domain    ║ Meditate ║ Memoirs  ║"
  echo "╠═══════════╬══════════╬══════════╣"

  local being_1 being_2
  being_1=$(echo "$today" | jq -r '.habits.meditation // 0')
  being_2=$(echo "$today" | jq -r '.habits.memoirs // 0')

  printf "║ 🧘 BEING   ║ %-8s ║ %-8s ║\n" \
    "$(format_check "$being_1")" \
    "$(format_check "$being_2")"

  # BALANCE
  echo "╠═══════════╬══════════╬══════════╣"
  echo "║ Domain    ║ Person1  ║ Person2  ║"
  echo "╠═══════════╬══════════╬══════════╣"

  local balance_1 balance_2
  balance_1=$(echo "$today" | jq -r '.habits.person1 // 0')
  balance_2=$(echo "$today" | jq -r '.habits.person2 // 0')

  printf "║ ⚖️  BALANCE ║ %-8s ║ %-8s ║\n" \
    "$(format_check "$balance_1")" \
    "$(format_check "$balance_2")"

  # BUSINESS
  echo "╠═══════════╬══════════╬══════════╣"
  echo "║ Domain    ║ Discover ║ Declare  ║"
  echo "╠═══════════╬══════════╬══════════╣"

  local business_1 business_2
  business_1=$(echo "$today" | jq -r '.habits.discover // 0')
  business_2=$(echo "$today" | jq -r '.habits.declare // 0')

  printf "║ 💼 BUSINESS║ %-8s ║ %-8s ║\n" \
    "$(format_check "$business_1")" \
    "$(format_check "$business_2")"

  echo "╚═══════════╩══════════╩══════════╝"
}

# Format check status
# Args: value
format_check() {
  local val="$1"

  if (( $(echo "$val > 0" | bc -l) )); then
    echo "✅"
  else
    echo "⚪"
  fi
}

# Draw streak table
draw_streak_table() {
  echo "╔═══════════╦═══════╦══════════╦══════════╗"
  echo "║ Domain    ║ Streak║ Status   ║ Risk     ║"
  echo "╠═══════════╬═══════╬══════════╬══════════╣"

  for domain in body being balance business; do
    local label
    label=$(get_domain_label "$domain")

    local streak
    streak=$(get_domain_streak "$domain")

    local status
    status=$(get_streak_status "$streak")

    local emoji
    emoji=$(get_streak_emoji "$status")

    local risk="No"
    if domain_at_risk "$domain"; then
      risk="⚠️ YES"
    fi

    printf "║ %-9s ║ %5d ║ %-8s ║ %-8s ║\n" \
      "$label" \
      "$streak" \
      "$emoji $status" \
      "$risk"
  done

  echo "╚═══════════╩═══════╩══════════╩══════════╝"
}
