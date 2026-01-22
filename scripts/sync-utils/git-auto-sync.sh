#!/usr/bin/env bash
# Git Auto-Sync Script
# Auto-commit + pull --rebase + push for any repo.
# Usage: git-auto-sync.sh [<repo_path>] [<label>]

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}->${NC} $1"; }
success() { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }
die() { echo -e "${RED}ERR${NC} $1"; exit 1; }

show_help() {
  cat <<EOF_HELP
Usage: $(basename "$0") [<repo_path>] [<label>]

Auto-commit + pull --rebase + push for a git repo.
- repo_path: defaults to current directory
- label: optional name for output
EOF_HELP
}

if [[ "${1:-}" =~ ^(-h|--help)$ ]]; then
  show_help
  exit 0
fi

REPO_DIR="${1:-$(pwd)}"
LABEL="${2:-$(basename "$REPO_DIR")}"
SILENT_MODE="${AOS_GIT_SILENT:-0}"  # Set to 1 to suppress output if up-to-date

if [ ! -d "$REPO_DIR/.git" ]; then
  die "Not a git repository: $REPO_DIR"
fi

if ! git -C "$REPO_DIR" remote get-url origin &>/dev/null; then
  warn "No remote 'origin' configured."
  echo ""
  echo "To add a remote, run:"
  echo "  cd $REPO_DIR"
  echo "  git remote add origin <your-repo-url>"
  echo ""
  exit 0
fi

BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"

# Track if anything changed
CHANGES_MADE=0

# Only show header if not in silent mode or if there are changes
show_header() {
  if [ "$SILENT_MODE" = "0" ] || [ "$CHANGES_MADE" = "1" ]; then
    echo ""
    echo "========================================"
    printf "  %-36s\n" "${LABEL} Git Auto-Sync"
    echo "========================================"
    echo ""
  fi
}

show_header

log "Checking for changes..."
if git -C "$REPO_DIR" status --porcelain | grep -q .; then
  CHANGES_MADE=1
  log "Adding changes..."
  git -C "$REPO_DIR" add -A

  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  COMMIT_MSG="Auto-sync: $TIMESTAMP - $LABEL"

  if ! git -C "$REPO_DIR" diff --staged --quiet; then
    log "Committing changes..."
    git -C "$REPO_DIR" commit -m "$COMMIT_MSG"
    success "Committed: $COMMIT_MSG"
  else
    success "No changes to commit."
  fi
else
  [ "$SILENT_MODE" = "0" ] && success "No changes to commit."
fi

log "Fetching remote changes..."
if ! git -C "$REPO_DIR" fetch origin "$BRANCH" 2>/dev/null; then
  warn "Fetch failed - might be offline or no remote"
else
  # Check if remote has new commits
  behind=$(git -C "$REPO_DIR" rev-list HEAD..@{u} --count 2>/dev/null || echo 0)

  if [ "$behind" -gt 0 ]; then
    CHANGES_MADE=1
    log "Pulling $behind new commit(s)..."
    if git -C "$REPO_DIR" pull --rebase origin "$BRANCH"; then
      success "Pulled $behind commit(s) from remote"
    else
      die "Pull failed - resolve conflicts manually"
    fi
  else
    [ "$SILENT_MODE" = "0" ] && success "Already up to date with remote"
  fi
fi

log "Pushing changes to remote..."
if git -C "$REPO_DIR" rev-parse --abbrev-ref --symbolic-full-name @{u} &>/dev/null; then
  ahead=$(git -C "$REPO_DIR" rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
  if [ "$ahead" -gt 0 ]; then
    CHANGES_MADE=1
    if git -C "$REPO_DIR" push origin "$BRANCH" || git -C "$REPO_DIR" push -u origin "$BRANCH"; then
      success "Pushed successfully!"
      if [ "${AOS_GIT_NOTIFY:-0}" = "1" ] && command -v tele &>/dev/null; then
        tele -s "Pushed: ${LABEL} (${BRANCH})" &
      fi
    else
      die "Push failed - check your network and permissions"
    fi
  else
    [ "$SILENT_MODE" = "0" ] && success "Already up to date."
  fi
else
  if git -C "$REPO_DIR" push -u origin "$BRANCH"; then
    success "Pushed successfully!"
    if [ "${AOS_GIT_NOTIFY:-0}" = "1" ] && command -v tele &>/dev/null; then
      tele -s "Pushed: ${LABEL} (${BRANCH})" &
    fi
  else
    die "Push failed - check your network and permissions"
  fi
fi

# Only show completion if something happened or not in silent mode
if [ "$SILENT_MODE" = "0" ] || [ "$CHANGES_MADE" = "1" ]; then
  echo ""
  echo "========================================"
  echo "  Sync Complete!"
  echo "========================================"
  echo ""

  log "Recent commits:"
  git -C "$REPO_DIR" log --oneline -3
  echo ""
fi
