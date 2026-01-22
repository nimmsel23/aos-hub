#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_DIR="${AOS_HOOK_DIR:-$HOME/.task/hooks}"
ENV_DIR="${AOS_HOOK_ENV_DIR:-$HOME/.config/alpha-os}"
ENV_FILE="${ENV_DIR}/hooks.env"
SRC="${ROOT_DIR}/scripts/taskwarrior/on-exit.alphaos.py"
DEST="${HOOK_DIR}/on-exit.99-alphaos.py"

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

write_env_file() {
  mkdir -p "$ENV_DIR"
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi
  cat >"$ENV_FILE" <<'EOF'
# AlphaOS Taskwarrior Hooks (shared)
# Optional overrides (no secrets needed)
# AOS_HOOK_TELE_BIN=tele
# AOS_HOOK_TARGET=tele
# AOS_BRIDGE_URL=http://127.0.0.1:8080
# AOS_CORE4_LOG=1
# AOS_CORE4_POINTS=0.5
#
# Task export snapshot (on-exit)
# AOS_TASK_EXPORT_FILTER=status:pending
# AOS_TASK_EXPORT_PATH=$HOME/.local/share/alphaos/task_export.json
# AOS_TASK_EXPORT_VAULT_PATH=$HOME/AlphaOS-Vault/.alphaos/task_export.json
# AOS_TASK_EXPORT_COPY_TO_VAULT=1
# AOS_TASK_EXPORT_MIN_INTERVAL_SEC=15
EOF
}

usage() {
  cat <<EOF
setup-alpha-on-exit-hook.sh - install AlphaOS Taskwarrior on-exit hook

Usage:
  scripts/setup-alpha-on-exit-hook.sh

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

[[ -f "$SRC" ]] || die "missing $SRC"

mkdir -p "$HOOK_DIR"
write_env_file

backup_file "$DEST"
install -m 755 "$SRC" "$DEST"

msg "✅ Installed:"
ls -la "$DEST"
msg ""
msg "Env file:"
msg "  $ENV_FILE"
msg ""
msg "Notes:"
msg "  - Writes snapshot to: ~/.local/share/alphaos/task_export.json"
msg "  - Copies into Vault:  ~/AlphaOS-Vault/.alphaos/task_export.json (default)"
msg "  - With your vault rclone push, GAS can read it from Drive."

