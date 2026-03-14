#!/usr/bin/env bash
# voice_session_v2.sh - Enhanced VOICE session with Core4 integration

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/voice_data.sh"

# Domain info
declare -A DOMAIN_EMOJI=(
  [body]="🏋️"
  [being]="🧘"
  [balance]="⚖️"
  [business]="💼"
)

declare -A DOMAIN_LABEL=(
  [body]="BODY"
  [being]="BEING"
  [balance]="BALANCE"
  [business]="BUSINESS"
)

get_fired_tasks() {
  local domain="${1:-}"

  if [[ -z "$domain" ]] || ! command -v task >/dev/null 2>&1; then
    echo ""
    return
  fi

  task export status:completed end.after:today domain:"$domain" 2>/dev/null | \
    jq -r '.[] | "- [\(.end | split("T")[1] | split(".")[0] | .[0:5])] \(.description)"' 2>/dev/null || echo ""
}

get_active_war_stacks() {
  local domain="${1:-}"

  if [[ -z "$domain" ]]; then
    echo ""
    return
  fi

  # Get current week's war stacks for domain
  local week_key
  week_key=$(date '+%Y-W%V')
  local war_stack_dir="$HOME/vault/Door/War-Stacks/$week_key"

  if [[ ! -d "$war_stack_dir" ]]; then
    echo "- No active War Stacks for this week"
    return
  fi

  # Find war stacks matching domain
  local stacks
  stacks=$(find "$war_stack_dir" -type f -name "*.md" 2>/dev/null | while read -r file; do
    if grep -qi "domain.*$domain" "$file" 2>/dev/null || grep -qi "${domain^^}" "$file" 2>/dev/null; then
      local basename
      basename=$(basename "$file" .md)
      echo "- War Stack: $basename"
    fi
  done)

  if [[ -z "$stacks" ]]; then
    echo "- No War Stacks for ${domain^^} domain this week"
  else
    echo "$stacks"
  fi
}

interactive_session_v2() {
  local domain="${1:-}"
  local file
  file=$(get_voice_file_path "$domain")
  
  # Header
  local domain_header=""
  if [[ -n "$domain" ]] && [[ -n "${DOMAIN_LABEL[$domain]:-}" ]]; then
    local emoji="${DOMAIN_EMOJI[$domain]}"
    local label="${DOMAIN_LABEL[$domain]}"
    domain_header="\n## Domain: $emoji $label\n"
  fi
  
  # Get data for domain
  local fired_tasks=""
  local war_stacks=""
  if [[ -n "$domain" ]]; then
    fired_tasks=$(get_fired_tasks "$domain")
    war_stacks=$(get_active_war_stacks "$domain")
  fi

  local label="${DOMAIN_LABEL[$domain]:-}"

  cat > "$file" <<HEADER
# ${label:-VOICE} Daily Memoirs - $(date '+%Y-%m-%d %H:%M')

*"The Voice helps you realign, recalibrate, and recharge yourself mentally and emotionally every day."*
$domain_header
---
HEADER

  # Fired tasks section
  if [[ -n "$domain" ]]; then
    echo "" >> "$file"
    echo "## ⚡ Fired Today" >> "$file"
    if [[ -n "$fired_tasks" ]]; then
      echo "$fired_tasks" >> "$file"
    else
      echo "- (no tasks completed yet)" >> "$file"
    fi
    echo "" >> "$file"

    # Fire Map review
    echo "## 🔥 Fire Map Review ($label)" >> "$file"
    echo "" >> "$file"
    echo "**Active War Stacks:**" >> "$file"
    echo "$war_stacks" >> "$file"
    echo "" >> "$file"
    echo "**Weekly Progress Check:**" >> "$file"
    echo "- [ ] On track with current hits" >> "$file"
    echo "- [ ] Obstacles identified and addressed" >> "$file"
    echo "- [ ] Weekly strikes aligned with Freedom goals" >> "$file"
    echo "" >> "$file"
    echo "---" >> "$file"
  fi

  echo "" >> "$file"
  
  # 🛑 STOP
  echo ""
  echo "═══════════════════════════════════════"
  echo "🛑 STOP - Interrupting Patterns"
  echo "═══════════════════════════════════════"
  echo ""
  echo "*Before any real change can happen, you have to recognize that it's needed.*"
  echo ""
  
  cat >> "$file" <<'STOP_SECTION'
## 🛑 STOP - Interrupting Patterns

*"Before any real change can happen, you have to recognize that it's needed."*

### What patterns am I interrupting?

STOP_SECTION
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Describe the destructive pattern..." >> "$file"
  else
    read -rp "> " stop_input
    echo "$stop_input" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### What automatic reactions am I pausing?" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "What am I no longer doing automatically?" >> "$file"
  else
    read -rp "> " reactions
    echo "$reactions" >> "$file"
  fi
  
  echo "" >> "$file"
  
  # 📝 SUBMIT (4F Framework)
  echo ""
  echo "═══════════════════════════════════════"
  echo "📝 SUBMIT - Humility Before Truth"
  echo "═══════════════════════════════════════"
  echo ""
  echo "*Submit means acknowledging the truth of your Facts, Feelings, Focus, and Fruit.*"
  echo ""
  
  cat >> "$file" <<'SUBMIT_SECTION'

---

## 📝 SUBMIT - Humility Before Truth

*"Submit means acknowledging the truth of your Facts, Feelings, Focus, and Fruit."*

### FACTS - What are the undeniable realities?
**What is objectively true about my current situation?**

SUBMIT_SECTION
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Objective facts..." >> "$file"
  else
    read -rp "Facts> " facts
    echo "$facts" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### FEELINGS - How do I truly feel?" >> "$file"
  echo "**What emotions am I experiencing about these facts?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Emotional response..." >> "$file"
  else
    read -rp "Feelings> " feelings
    echo "$feelings" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### FOCUS - What has been my mindset?" >> "$file"
  echo "**How have I been approaching these realities?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Mental approach..." >> "$file"
  else
    read -rp "Focus> " focus
    echo "$focus" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### FRUIT - What results have I produced?" >> "$file"
  echo "**What outcomes have emerged from my current approach?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Results/outcomes..." >> "$file"
  else
    read -rp "Fruit> " fruit
    echo "$fruit" >> "$file"
  fi
  
  echo "" >> "$file"
  
  # ⚔️ STRUGGLE
  echo ""
  echo "═══════════════════════════════════════"
  echo "⚔️  STRUGGLE - Fighting Narratives"
  echo "═══════════════════════════════════════"
  echo ""
  echo "*The real battle begins—the struggle to rewrite the stories you tell yourself.*"
  echo ""
  
  cat >> "$file" <<'STRUGGLE_SECTION'

---

## ⚔️ STRUGGLE - Fighting Narratives

*"The real battle begins—the struggle to rewrite the stories you tell yourself."*

### Current Limiting Stories
**What narratives are holding me back?**

STRUGGLE_SECTION
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Old limiting narrative..." >> "$file"
  else
    read -rp "Old Story> " old_story
    echo "$old_story" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### New Empowering Narrative" >> "$file"
  echo "**What new story do I want to create?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "New empowering narrative..." >> "$file"
  else
    read -rp "New Story> " new_story
    echo "$new_story" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### Evidence for New Story" >> "$file"
  echo "**What supports this empowering narrative?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Evidence..." >> "$file"
  else
    read -rp "Evidence> " evidence
    echo "$evidence" >> "$file"
  fi
  
  echo "" >> "$file"
  
  # ⚡ STRIKE
  echo ""
  echo "═══════════════════════════════════════"
  echo "⚡ STRIKE - Actions from Renewed Narratives"
  echo "═══════════════════════════════════════"
  echo ""
  echo "*With a new story in place, it's time to take action.*"
  echo ""
  
  cat >> "$file" <<'STRIKE_SECTION'

---

## ⚡ STRIKE - Actions from Renewed Narratives

*"With a new story in place, it's time to take action."*

### Immediate Actions
**What specific steps will I take today?**

STRIKE_SECTION
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Today's action..." >> "$file"
  else
    read -rp "Action> " action
    echo "$action" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### This Week's Commitment" >> "$file"
  echo "**How will I live this new narrative this week?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Weekly commitment..." >> "$file"
  else
    read -rp "Weekly> " weekly
    echo "$weekly" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "### Alignment Check" >> "$file"
  echo "**How do these actions align with my new narrative?**" >> "$file"
  echo "" >> "$file"
  
  if command -v gum >/dev/null 2>&1; then
    gum write --placeholder "Alignment..." >> "$file"
  else
    read -rp "Alignment> " alignment
    echo "$alignment" >> "$file"
  fi
  
  echo "" >> "$file"
  echo "---" >> "$file"
  echo "" >> "$file"
  echo "**Session Complete:** $(date '+%Y-%m-%d %H:%M')" >> "$file"

  echo "$file"
}
