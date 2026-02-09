#!/usr/bin/env bash
# voice_format.sh - VOICE pretty printing

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../../scripts/ctl-lib.sh"

# Draw sessions table
draw_sessions_table() {
  local sessions="$1"
  local count
  count=$(echo "$sessions" | jq 'length')

  if [[ "$count" -eq 0 ]]; then
    ui_warn "No sessions found"
    return 0
  fi

  echo ""
  ui_title "VOICE Sessions"
  echo ""

  printf "%-20s %-16s %-8s %s\n" "ID" "Date" "Size" "Title"
  printf "%-20s %-16s %-8s %s\n" "--------------------" "----------------" "--------" "----------------------------------------"

  echo "$sessions" | jq -r '.[] | "\(.id)\t\(.mtime)\t\(.size)\t\(.title)"' | while IFS=$'\t' read -r id mtime size title; do
    local size_kb=$((size / 1024))
    printf "%-20s %-16s %5dKB  %s\n" "${id:0:20}" "$mtime" "$size_kb" "${title:0:40}"
  done

  echo ""
  ui_info "$count sessions shown"
}

# Draw search results table
draw_search_results() {
  local results="$1"
  local query="$2"
  local count
  count=$(echo "$results" | jq 'length')

  if [[ "$count" -eq 0 ]]; then
    ui_warn "No matches for: $query"
    return 0
  fi

  echo ""
  ui_title "Search Results: $query"
  echo ""

  printf "%-20s %-16s %s\n" "ID" "Date" "Match"
  printf "%-20s %-16s %s\n" "--------------------" "----------------" "----------------------------------------"

  echo "$results" | jq -r '.[] | "\(.id)\t\(.mtime)\t\(.match)"' | while IFS=$'\t' read -r id mtime match; do
    printf "%-20s %-16s %s\n" "${id:0:20}" "$mtime" "${match:0:60}"
  done

  echo ""
  ui_info "$count matches found"
}

# Draw stats summary
draw_stats() {
  local stats="$1"
  local total
  total=$(echo "$stats" | jq -r '.total')
  local week
  week=$(echo "$stats" | jq -r '.this_week')
  local month
  month=$(echo "$stats" | jq -r '.this_month')

  echo ""
  ui_title "VOICE Statistics"
  echo ""

  echo "📊 Total Sessions:     $total"
  echo "📅 This Week:          $week"
  echo "📆 This Month:         $month"

  # Calculate average per week (rough estimate)
  if [[ "$total" -gt 0 ]]; then
    local avg_per_month=$((total / 12))  # Rough yearly average
    echo "📈 Avg per Month:      ~$avg_per_month"
  fi

  echo ""
}

# Format session for display
format_session() {
  local file="$1"
  local basename
  basename=$(basename "$file")

  if command -v glow >/dev/null 2>&1; then
    glow "$file"
  elif command -v bat >/dev/null 2>&1; then
    bat --style=plain --paging=never "$file"
  else
    cat "$file"
  fi
}
