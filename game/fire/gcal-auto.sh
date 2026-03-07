#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_NAME="aos-fire-gcal-due.service"
TIMER_NAME="aos-fire-gcal-due.timer"
SERVICE_PATH="$SYSTEMD_DIR/$SERVICE_NAME"
TIMER_PATH="$SYSTEMD_DIR/$TIMER_NAME"
RUNNER="$SCRIPT_DIR/firectl"
ACTION="${1:-status}"
TIME_ARG="${2:-}"

# Local Fire overrides.
if [[ -f "$SCRIPT_DIR/fire.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source "$SCRIPT_DIR/fire.env"; set +a
fi

DEFAULT_TIME="${AOS_FIRE_GCAL_DAILY_TIME:-07:00}"

have() { command -v "$1" >/dev/null 2>&1; }
die() { echo "[gcal-auto] $*" >&2; exit 1; }
info() { echo "[gcal-auto] $*" >&2; }

need_systemd_user() {
  have systemctl || die "missing: systemctl"
  systemctl --user show-environment >/dev/null 2>&1 || die "systemctl --user not available in this session"
}

valid_time() {
  [[ "$1" =~ ^([01][0-9]|2[0-3]):([0-5][0-9])$ ]]
}

write_units() {
  local hhmm="$1"
  local hh="${hhmm%%:*}"
  local mm="${hhmm##*:}"
  mkdir -p "$SYSTEMD_DIR"

  cat >"$SERVICE_PATH" <<EOF
[Unit]
Description=αOS Fire due->GCal daily sync

[Service]
Type=oneshot
ExecStart=$RUNNER gcal due
EOF

  cat >"$TIMER_PATH" <<EOF
[Unit]
Description=αOS Fire due->GCal daily sync ($hhmm)

[Timer]
OnCalendar=*-*-* ${hh}:${mm}:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

enable_auto() {
  local hhmm="${1:-$DEFAULT_TIME}"
  valid_time "$hhmm" || die "invalid time: $hhmm (expected HH:MM)"
  need_systemd_user
  [[ -x "$RUNNER" ]] || die "missing runner: $RUNNER"
  write_units "$hhmm"
  systemctl --user daemon-reload
  systemctl --user enable --now "$TIMER_NAME" >/dev/null
  info "enabled $TIMER_NAME at $hhmm"
  status_auto
}

disable_auto() {
  need_systemd_user
  systemctl --user disable --now "$TIMER_NAME" >/dev/null 2>&1 || true
  info "disabled $TIMER_NAME"
}

status_auto() {
  need_systemd_user
  systemctl --user list-timers --all --no-pager | (grep -E "aos-fire-gcal-due\\.timer" || true)
}

run_now() {
  exec "$RUNNER" gcal due "${@:1}"
}

usage() {
  cat <<'EOF'
game/fire/gcal-auto.sh — manage daily automatic Fire due->GCal sync

Usage:
  game/fire/gcal-auto.sh enable [HH:MM]
  game/fire/gcal-auto.sh disable
  game/fire/gcal-auto.sh status
  game/fire/gcal-auto.sh run-now [gcal-due-args...]

Examples:
  game/fire/gcal-auto.sh enable
  game/fire/gcal-auto.sh enable 07:30
  game/fire/gcal-auto.sh status
  game/fire/gcal-auto.sh run-now --backend print
EOF
}

case "$ACTION" in
  enable) enable_auto "$TIME_ARG" ;;
  disable) disable_auto ;;
  status) status_auto ;;
  run-now) shift || true; run_now "$@" ;;
  -h|--help|help) usage ;;
  *) die "unknown action: $ACTION (use: enable|disable|status|run-now)" ;;
esac
