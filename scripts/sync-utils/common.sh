#!/usr/bin/env bash
set -o pipefail

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$COMMON_DIR/.." && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"

# Load global env (optional) so AOS_* defaults come from a single place.
if [[ -f "$SCRIPTS_DIR/lib/aos-env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPTS_DIR/lib/aos-env.sh"
  aos_env_load "" "$ROOT_DIR" || true
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
