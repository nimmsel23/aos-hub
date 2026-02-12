#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPORT_BIN="${AOS_TASK_EXPORT_BIN:-$ROOT_DIR/scripts/taskwarrior/export-snapshot.sh}"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
ENV_DIR="${AOS_TASK_EXPORT_ENV_DIR:-$HOME/.config/alpha-os}"
ENV_FILE="${ENV_DIR}/task-export.env"

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

write_env_file() {
  mkdir -p "$ENV_DIR"
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi
  cat >"$ENV_FILE" <<'EOF'
# αOS Taskwarrior export snapshot (optional overrides)
# AOS_TASK_EXPORT_FILTER=status:pending
# AOS_TASK_EXPORT_PATH=$HOME/.local/share/alphaos/task_export.json
# AOS_TASK_EXPORT_VAULT_PATH=$HOME/AlphaOS-Vault/.alphaos/task_export.json
# AOS_TASK_EXPORT_COPY_TO_VAULT=1
EOF
}

write_units() {
  mkdir -p "$SYSTEMD_DIR"

  cat >"$SYSTEMD_DIR/alphaos-task-export.service" <<EOF
[Unit]
Description=αOS Taskwarrior export snapshot

[Service]
Type=oneshot
EnvironmentFile=-${ENV_FILE}
ExecStart=${EXPORT_BIN}
EOF

  cat >"$SYSTEMD_DIR/alphaos-task-export.timer" <<'EOF'
[Unit]
Description=αOS Taskwarrior export snapshot (every 5 minutes)

[Timer]
OnBootSec=2m
OnUnitActiveSec=5m
Persistent=true

[Install]
WantedBy=timers.target
EOF

  if need_cmd systemctl; then
    systemctl --user daemon-reload || true
  fi
}

usage() {
  cat <<EOF
setup-task-export.sh - install a Taskwarrior export snapshot timer

Usage:
  scripts/setup-task-export.sh

Env overrides:
  AOS_TASK_EXPORT_BIN=$ROOT_DIR/scripts/taskwarrior/export-snapshot.sh
  AOS_TASK_EXPORT_ENV_DIR=$HOME/.config/alpha-os
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

[[ -x "$EXPORT_BIN" ]] || die "export script not executable: $EXPORT_BIN"
need_cmd task || die "taskwarrior not found"
need_cmd python3 || die "python3 not found"

write_env_file
write_units

msg "✅ Wrote systemd user units:"
msg "  $SYSTEMD_DIR/alphaos-task-export.service"
msg "  $SYSTEMD_DIR/alphaos-task-export.timer"
msg "Env file:"
msg "  $ENV_FILE"
msg ""
msg "Next:"
msg "  systemctl --user enable --now alphaos-task-export.timer"
