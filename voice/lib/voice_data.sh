#!/usr/bin/env bash
# voice_data.sh - VOICE session data access

set -euo pipefail

# Environment
VOICE_DIR="${AOS_VAULT_DIR:-$HOME/AlphaOs-Vault}/VOICE"
VOICE_FALLBACK_DIR="$HOME/Voice"

# Determine voice directory
get_voice_dir() {
  if [[ -d "$VOICE_DIR" ]]; then
    echo "$VOICE_DIR"
  elif [[ -d "$VOICE_FALLBACK_DIR" ]]; then
    echo "$VOICE_FALLBACK_DIR"
  else
    echo "$VOICE_DIR"  # Default to vault location
  fi
}

# Get session file path by ID or timestamp
get_session_file() {
  local id="$1"
  local vdir
  vdir=$(get_voice_dir)

  # If full path given
  if [[ -f "$id" ]]; then
    echo "$id"
    return 0
  fi

  # If relative to voice dir
  if [[ -f "$vdir/$id" ]]; then
    echo "$vdir/$id"
    return 0
  fi

  # If just a date/timestamp pattern, search
  local found
  found=$(find "$vdir" -maxdepth 1 -type f -name "*$id*.md" | head -1)
  if [[ -n "$found" ]]; then
    echo "$found"
    return 0
  fi

  return 1
}

# List all sessions (newest first)
list_sessions() {
  local limit="${1:-50}"
  local vdir
  vdir=$(get_voice_dir)

  if [[ ! -d "$vdir" ]]; then
    echo "[]"
    return 0
  fi

  find "$vdir" -maxdepth 1 -type f -name "*.md" -printf '%T@ %p\n' \
    | sort -rn \
    | head -n "$limit" \
    | while read -r timestamp path; do
        local basename
        basename=$(basename "$path" .md)
        local mtime
        mtime=$(date -d "@${timestamp%.*}" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "unknown")
        local size
        size=$(stat -c %s "$path" 2>/dev/null || echo "0")

        # Try to extract first line as title
        local title
        title=$(head -1 "$path" | sed 's/^#\+\s*//' | head -c 60)

        jq -n \
          --arg id "$basename" \
          --arg path "$path" \
          --arg mtime "$mtime" \
          --argjson size "$size" \
          --arg title "$title" \
          '{id: $id, path: $path, mtime: $mtime, size: $size, title: $title}'
      done | jq -s '.'
}

# Get session count
session_count() {
  local vdir
  vdir=$(get_voice_dir)

  if [[ ! -d "$vdir" ]]; then
    echo "0"
    return 0
  fi

  find "$vdir" -maxdepth 1 -type f -name "*.md" | wc -l
}

# Search sessions by content
search_sessions() {
  local query="$1"
  local vdir
  vdir=$(get_voice_dir)

  if [[ ! -d "$vdir" ]]; then
    echo "[]"
    return 0
  fi

  grep -ril "$query" "$vdir"/*.md 2>/dev/null | while read -r path; do
    local basename
    basename=$(basename "$path" .md)
    local mtime
    mtime=$(stat -c %Y "$path" 2>/dev/null || echo "0")
    mtime=$(date -d "@$mtime" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "unknown")

    # Extract matching line
    local match
    match=$(grep -i "$query" "$path" | head -1 | head -c 80)

    jq -n \
      --arg id "$basename" \
      --arg path "$path" \
      --arg mtime "$mtime" \
      --arg match "$match" \
      '{id: $id, path: $path, mtime: $mtime, match: $match}'
  done | jq -s '.'
}

# Session exists check
session_exists() {
  local id="$1"
  get_session_file "$id" >/dev/null 2>&1
}

# Read session content
read_session() {
  local id="$1"
  local file
  file=$(get_session_file "$id")
  cat "$file"
}

# Create new session file
create_session() {
  local vdir
  vdir=$(get_voice_dir)
  mkdir -p "$vdir"

  local timestamp
  timestamp=$(date '+%Y-%m-%d_%H%M')
  local file="$vdir/VOICE-$timestamp.md"

  # Generate template
  cat > "$file" <<EOF
# VOICE Session - $(date '+%Y-%m-%d %H:%M')

## STOP - Pattern Interrupt

**What pattern needs interrupting?**


## SUBMIT - Face Truth

**What truth must be faced?**


## STRUGGLE - Rewrite Story

**What story needs rewriting?**


## STRIKE - Decisive Action

**What action follows?**


---

**Session Complete:** $(date '+%Y-%m-%d %H:%M')
EOF

  echo "$file"
}

# Get session statistics
get_stats() {
  local vdir
  vdir=$(get_voice_dir)

  if [[ ! -d "$vdir" ]]; then
    jq -n '{total: 0, this_week: 0, this_month: 0}'
    return 0
  fi

  local total
  total=$(find "$vdir" -maxdepth 1 -type f -name "*.md" | wc -l)

  local week_start
  week_start=$(date -d "monday" '+%s' 2>/dev/null || date '+%s')

  local month_start
  month_start=$(date -d "$(date '+%Y-%m-01')" '+%s')

  local this_week=0
  local this_month=0

  find "$vdir" -maxdepth 1 -type f -name "*.md" -printf '%T@\n' | while read -r ts; do
    local timestamp="${ts%.*}"
    if (( timestamp >= week_start )); then
      ((this_week++)) || true
    fi
    if (( timestamp >= month_start )); then
      ((this_month++)) || true
    fi
  done

  # Aggregate results
  this_week=$(find "$vdir" -maxdepth 1 -type f -name "*.md" -newermt "monday" 2>/dev/null | wc -l)
  this_month=$(find "$vdir" -maxdepth 1 -type f -name "*.md" -newermt "$(date '+%Y-%m-01')" 2>/dev/null | wc -l)

  jq -n \
    --argjson total "$total" \
    --argjson week "$this_week" \
    --argjson month "$this_month" \
    '{total: $total, this_week: $week, this_month: $month}'
}
