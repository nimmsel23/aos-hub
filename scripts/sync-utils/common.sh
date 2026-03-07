#!/usr/bin/env bash
set -o pipefail

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$COMMON_DIR/.." && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"

# Load global env (optional) so AOS_* defaults come from a single place.
if [[ -f "$SCRIPTS_DIR/lib/aos-env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPTS_DIR/lib/aos-env.sh"
  if aos_env_load "" "$ROOT_DIR"; then
    :
  else
    __aos_env_load_rc=$?
    if [[ "${AOS_ENV_REQUIRE:-0}" == "1" ]]; then
      return "$__aos_env_load_rc" 2>/dev/null || exit "$__aos_env_load_rc"
    fi
  fi
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}OK${NC} $1"; }
warning() { echo -e "${YELLOW}WARN${NC} $1"; }
error() { echo -e "${RED}ERR${NC} $1"; }

SYNC_ALERT_BOT_TOKEN_DEFAULT="8604865239:AAHKVEZCqyLWzt-0yu78gQBqY3qbgrazRWA"
SYNC_ALERT_CHAT_ID_DEFAULT="${AOS_VAULT_ALERT_CHAT_ID:-8442781308}"
SYNC_ALERT_ENABLED_DEFAULT="${AOS_SYNC_ALERT_ENABLED:-1}"

sync_alert_send() {
  local message="${1:-}"
  local token="${AOS_SYNC_ALERT_BOT_TOKEN:-$SYNC_ALERT_BOT_TOKEN_DEFAULT}"
  local chat_id="${AOS_SYNC_ALERT_CHAT_ID:-$SYNC_ALERT_CHAT_ID_DEFAULT}"
  local enabled="${AOS_SYNC_ALERT_ENABLED:-$SYNC_ALERT_ENABLED_DEFAULT}"
  [[ "$enabled" == "1" ]] || return 0
  [[ -n "$message" && -n "$token" && -n "$chat_id" ]] || return 0
  command -v curl >/dev/null 2>&1 || return 0

  curl -sS -X POST \
    "https://api.telegram.org/bot${token}/sendMessage" \
    --data-urlencode "chat_id=${chat_id}" \
    --data-urlencode "text=${message}" \
    --data "disable_notification=true" \
    >/dev/null 2>&1 || true
}

sync_alert_success() {
  local flow="${1:-sync}"
  local detail="${2:-completed}"
  sync_alert_send "[sync:${flow}] OK ${detail} @ $(hostname) $(date '+%Y-%m-%d %H:%M:%S %Z')"
}

sync_alert_error() {
  local flow="${1:-sync}"
  local detail="${2:-failed}"
  sync_alert_send "[sync:${flow}] ERR ${detail} @ $(hostname) $(date '+%Y-%m-%d %H:%M:%S %Z')"
}

script_header() {
  local script_name="$1"
  local description="${2:-}"
  if [ "${AOS_NO_CLEAR:-0}" != "1" ]; then
    clear
  fi
  echo "========================================"
  echo "$script_name"
  echo "========================================"
  if [ -n "$description" ]; then
    echo "$description"
    echo ""
  fi
}
