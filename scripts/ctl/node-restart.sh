#!/usr/bin/env bash
# scripts/ctl/node-restart.sh
# Restart the running AOS node services (system scope) or dev services (user scope).
# Detects which scope is active and restarts accordingly.
# If both scopes are running, restarts both.
#
# Usage:
#   node-restart.sh [all|index|router|bridge]
#
# Callable standalone or sourced by aos.

set -euo pipefail

# ---- service maps ----
declare -A SYS_SERVICES=(
  [index]="aos-index.service"
  [router]="aos-router.service"
  [bridge]="aos-bridge.service"
)
declare -A USER_SERVICES=(
  [index]="aos-index-dev.service"
  [router]="aos-router-dev.service"
  [bridge]="aos-bridge.service"
)

_svc_active_sys()  { systemctl is-active --quiet "$1" 2>/dev/null; }
_svc_active_user() { systemctl --user is-active --quiet "$1" 2>/dev/null; }

_restart_sys() {
  local svc="$1"
  echo "  [sys]  sudo systemctl restart $svc"
  sudo systemctl restart "$svc"
}

_restart_user() {
  local svc="$1"
  echo "  [user] systemctl --user restart $svc"
  systemctl --user restart "$svc"
}

# Restart a single component in whichever scope(s) it's active.
# If neither active: print a warning (no error — caller decides).
_restart_component() {
  local comp="$1"
  local sys_svc="${SYS_SERVICES[$comp]:-}"
  local user_svc="${USER_SERVICES[$comp]:-}"
  local did=0

  if [[ -n "$sys_svc" ]] && _svc_active_sys "$sys_svc"; then
    _restart_sys "$sys_svc"
    did=1
  fi
  if [[ -n "$user_svc" ]] && _svc_active_user "$user_svc"; then
    _restart_user "$user_svc"
    did=1
  fi

  if [[ $did -eq 0 ]]; then
    echo "  [--]   $comp: not running (sys=${sys_svc:-n/a} user=${user_svc:-n/a})" >&2
  fi
}

node_restart_main() {
  local target="${1:-all}"

  case "$target" in
    all)
      echo "Restarting all AOS node services..."
      for comp in index router bridge; do
        _restart_component "$comp"
      done
      ;;
    index|router|bridge)
      echo "Restarting AOS $target..."
      _restart_component "$target"
      ;;
    *)
      echo "node-restart: unknown target '$target'" >&2
      echo "  Usage: node-restart [all|index|router|bridge]" >&2
      return 1
      ;;
  esac
  echo "Done."
}

# Run directly if not sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  node_restart_main "${1:-all}"
fi
