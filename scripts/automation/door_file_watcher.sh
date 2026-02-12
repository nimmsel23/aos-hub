#!/usr/bin/env bash
# door_file_watcher.sh - inotify daemon for αOS Door automation
# Watches /Door/2-Plan/ for new War Stacks and triggers automation

set -euo pipefail

# Configuration
VAULT_PATH="${VAULT_PATH:-$HOME/Dokumente/AlphaOs-Vault}"
PLAN_DIR="$VAULT_PATH/Door/2-Plan"
PRODUCTION_DIR="$VAULT_PATH/Door/3-Production"
LOG_FILE="${LOG_FILE:-$HOME/.dotfiles/logs/door-automation.log}"

WAR_STACK_CREATE="${WAR_STACK_CREATE:-$HOME/.dotfiles/bin/war_stack_create.sh}"
OBSIDIAN_TW_SYNC="${OBSIDIAN_TW_SYNC:-$HOME/.dotfiles/bin/obsidian_tw_sync.sh}"

# PID file for single-instance enforcement
PID_FILE="${PID_FILE:-/tmp/door_file_watcher.pid}"

# Create directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$PLAN_DIR"
mkdir -p "$PRODUCTION_DIR"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Check if already running
check_single_instance() {
    if [[ -f "$PID_FILE" ]]; then
        local old_pid
        old_pid=$(cat "$PID_FILE")

        if kill -0 "$old_pid" 2>/dev/null; then
            error "Already running with PID: $old_pid"
            exit 1
        else
            log "Stale PID file found, removing"
            rm -f "$PID_FILE"
        fi
    fi

    echo $$ > "$PID_FILE"
}

# Cleanup on exit
cleanup() {
    log "Shutting down file watcher..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check dependencies
check_deps() {
    if ! command -v inotifywait >/dev/null 2>&1; then
        error "Missing dependency: inotifywait"
        error "Install with: yay -S inotify-tools"
        exit 1
    fi

    if [[ ! -x "$WAR_STACK_CREATE" ]]; then
        error "war_stack_create.sh not found or not executable: $WAR_STACK_CREATE"
        exit 1
    fi

    if [[ ! -x "$OBSIDIAN_TW_SYNC" ]]; then
        error "obsidian_tw_sync.sh not found or not executable: $OBSIDIAN_TW_SYNC"
        exit 1
    fi
}

# Process War Stack creation
process_war_stack() {
    local file="$1"

    log "New War Stack detected: $(basename "$file")"

    # Wait a moment for file to be fully written
    sleep 2

    # Check if file still exists (not a temp file)
    if [[ ! -f "$file" ]]; then
        log "  File disappeared, ignoring"
        return
    fi

    # Check if it's a proper War Stack (has ## 🚪 The Domino Door)
    if ! grep -q "^## 🚪 The Domino Door" "$file"; then
        log "  Not a War Stack file (missing Domino Door section), ignoring"
        return
    fi

    # Run automation
    log "  Triggering automation..."

    if "$WAR_STACK_CREATE" "$file" >> "$LOG_FILE" 2>&1; then
        log "  ✅ Automation complete"
    else
        error "  ❌ Automation failed (see log for details)"
    fi
}

# Process PRODUCTION file changes
process_production_change() {
    local file="$1"

    log "Production file changed: $(basename "$file")"

    # Debounce: ignore rapid changes (Obsidian auto-save)
    sleep 3

    if [[ ! -f "$file" ]]; then
        return
    fi

    # Sync to taskwarrior
    log "  Syncing to taskwarrior..."

    if "$OBSIDIAN_TW_SYNC" "$file" >> "$LOG_FILE" 2>&1; then
        log "  ✅ Sync complete"
    else
        log "  ⚠️  Sync had errors (see log)"
    fi
}

# Watch loop
watch_loop() {
    log "=== Door File Watcher Started ==="
    log "Watching: $PLAN_DIR (War Stack creation)"
    log "Watching: $PRODUCTION_DIR (Hit progress)"
    log "PID: $$"
    log ""

    # Watch both directories with inotify
    inotifywait -m -r -e create -e close_write -e moved_to \
        --format '%w%f %e' \
        "$PLAN_DIR" "$PRODUCTION_DIR" | \
    while read -r filepath event; do
        # Check which directory the event came from
        case "$filepath" in
            "$PLAN_DIR"/WAR_STACK_*.md)
                if [[ "$event" =~ (CREATE|MOVED_TO|CLOSE_WRITE) ]]; then
                    process_war_stack "$filepath"
                fi
                ;;
            "$PRODUCTION_DIR"/WS_*.md)
                if [[ "$event" =~ CLOSE_WRITE ]]; then
                    process_production_change "$filepath"
                fi
                ;;
            *)
                # Ignore other files
                ;;
        esac
    done
}

# Main
main() {
    log "Door File Watcher starting..."

    # Checks
    check_deps
    check_single_instance

    # Start watching
    watch_loop
}

main "$@"
