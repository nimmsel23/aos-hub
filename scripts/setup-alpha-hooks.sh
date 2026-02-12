#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_DIR="${AOS_HOOK_DIR:-$HOME/.task/hooks}"
ENV_DIR="${AOS_HOOK_ENV_DIR:-$HOME/.config/alpha-os}"
ENV_FILE="${ENV_DIR}/hooks.env"
SRC_DIR="${ROOT_DIR}/scripts/taskwarrior"

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

backup_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    local ts
    ts="$(date +%Y%m%d-%H%M%S)"
    cp -f "$path" "${path}.bak.${ts}"
  fi
}

install_hook() {
  local src="$1"
  local dest="$2"
  backup_file "$dest"
  install -m 755 "$src" "$dest"
}

write_env_file() {
  mkdir -p "$ENV_DIR"
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi
  cat >"$ENV_FILE" <<'EOF'
# αOS Taskwarrior Hooks
# Optional overrides (no secrets needed)
# AOS_HOOK_TELE_BIN=tele
# AOS_HOOK_TARGET=tele
# AOS_BRIDGE_URL=http://127.0.0.1:8080
# AOS_CORE4_LOG=1
# AOS_CORE4_POINTS=0.5
EOF
}

usage() {
  cat <<EOF
setup-alpha-hooks.sh - install αOS Taskwarrior hooks

Usage:
  scripts/setup-alpha-hooks.sh

Env overrides:
  AOS_HOOK_DIR=$HOME/.task/hooks
  AOS_HOOK_ENV_DIR=$HOME/.config/alpha-os
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_cmd task || die "taskwarrior not found"
need_cmd python3 || die "python3 not found"

if ! need_cmd tele; then
  warn "tele not found in PATH (hooks will still install)"
fi

mkdir -p "$HOOK_DIR"
write_env_file

[[ -f "${SRC_DIR}/on-add.alphaos.py" ]] || die "missing ${SRC_DIR}/on-add.alphaos.py"
[[ -f "${SRC_DIR}/on-modify.alphaos.py" ]] || die "missing ${SRC_DIR}/on-modify.alphaos.py"

install_hook "${SRC_DIR}/on-add.alphaos.py" "${HOOK_DIR}/on-add.99-alphaos.py"
install_hook "${SRC_DIR}/on-modify.alphaos.py" "${HOOK_DIR}/on-modify.99-alphaos.py"

msg "✅ Installed hooks:"
ls -la "${HOOK_DIR}/on-add.99-alphaos.py" "${HOOK_DIR}/on-modify.99-alphaos.py"
msg ""
msg "Env file: ${ENV_FILE}"
msg "Target: set AOS_HOOK_TARGET=bridge for direct Bridge POSTs"
msg "Tip: tele --status  (make sure Telegram is configured)"
