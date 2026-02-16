#!/usr/bin/env bash
set -euo pipefail

# Shared helpers for *ctl scripts.
# Backward-compatible facade that sources modular helpers from scripts/lib/ctl/*.

if [[ "${__AOS_CTL_LIB_LOADED:-0}" == "1" ]]; then
  return 0 2>/dev/null || true
fi
__AOS_CTL_LIB_LOADED=1

CTL_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/lib/ctl" && pwd)"

# shellcheck disable=SC1091
source "$CTL_LIB_DIR/core.sh"
# shellcheck disable=SC1091
source "$CTL_LIB_DIR/tty.sh"
# shellcheck disable=SC1091
source "$CTL_LIB_DIR/ui.sh"
# shellcheck disable=SC1091
source "$CTL_LIB_DIR/env.sh"
# shellcheck disable=SC1091
source "$CTL_LIB_DIR/http.sh"
