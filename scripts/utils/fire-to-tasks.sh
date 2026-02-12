#!/usr/bin/env bash
# fire-to-tasks.sh - Convert Fire Map Hits to Taskwarrior tasks
#
# Usage: fire-to-tasks.sh <FIRE_MAP_FILE> [--dry-run] [--project NAME] [--due DATE]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_usage() {
  cat << EOF
Usage: $0 <FIRE_MAP_FILE> [OPTIONS]

Convert Fire Map Hits to Taskwarrior tasks with αOS UDAs.

ARGUMENTS:
    FIRE_MAP_FILE    Path to Fire Map markdown file (e.g., FIRE_MAP_BODY_KW49_2025.md)

OPTIONS:
    --dry-run        Show what would be created without actually creating tasks
    --project NAME   Override project name (default: extracted from domain)
    --due DATE       Override due date (default: derived from KW number)
    --help           Show this help message
EOF
}

DRY_RUN=false
PROJECT_OVERRIDE=""
DUE_OVERRIDE=""
FIRE_MAP_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --project) PROJECT_OVERRIDE="${2:-}"; shift 2 ;;
    --due) DUE_OVERRIDE="${2:-}"; shift 2 ;;
    --help) show_usage; exit 0 ;;
    -*)
      log_error "Unknown option: $1"
      show_usage
      exit 1
      ;;
    *)
      FIRE_MAP_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "$FIRE_MAP_FILE" ]]; then
  log_error "No Fire Map file specified"
  show_usage
  exit 1
fi
if [[ ! -f "$FIRE_MAP_FILE" ]]; then
  log_error "File not found: $FIRE_MAP_FILE"
  exit 1
fi

log_info "Processing Fire Map: $FIRE_MAP_FILE"

FILENAME=$(basename "$FIRE_MAP_FILE")
DOMAIN=$(echo "$FILENAME" | sed -E 's/FIRE_MAP_([A-Z]+)_KW([0-9]+)_([0-9]+)\.md/\1/')
KW=$(echo "$FILENAME" | sed -E 's/FIRE_MAP_([A-Z]+)_KW([0-9]+)_([0-9]+)\.md/\2/')
YEAR=$(echo "$FILENAME" | sed -E 's/FIRE_MAP_([A-Z]+)_KW([0-9]+)_([0-9]+)\.md/\3/')

log_info "Detected: Domain=$DOMAIN, KW=$KW, Year=$YEAR"

if [[ -n "$PROJECT_OVERRIDE" ]]; then
  PROJECT="$PROJECT_OVERRIDE"
else
  PROJECT="$DOMAIN"
fi

if [[ -n "$DUE_OVERRIDE" ]]; then
  DUE_DATE="$DUE_OVERRIDE"
else
  DUE_DATE=$(date -d "$YEAR-01-01 +$((KW * 7)) days" +%Y-%m-%d)
  log_info "Calculated due date: $DUE_DATE (Sunday of KW$KW)"
fi

log_info "Parsing Fire Map hits..."
HIT_COUNTER=0

while IFS= read -r line; do
  if [[ "$line" =~ ^###[[:space:]]+[0-9]+\.[[:space:]]+\*\*Hit[[:space:]]#[0-9]+:[[:space:]](.+)\*\* ]]; then
    HIT_TITLE="${BASH_REMATCH[1]}"
    HIT_COUNTER=$((HIT_COUNTER + 1))

    STRIKE=""
    FACT=""
    OBSTACLE=""

    # Best-effort parse subsequent bullet lines (until next header).
    while IFS= read -r detail_line; do
      if [[ "$detail_line" =~ ^###[[:space:]] ]] || [[ "$detail_line" =~ ^##[[:space:]] ]]; then
        break
      fi
      if [[ "$detail_line" =~ ^\-[[:space:]]+\*\*Strike:\*\*[[:space:]](.+) ]]; then
        STRIKE="${BASH_REMATCH[1]}"
      fi
      if [[ "$detail_line" =~ ^\-[[:space:]]+\*\*Fact:\*\*[[:space:]](.+) ]]; then
        FACT="${BASH_REMATCH[1]}"
      fi
      if [[ "$detail_line" =~ ^\-[[:space:]]+\*\*Obstacle:\*\*[[:space:]](.+) ]]; then
        OBSTACLE="${BASH_REMATCH[1]}"
      fi
    done < <(tail -n +$((LINENO + 1)) "$FIRE_MAP_FILE")

    if [[ -n "$STRIKE" ]]; then
      TASK_DESC="$HIT_TITLE - $STRIKE"
    else
      TASK_DESC="$HIT_TITLE"
    fi

    TASK_CMD=(task add "$TASK_DESC" "project:${PROJECT}.Fire" +fire +hit "due:${DUE_DATE}" pillar:GAME "domain:${DOMAIN}" alphatype:hit)

    case "$DOMAIN" in
      BODY) TASK_CMD+=(+fitness) ;;
      BEING) TASK_CMD+=(+meditation) ;;
      BALANCE) TASK_CMD+=(+social) ;;
      BUSINESS) TASK_CMD+=(+work) ;;
    esac

    if [[ "$DRY_RUN" == true ]]; then
      log_warn "[DRY RUN] Would create: ${TASK_CMD[*]}"
    else
      log_info "Creating task: Hit #$HIT_COUNTER - $HIT_TITLE"
      if "${TASK_CMD[@]}" >/dev/null 2>&1; then
        log_success "Task created: $HIT_TITLE"
      else
        log_error "Failed to create task: $HIT_TITLE"
      fi
    fi
  fi
done < "$FIRE_MAP_FILE"

if [[ $HIT_COUNTER -eq 0 ]]; then
  log_warn "No hits found in Fire Map file"
  exit 1
fi

log_success "Processed $HIT_COUNTER hits from $DOMAIN Fire Map (KW$KW)"

if [[ "$DRY_RUN" == true ]]; then
  log_warn "DRY RUN completed - no tasks were actually created"
else
  log_success "All tasks created successfully!"
  log_info "View tasks: task project:${PROJECT}.Fire list"
  log_info "View fire hits: task +fire +hit list"
fi

