#!/usr/bin/env bash
# door_lifecycle.sh - Handle 4P-Flow state transitions
# Called by ticktick_tag_watcher.py

set -euo pipefail

VAULT_PATH="$HOME/AlphaOS-Vault"
LOG_FILE="$HOME/.dotfiles/logs/door-lifecycle.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Args: from_state to_state task_id title
FROM_STATE="${1:-}"
TO_STATE="${2:-}"
TASK_ID="${3:-}"
TITLE="${4:-}"

if [[ -z "$FROM_STATE" || -z "$TO_STATE" ]]; then
    echo "Usage: door_lifecycle.sh <from> <to> <task_id> <title>"
    exit 1
fi

# Find corresponding markdown file
find_md_file() {
    local state_dir="$1"
    local title_slug=$(echo "$TITLE" | tr ' ' '_' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g')

    # Try exact match first
    local exact="$state_dir/${title_slug}.md"
    if [[ -f "$exact" ]]; then
        echo "$exact"
        return 0
    fi

    # Try fuzzy match (contains title slug)
    local fuzzy=$(find "$state_dir" -type f -name "*${title_slug}*.md" 2>/dev/null | head -1)
    if [[ -n "$fuzzy" ]]; then
        echo "$fuzzy"
        return 0
    fi

    return 1
}

transition_potential_to_plan() {
    log "Transition: POTENTIAL → PLAN: $TITLE"

    local source_dir="$VAULT_PATH/Door/1-Potential"
    local target_dir="$VAULT_PATH/Door/2-Plan"

    # Ensure target directory exists
    mkdir -p "$target_dir"

    local file
    file=$(find_md_file "$source_dir") || true

    if [[ -z "$file" ]]; then
        log "  Warning: No MD file found for: $TITLE"
        log "  Creating new War Stack draft in 2-Plan/"

        # Create placeholder (user fills in manually)
        local safe_title=$(echo "$TITLE" | tr ' ' '_')
        local filename="${target_dir}/WAR_STACK_${safe_title}.md"

        cat <<EOF > "$filename"
# WAR STACK - $TITLE

**Domain:** (fill in: body, being, balance, business)
**Week:** KW$(date +%V)

## 🚪 The Domino Door

**What specific Door are you opening this week?**
(fill in)

**What other Doors does this open?**
- Door to: (fill in)

## 🔥 The Spark

**Trigger:** (fill in)
**Narrative:** (fill in)
**Validation:** (fill in)
**Impact:** (fill in)
**Consequences:** (fill in)

## 🎯 The 4 Hits

### Hit 1
- **FACT**: (measurable result)
- **OBSTACLE**: (challenge)
- **STRIKE**: (strategy)
- **RESPONSIBILITY**: alpha

### Hit 2
- **FACT**: (measurable result)
- **OBSTACLE**: (challenge)
- **STRIKE**: (strategy)
- **RESPONSIBILITY**: alpha

### Hit 3
- **FACT**: (measurable result)
- **OBSTACLE**: (challenge)
- **STRIKE**: (strategy)
- **RESPONSIBILITY**: alpha

### Hit 4
- **FACT**: (measurable result)
- **OBSTACLE**: (challenge)
- **STRIKE**: (strategy)
- **RESPONSIBILITY**: alpha
EOF
        log "  Created: $filename"
        echo "✓ Draft created: $filename"
        echo "  Edit manually, then door_file_watcher will trigger automation"
        return 0
    fi

    # Move file
    mv "$file" "$target_dir/"
    log "  Moved: $(basename "$file") → 2-Plan/"
    echo "✓ File moved to 2-Plan/ - door_file_watcher will trigger automation"
}

transition_production_to_profit() {
    log "Transition: PRODUCTION → PROFIT: $TITLE"

    local source_dir="$VAULT_PATH/Door/3-Production"
    local target_dir="$VAULT_PATH/Door/4-Profit"

    # Ensure target directory exists
    mkdir -p "$target_dir"

    local file
    file=$(find_md_file "$source_dir") || true

    if [[ -z "$file" ]]; then
        log "  Warning: No War Stack file found in Production"
        echo "✗ No War Stack file found in 3-Production/"
        return 1
    fi

    # Move file
    mv "$file" "$target_dir/"
    log "  Archived: $(basename "$file") → 4-Profit/"

    # Notify for General's Tent
    echo "✓ War Stack completed! Ready for General's Tent review (Sunday)"
}

# Main transition logic
case "$FROM_STATE→$TO_STATE" in
    potential→plan)
        transition_potential_to_plan
        ;;
    production→profit)
        transition_production_to_profit
        ;;
    *)
        log "Unknown transition: $FROM_STATE → $TO_STATE"
        echo "✗ Unsupported transition: $FROM_STATE → $TO_STATE"
        exit 1
        ;;
esac
