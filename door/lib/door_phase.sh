#!/usr/bin/env bash
# door_phase.sh - Phase detection and management
# Used by: doorctl CLI, Index Node API

set -euo pipefail

# Detect phase from tags
# Args: tags_json (JSON array)
# Output: phase name (potential|plan|production|profit|unknown)
get_door_phase() {
  local tags="$1"

  # Heuristic: check tags for phase indicators
  if echo "$tags" | jq -r '.[]' | grep -q "potential"; then
    echo "potential"
  elif echo "$tags" | jq -r '.[]' | grep -q "plan"; then
    echo "plan"
  elif echo "$tags" | jq -r '.[]' | grep -q "production\|hit\|strike"; then
    echo "production"
  elif echo "$tags" | jq -r '.[]' | grep -q "profit\|done"; then
    echo "profit"
  else
    echo "unknown"
  fi
}

# Format phase for display
# Args: phase
# Output: formatted string with emoji
format_phase() {
  case "$1" in
    potential) echo "💡 Pot" ;;
    plan) echo "📋 Plan" ;;
    production) echo "🔨 Prod" ;;
    profit) echo "💰 Profit" ;;
    *) echo "❓ ???" ;;
  esac
}

# Get phase name (no emoji)
# Args: phase
# Output: phase name
get_phase_name() {
  case "$1" in
    potential) echo "Potential" ;;
    plan) echo "Plan" ;;
    production) echo "Production" ;;
    profit) echo "Profit" ;;
    *) echo "Unknown" ;;
  esac
}

# Get phase emoji only
# Args: phase
# Output: emoji
get_phase_emoji() {
  case "$1" in
    potential) echo "💡" ;;
    plan) echo "📋" ;;
    production) echo "🔨" ;;
    profit) echo "💰" ;;
    *) echo "❓" ;;
  esac
}
