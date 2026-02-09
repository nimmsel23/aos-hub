#!/usr/bin/env bash
# voice_session.sh - VOICE session 4-step facilitation

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/voice_data.sh"

# 4-Step prompts
STOP_PROMPT="🛑 STOP - What pattern needs interrupting?"
SUBMIT_PROMPT="🙏 SUBMIT - What truth must be faced?"
STRUGGLE_PROMPT="⚔️  STRUGGLE - What story needs rewriting?"
STRIKE_PROMPT="⚡ STRIKE - What decisive action follows?"

# Interactive session creation
interactive_session() {
  local vdir
  vdir=$(get_voice_dir)
  mkdir -p "$vdir"

  local timestamp
  timestamp=$(date '+%Y-%m-%d_%H%M')
  local file="$vdir/VOICE-$timestamp.md"

  echo "# VOICE Session - $(date '+%Y-%m-%d %H:%M')" > "$file"
  echo "" >> "$file"

  # STOP
  echo ""
  echo "═══════════════════════════════════════"
  echo "$STOP_PROMPT"
  echo "═══════════════════════════════════════"
  echo ""
  echo "## STOP - Pattern Interrupt" >> "$file"
  echo "" >> "$file"
  echo "**What pattern needs interrupting?**" >> "$file"

  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Describe the destructive pattern..." >> "$file"
  else
    read -rp "> " stop_input
    echo "$stop_input" >> "$file"
  fi
  echo "" >> "$file"

  # SUBMIT
  echo ""
  echo "═══════════════════════════════════════"
  echo "$SUBMIT_PROMPT"
  echo "═══════════════════════════════════════"
  echo ""
  echo "## SUBMIT - Face Truth" >> "$file"
  echo "" >> "$file"
  echo "**What truth must be faced?**" >> "$file"

  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "What am I avoiding?" >> "$file"
  else
    read -rp "> " submit_input
    echo "$submit_input" >> "$file"
  fi
  echo "" >> "$file"

  # STRUGGLE
  echo ""
  echo "═══════════════════════════════════════"
  echo "$STRUGGLE_PROMPT"
  echo "═══════════════════════════════════════"
  echo ""
  echo "## STRUGGLE - Rewrite Story" >> "$file"
  echo "" >> "$file"
  echo "**What story needs rewriting?**" >> "$file"

  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Old narrative vs new narrative..." >> "$file"
  else
    read -rp "> " struggle_input
    echo "$struggle_input" >> "$file"
  fi
  echo "" >> "$file"

  # STRIKE
  echo ""
  echo "═══════════════════════════════════════"
  echo "$STRIKE_PROMPT"
  echo "═══════════════════════════════════════"
  echo ""
  echo "## STRIKE - Decisive Action" >> "$file"
  echo "" >> "$file"
  echo "**What action follows?**" >> "$file"

  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Concrete next steps..." >> "$file"
  else
    read -rp "> " strike_input
    echo "$strike_input" >> "$file"
  fi
  echo "" >> "$file"

  echo "---" >> "$file"
  echo "" >> "$file"
  echo "**Session Complete:** $(date '+%Y-%m-%d %H:%M')" >> "$file"

  echo ""
  echo "✅ Session saved: $file"
  echo "$file"
}

# Quick session (non-interactive template)
quick_session() {
  create_session
}

# Get session phase content
get_phase_content() {
  local file="$1"
  local phase="$2"  # stop, submit, struggle, strike

  case "$phase" in
    stop)
      sed -n '/## STOP/,/## SUBMIT/p' "$file" | head -n -1
      ;;
    submit)
      sed -n '/## SUBMIT/,/## STRUGGLE/p' "$file" | head -n -1
      ;;
    struggle)
      sed -n '/## STRUGGLE/,/## STRIKE/p' "$file" | head -n -1
      ;;
    strike)
      sed -n '/## STRIKE/,/---/p' "$file" | head -n -1
      ;;
    *)
      cat "$file"
      ;;
  esac
}

# Extract STRIKE from session (for Door integration)
extract_strike() {
  local file="$1"
  get_phase_content "$file" "strike" | grep -v "^#" | grep -v "^\*\*" | sed '/^$/d'
}
