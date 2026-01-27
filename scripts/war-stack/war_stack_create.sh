#!/usr/bin/env bash
# war_stack_create.sh - Auto-create TickTick list + Taskwarrior tasks from War Stack
# Part of AlphaOS Door 4P Workflow Automation (Phase 2)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT_PATH="${VAULT_PATH:-$HOME/Dokumente/AlphaOs-Vault}"
PLAN_DIR="$VAULT_PATH/Door/2-Plan"
PRODUCTION_DIR="$VAULT_PATH/Door/3-Production"
LOG_FILE="${LOG_FILE:-$HOME/.dotfiles/logs/door-automation.log}"
TICKTICK_API="${TICKTICK_API:-$HOME/.dotfiles/scripts/utils/integrations/ticktick_api.sh}"
DOOR_UUID_SYNC="${DOOR_UUID_SYNC:-$REPO_ROOT/python-ticktick/door_uuid_sync.py}"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Check dependencies
check_deps() {
    local missing=()

    for cmd in task jq yq; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing dependencies: ${missing[*]}"
        error "Install with: yay -S taskwarrior jq yq"
        return 1
    fi

    if [[ ! -x "$TICKTICK_API" ]]; then
        error "TickTick API script not found or not executable: $TICKTICK_API"
        return 1
    fi
}

# Parse War Stack markdown file
parse_war_stack() {
    local file="$1"

    if [[ ! -f "$file" ]]; then
        error "File not found: $file"
        return 1
    fi

    log "Parsing War Stack: $(basename "$file")"

    # Extract from YAML frontmatter and markdown
    local title domain week created

    # Try YAML frontmatter first (between --- markers)
    if grep -q "^---$" "$file"; then
        domain=$(awk '/^---$/,/^---$/ {if (/^domain:/) print $2}' "$file" | head -1)
        created=$(awk '/^---$/,/^---$/ {if (/^created:/) print $2}' "$file" | head -1)
    fi

    # Extract title from first # heading
    title=$(grep "^# WAR STACK -" "$file" | head -1 | sed 's/^# WAR STACK - //')

    # Extract week from markdown
    if [[ -z "$week" ]]; then
        week=$(grep "^\*\*Week:\*\*" "$file" | sed 's/.*KW\([0-9]\+\).*/\1/' | head -1)
    fi

    # Domain from markdown if not in frontmatter
    if [[ -z "$domain" ]]; then
        domain=$(grep "^\*\*Domain:\*\*" "$file" | sed 's/.*Domain:\*\* \([A-Z]\+\).*/\1/' | head -1)
    fi

    # Validate required fields
    if [[ -z "$title" ]]; then
        error "Could not extract title from: $file"
        return 1
    fi

    if [[ -z "$domain" ]]; then
        error "Could not extract domain from: $file"
        return 1
    fi

    # Convert domain to lowercase for taskwarrior
    domain=$(echo "$domain" | tr '[:upper:]' '[:lower:]')

    # Get current week if not found
    if [[ -z "$week" ]]; then
        week=$(date +%V)
    fi

    # Export for other functions
    export WS_TITLE="$title"
    export WS_DOMAIN="$domain"
    export WS_WEEK="$week"
    export WS_FILE="$file"

    log "  Title: $title"
    log "  Domain: $domain"
    log "  Week: KW$week"
}

# Extract Domino Door section
extract_domino_door() {
    local file="$1"

    # Extract text between ## 🚪 The Domino Door and next ##
    local door_section
    door_section=$(awk '/^## 🚪 The Domino Door$/,/^## [^#]/ {if (!/^##/) print}' "$file")

    # Get the "What specific Door" answer
    local door
    door=$(echo "$door_section" | grep "^\*\*What specific Door" -A 1 | tail -1)

    if [[ -z "$door" ]]; then
        # Fallback: get first non-empty line after heading
        door=$(echo "$door_section" | grep -v "^$" | grep -v "^\*\*" | head -1)
    fi

    export WS_DOOR="$door"
    log "  Domino Door: $door"
}

# Validate Domino Door (Elliott Hulse Oracle guidance)
validate_domino_door() {
    local file="$1"

    # Check if "What other Doors" section exists and has content
    local other_doors
    other_doors=$(awk '/\*\*What other Doors does this open\?\*\*/,/^\*\*/ {print}' "$file" | grep "^- Door" | wc -l)

    if [[ "$other_doors" -eq 0 ]]; then
        log "  ⚠️  Warning: No domino effect listed (this may not be a Domino Door)"
        log "  ⚠️  Elliott teaches: 'Focus on Domino Doors - one door opens many'"

        if [[ "${SKIP_DOMINO_VALIDATION:-0}" != "1" ]]; then
            error "Domino Door validation failed"
            error "Add doors this unlocks, or set SKIP_DOMINO_VALIDATION=1"
            return 1
        fi
    else
        log "  ✅ Domino Door validated ($other_doors doors will open)"
    fi
}

# Extract 4 Hits
extract_hits() {
    local file="$1"

    log "Extracting 4 Hits..."

    declare -gA HITS_FACT
    declare -gA HITS_OBSTACLE
    declare -gA HITS_STRIKE
    declare -gA HITS_RESPONSIBILITY

    for hit_num in 1 2 3 4; do
        # Extract Hit section
        local hit_section
        hit_section=$(awk "/^### Hit $hit_num /,/^### Hit [0-9]|^## / {print}" "$file")

        # Extract fields
        local fact obstacle strike responsibility
        fact=$(echo "$hit_section" | grep "^- \*\*FACT:\*\*" | sed 's/^- \*\*FACT:\*\* //')
        obstacle=$(echo "$hit_section" | grep "^- \*\*OBSTACLE:\*\*" | sed 's/^- \*\*OBSTACLE:\*\* //')
        strike=$(echo "$hit_section" | grep "^- \*\*STRIKE:\*\*" | sed 's/^- \*\*STRIKE:\*\* //')
        responsibility=$(echo "$hit_section" | grep "^- \*\*RESPONSIBILITY:\*\*" | sed 's/^- \*\*RESPONSIBILITY:\*\* //')

        if [[ -z "$fact" ]]; then
            error "Hit $hit_num: Missing FACT"
            return 1
        fi

        # Store in associative arrays
        HITS_FACT[$hit_num]="$fact"
        HITS_OBSTACLE[$hit_num]="${obstacle:-Unknown}"
        HITS_STRIKE[$hit_num]="${strike:-TBD}"
        HITS_RESPONSIBILITY[$hit_num]="${responsibility:-alpha}"

        log "  Hit $hit_num: $fact"
    done
}

# Create TickTick list
create_ticktick_list() {
    log "Creating TickTick list..."

    local list_name="WS_${WS_TITLE// /_}_KW${WS_WEEK}"

    # Sanitize list name (remove special chars except underscore)
    list_name=$(echo "$list_name" | tr -cd '[:alnum:]_')

    log "  List name: $list_name"

    # Create project (list) via API
    local project_id
    project_id=$("$TICKTICK_API" create-project "$list_name" "#FF5722" 2>/dev/null || echo "")

    if [[ -z "$project_id" ]]; then
        log "  ⚠️  TickTick API not configured or failed"
        log "  ⚠️  Skipping TickTick list creation"
        log "  ⚠️  War Stack will be tracked in Taskwarrior only"
        export TICKTICK_PROJECT_ID=""
        return 0
    fi

    log "  ✅ Created TickTick project: $project_id"
    export TICKTICK_PROJECT_ID="$project_id"

    # Add 4 Hits as tasks
    for hit_num in 1 2 3 4; do
        local title="${HITS_FACT[$hit_num]}"
        local content="Obstacle: ${HITS_OBSTACLE[$hit_num]}\nStrike: ${HITS_STRIKE[$hit_num]}"
        local tags="production,${WS_DOMAIN}"

        local task_id
        task_id=$("$TICKTICK_API" add-task "$project_id" "Hit $hit_num: $title" "$content" "$tags" 5 2>/dev/null || echo "")

        if [[ -n "$task_id" ]]; then
            log "  ✅ Added Hit $hit_num: $task_id"
        else
            log "  ⚠️  Failed to add Hit $hit_num"
        fi
    done
}

# Create Door-TickTick UUID mapping
create_door_ticktick_mapping() {
    local door_uuid="$1"
    local ticktick_project_id="$2"

    if [[ -z "$door_uuid" || -z "$ticktick_project_id" ]]; then
        log "  ⚠️  Skipping UUID mapping (missing door_uuid or project_id)"
        return 0
    fi

    local map_file="$HOME/AlphaOS-Vault/.alphaos/door_ticktick_map.json"
    mkdir -p "$(dirname "$map_file")"

    # Load existing map or create new
    local map
    if [[ -f "$map_file" ]]; then
        map=$(cat "$map_file")
    else
        map="{}"
    fi

    # Add mapping
    map=$(echo "$map" | jq --arg uuid "$door_uuid" --arg tt_id "$ticktick_project_id" \
        '. + {($uuid): $tt_id}')

    echo "$map" > "$map_file"
    log "  ✅ UUID Mapping: $door_uuid → $ticktick_project_id"
}

# Create Taskwarrior tasks
create_taskwarrior_tasks() {
    log "Creating Taskwarrior tasks..."

    # 1. Create Door parent task
    local door_task_id
    door_task_id=$(task add \
        project:"$WS_TITLE" \
        +door \
        +plan \
        alphatype:door \
        door_name:"$WS_TITLE" \
        pillar:door \
        domain:"$WS_DOMAIN" \
        "Door: $WS_TITLE" \
        | grep -oP 'Created task \K\d+' || echo "")

    if [[ -z "$door_task_id" ]]; then
        error "Failed to create Door task"
        return 1
    fi

    # Extract UUID and store as UDA
    local door_uuid
    door_uuid=$(task _get "$door_task_id.uuid")

    if [[ -n "$door_uuid" ]]; then
        task "$door_task_id" modify door_uuid:"$door_uuid" >/dev/null 2>&1
        export DOOR_UUID="$door_uuid"
        log "  ✅ Created Door task: ID=$door_task_id UUID=$door_uuid"
    else
        log "  ⚠️  Warning: Could not extract UUID for task $door_task_id"
    fi

    # Annotate with PLAN file
    task "$door_task_id" annotate "file://$WS_FILE"

    log "  ✅ Annotated with: $WS_FILE"

    # 2. Create 4 Hit tasks (children of Door task)
    # Predict PRODUCTION file path (will be created by TickTick plugin)
    local production_file="$PRODUCTION_DIR/WS_${WS_TITLE// /_}_KW${WS_WEEK}.md"

    for hit_num in 1 2 3 4; do
        local fact="${HITS_FACT[$hit_num]}"
        local responsibility="${HITS_RESPONSIBILITY[$hit_num]}"

        # Calculate due date (Mon-Thu of current week)
        local day_offset=$((hit_num))  # Mon=1, Tue=2, Wed=3, Thu=4
        local due_date
        due_date=$(date -d "monday +$((day_offset - 1)) days" +%Y-%m-%d)

        local hit_task_uuid
        hit_task_uuid=$(task add \
            project:"$WS_TITLE" \
            +hit \
            +production \
            hit_number:"$hit_num" \
            depends:"$door_task_id" \
            alphatype:hit \
            pillar:door \
            domain:"$WS_DOMAIN" \
            responsibility:"$responsibility" \
            due:"$due_date" \
            "Hit $hit_num: $fact" \
            | grep -oP 'Created task \K\d+' || echo "")

        if [[ -n "$hit_task_uuid" ]]; then
            # Annotate with PRODUCTION file
            task "$hit_task_uuid" annotate "file://$production_file"
            log "  ✅ Created Hit $hit_num task: $hit_task_uuid (due: $due_date)"
        else
            log "  ⚠️  Failed to create Hit $hit_num task"
        fi
    done
}

# Main workflow
main() {
    local file="${1:-}"

    if [[ -z "$file" ]]; then
        error "Usage: war_stack_create.sh <WAR_STACK_FILE.md>"
        exit 1
    fi

    log "=== War Stack Automation Started ==="
    log "File: $file"

    # Check dependencies
    check_deps || exit 1

    # Parse War Stack
    parse_war_stack "$file" || exit 1
    extract_domino_door "$file" || exit 1
    validate_domino_door "$file" || exit 1
    extract_hits "$file" || exit 1

    # Create integrations
    create_ticktick_list || log "  ⚠️  TickTick creation skipped"
    create_taskwarrior_tasks || exit 1

    # Create UUID mapping and sync to TickTick
    if [[ -n "$DOOR_UUID" && -n "$TICKTICK_PROJECT_ID" ]]; then
        create_door_ticktick_mapping "$DOOR_UUID" "$TICKTICK_PROJECT_ID"

        # Push UUID to TickTick description
        if [[ -x "$DOOR_UUID_SYNC" ]]; then
            if "$DOOR_UUID_SYNC" --door-uuid "$DOOR_UUID" --ticktick-id "$TICKTICK_PROJECT_ID"; then
                log "  ✅ UUID synced to TickTick"
            else
                log "  ⚠️  UUID sync to TickTick failed (API error?)"
            fi
        else
            log "  ⚠️  door_uuid_sync.py not found (UUID not synced to TickTick)"
        fi
    else
        log "  ⚠️  UUID or TickTick Project ID missing (skipping sync)"
    fi

    log "=== War Stack Automation Complete ==="
    log "Next steps:"
    log "1. TickTick will sync to: $PRODUCTION_DIR/"
    log "2. taskopen <uuid> to open files"
    log "3. Complete Hits Mon-Thu (4 days)"
    log "4. Sunday: General's Tent review"
    log ""
    log "Elliott teaches: 'The map is not the territory. Execute your Hits!'"
}

main "$@"
