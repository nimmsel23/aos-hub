#!/usr/bin/env bash
# game_tent.sh - General's Tent operations
# Used by: gamectl CLI, Index Node API

set -euo pipefail

VAULT_DIR="${AOS_VAULT_DIR:-$HOME/AlphaOS-Vault}"
TENT_DIR="$VAULT_DIR/GAME/Tent"

# Get current week's tent file
get_tent_file() {
  echo "$TENT_DIR/Tent-$(date +%Y-W%V).md"
}

# Check if this week's tent exists
tent_exists() {
  [[ -f "$(get_tent_file)" ]]
}

# Create tent template
# Args: week (optional, defaults to current)
create_tent() {
  local week="${1:-$(date +%Y-W%V)}"
  local tent_file="$TENT_DIR/Tent-$week.md"

  mkdir -p "$TENT_DIR"

  cat > "$tent_file" <<'EOF'
# General's Tent - Week WEEK

**Date:** DATE

## 🔥 Weekly Fire Review

### BODY Domain
- **Wins:**
- **Misses:**
- **Insights:**
- **Next Week:**

### BEING Domain
- **Wins:**
- **Misses:**
- **Insights:**
- **Next Week:**

### BALANCE Domain
- **Wins:**
- **Misses:**
- **Insights:**
- **Next Week:**

### BUSINESS Domain
- **Wins:**
- **Misses:**
- **Insights:**
- **Next Week:**

---

## 🎯 Domino Doors Progress

### Active Doors
1. **Door Name** (Phase) - Progress: X/Y hits
   - Key wins:
   - Blockers:
   - Next week:

---

## 📊 DOMINION Status

| Domain | Current Frame | Progress | Health |
|--------|---------------|----------|--------|
| BODY | | | |
| BEING | | | |
| BALANCE | | | |
| BUSINESS | | | |

---

## 🔄 Cascade Check

- [ ] Frame Maps current
- [ ] Freedom aligned with Frame
- [ ] Focus aligned with Freedom
- [ ] Fire aligned with Focus
- [ ] Daily Game consistent

**Cascade issues:**
-

---

## 💡 Insights & Patterns

### What worked well?

### What needs adjustment?

### Key learnings?

---

## 🎯 Next Week Intentions

### Top 3 Priorities
1.
2.
3.

### Domain Focus
- **BODY:**
- **BEING:**
- **BALANCE:**
- **BUSINESS:**

---

## 📝 Notes & Reflections

EOF

  sed -i "s/WEEK/$week/" "$tent_file"
  sed -i "s/DATE/$(date +%Y-%m-%d)/" "$tent_file"

  echo "$tent_file"
}

# List all tent sessions
list_tents() {
  find "$TENT_DIR" -name "Tent-*.md" -type f 2>/dev/null | sort -r
}

# Get tent metadata
# Args: week (optional)
get_tent_metadata() {
  local week="${1:-$(date +%Y-W%V)}"
  local tent_file="$TENT_DIR/Tent-$week.md"

  if [[ ! -f "$tent_file" ]]; then
    echo "{}"
    return 1
  fi

  local modified
  modified=$(stat -c %Y "$tent_file" 2>/dev/null || stat -f %m "$tent_file" 2>/dev/null || echo "0")
  local size
  size=$(stat -c %s "$tent_file" 2>/dev/null || stat -f %z "$tent_file" 2>/dev/null || echo "0")

  jq -n \
    --arg week "$week" \
    --arg file "$tent_file" \
    --arg modified "$modified" \
    --arg size "$size" \
    '{
      week: $week,
      file: $file,
      modified: ($modified | tonumber),
      size: ($size | tonumber)
    }'
}
