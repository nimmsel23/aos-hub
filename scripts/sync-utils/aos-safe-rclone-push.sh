#!/usr/bin/env bash
# Safe daily rclone push (copy, no deletes; skip symlinks by default).
# Runs via systemd timer: alphaos-safe-rclone-push.{service,timer}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

LOCK_FILE="${AOS_SAFE_RCLONE_PUSH_LOCK_FILE:-/tmp/aos-safe-rclone-push.lock}"
SYNCCTL_BIN="${AOS_SYNCCTL_BIN:-$HOME/aos-hub/scripts/syncctl}"

export AOS_NO_CLEAR=1
export AOS_COMPACT=1

# "Safe": don't expand symlinks unless explicitly enabled.
export AOS_COPY_LINKS="${AOS_COPY_LINKS:-0}"

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      warning "Another safe push is already running (lock: $LOCK_FILE)"
      exit 0
    fi
    return 0
  fi

  if [ -f "$LOCK_FILE" ]; then
    warning "Another safe push may be running (lock file exists: $LOCK_FILE)"
    exit 0
  fi
  touch "$LOCK_FILE"
  trap 'rm -f "$LOCK_FILE"' EXIT
}

need_bin() {
  local bin="$1"
  if [ ! -x "$bin" ]; then
    error "Missing executable: $bin"
    exit 1
  fi
}

run_step() {
  local title="$1"
  shift
  log "$title"
  set +e
  "$@"
  local exit_code=$?
  set -e
  if [ "$exit_code" -ne 0 ]; then
    error "$title (exit=$exit_code)"
    return "$exit_code"
  fi
  return 0
}

main() {
  acquire_lock
  need_bin "$SYNCCTL_BIN"

  local failures=0

  run_step "Vault: push (copy)" "$SYNCCTL_BIN" vault sync || failures=$((failures + 1))

  run_step "Domains: BODY push (copy)" "$SYNCCTL_BIN" domains BODY sync || failures=$((failures + 1))
  run_step "Domains: BEING push (copy)" "$SYNCCTL_BIN" domains BEING sync || failures=$((failures + 1))
  run_step "Domains: BALANCE push (copy)" "$SYNCCTL_BIN" domains BALANCE sync || failures=$((failures + 1))
  run_step "Domains: BUSINESS push (copy)" "$SYNCCTL_BIN" domains BUSINESS sync || failures=$((failures + 1))

  run_step "Vitaltrainer: push (copy)" "$SYNCCTL_BIN" vitaltrainer push || failures=$((failures + 1))

  run_step "FADARO: push (copy)" "$SYNCCTL_BIN" fadaro || failures=$((failures + 1))

  if [ "$failures" -gt 0 ]; then
    error "Safe push finished with failures: $failures"
    exit 1
  fi

  success "Safe push completed"
}

main "$@"
