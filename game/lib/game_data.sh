#!/usr/bin/env bash
# game_data.sh - Data access for Game Maps
# Used by: gamectl CLI, Index Node API

set -euo pipefail

VAULT_DIR="${AOS_VAULT_DIR:-$HOME/AlphaOS-Vault}"
GAME_DIR="$VAULT_DIR/GAME"

# Map hierarchy levels
declare -a MAP_LEVELS=(frame ipw freedom focus fire daily)

# Get map file path
# Args: map_level domain
# Output: file path
get_map_file() {
  local map_level="$1"
  local domain="${2:-}"

  case "$map_level" in
    frame)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/Frame/${domain^^}-Frame.md"
      else
        echo "$GAME_DIR/Frame"
      fi
      ;;
    ipw)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/IPW/${domain^^}-IPW.md"
      else
        echo "$GAME_DIR/IPW"
      fi
      ;;
    freedom)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/Freedom/${domain^^}-Freedom-$(date +%Y).md"
      else
        echo "$GAME_DIR/Freedom"
      fi
      ;;
    focus)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/Focus/${domain^^}-Focus-$(date +%Y-%m).md"
      else
        echo "$GAME_DIR/Focus"
      fi
      ;;
    fire)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/Fire/${domain^^}-Fire-$(date +%Y-W%V).md"
      else
        echo "$GAME_DIR/Fire"
      fi
      ;;
    daily)
      if [[ -n "$domain" ]]; then
        echo "$GAME_DIR/Daily/${domain^^}-Daily-$(date +%Y-%m-%d).md"
      else
        echo "$GAME_DIR/Daily"
      fi
      ;;
    tent)
      echo "$GAME_DIR/Tent/Tent-$(date +%Y-W%V).md"
      ;;
    *)
      return 1
      ;;
  esac
}

# Check if map exists
# Args: map_level domain
map_exists() {
  local map_file
  map_file=$(get_map_file "$@")

  [[ -f "$map_file" ]]
}

# List all maps for level
# Args: map_level
# Output: list of files
list_maps() {
  local map_level="$1"
  local map_dir
  map_dir=$(get_map_file "$map_level")

  if [[ ! -d "$map_dir" ]]; then
    return 1
  fi

  find "$map_dir" -name "*.md" -type f | sort -r
}

# Get map metadata
# Args: map_level domain
# Output: JSON object
get_map_metadata() {
  local map_level="$1"
  local domain="${2:-}"
  local map_file
  map_file=$(get_map_file "$map_level" "$domain")

  if [[ ! -f "$map_file" ]]; then
    echo "{}"
    return 1
  fi

  local modified
  modified=$(stat -c %Y "$map_file" 2>/dev/null || stat -f %m "$map_file" 2>/dev/null || echo "0")
  local size
  size=$(stat -c %s "$map_file" 2>/dev/null || stat -f %z "$map_file" 2>/dev/null || echo "0")
  local lines
  lines=$(wc -l < "$map_file")

  jq -n \
    --arg level "$map_level" \
    --arg domain "$domain" \
    --arg file "$map_file" \
    --arg modified "$modified" \
    --arg size "$size" \
    --arg lines "$lines" \
    '{
      level: $level,
      domain: $domain,
      file: $file,
      modified: ($modified | tonumber),
      size: ($size | tonumber),
      lines: ($lines | tonumber)
    }'
}

# Get all domains
get_domains() {
  echo "body"
  echo "being"
  echo "balance"
  echo "business"
}

# Check if domain is valid
is_valid_domain() {
  local domain="$1"
  [[ "$domain" =~ ^(body|being|balance|business)$ ]]
}

# Get map level display name
get_map_level_name() {
  case "$1" in
    frame) echo "Frame (Where am I?)" ;;
    ipw) echo "IPW (10-year Vision)" ;;
    freedom) echo "Freedom (Annual)" ;;
    focus) echo "Focus (Monthly)" ;;
    fire) echo "Fire (Weekly)" ;;
    daily) echo "Daily Game" ;;
    tent) echo "General's Tent" ;;
    *) echo "$1" ;;
  esac
}

# Get map level emoji
get_map_level_emoji() {
  case "$1" in
    frame) echo "🗺️" ;;
    ipw) echo "🔮" ;;
    freedom) echo "🦅" ;;
    focus) echo "🎯" ;;
    fire) echo "🔥" ;;
    daily) echo "📅" ;;
    tent) echo "⛺" ;;
    *) echo "📄" ;;
  esac
}
