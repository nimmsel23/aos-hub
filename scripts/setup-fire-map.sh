#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIREMAP_BIN="${AOS_FIREMAP_BIN:-$ROOT_DIR/firemap}"
TASKRC="${AOS_TASKRC:-$HOME/.taskrc}"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

ensure_taskrc_block() {
  if [[ -f "$TASKRC" ]] && rg -q "Alpha OS Fire Map Configuration" "$TASKRC"; then
    msg "✅ Taskwarrior Fire Map config already present."
    return
  fi
  cat >>"$TASKRC" <<'EOF'

# Alpha OS Fire Map Configuration
urgency.user.project.BODY.coefficient=5.0
urgency.user.project.BEING.coefficient=5.0
urgency.user.project.BALANCE.coefficient=5.0
urgency.user.project.BUSINESS.coefficient=5.0

urgency.user.tag.bigrock.coefficient=10.0
urgency.user.tag.hit.coefficient=10.0
urgency.user.tag.critical.coefficient=8.0
urgency.user.tag.strategic.coefficient=7.0

urgency.user.tag.littlerock.coefficient=3.0
urgency.user.tag.important.coefficient=2.0

urgency.user.tag.warstack.coefficient=15.0
urgency.user.tag.door.coefficient=12.0

urgency.due.coefficient=12.0
urgency.blocking.coefficient=8.0

project.BODY.color=bold red
project.BEING.color=bold blue
project.BALANCE.color=bold green
project.BUSINESS.color=bold yellow

report.fire.description=Daily Fire Map
report.fire.columns=id,urgency,project,tags,due.relative,description
report.fire.filter=(project:BODY or project:BEING or project:BALANCE or project:BUSINESS) status:pending
report.fire.labels=ID,Urg,Domain,Tags,Due,Description
report.fire.sort=urgency-,due+

report.bigrock.description=Big Rocks (War Stack Hits)
report.bigrock.columns=id,urgency,project,due.relative,description
report.bigrock.filter=(project:BODY or project:BEING or project:BALANCE or project:BUSINESS) status:pending urgency.over:15
report.bigrock.labels=ID,Urg,Domain,Due,Description
report.bigrock.sort=urgency-,due+
EOF
  msg "✅ Added Fire Map block to $TASKRC"
}

write_unit() {
  mkdir -p "$SYSTEMD_DIR"
  cat >"$SYSTEMD_DIR/alphaos-firemap-weekly.service" <<EOF
[Unit]
Description=AlphaOS Fire Map Weekly Sync

[Service]
Type=oneshot
ExecStart=${FIREMAP_BIN} sync
EOF

  cat >"$SYSTEMD_DIR/alphaos-firemap-weekly.timer" <<'EOF'
[Unit]
Description=AlphaOS Fire Map Weekly Sync (Sun 19:00)

[Timer]
OnCalendar=Sun *-*-* 19:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

  systemctl --user daemon-reload
  msg "✅ Wrote weekly firemap systemd units."
}

usage() {
  cat <<EOF
setup-fire-map.sh - Taskwarrior Fire Map config + weekly sync timer

Usage:
  scripts/setup-fire-map.sh

Env overrides:
  AOS_FIREMAP_BIN=$ROOT_DIR/firemap
  AOS_TASKRC=$HOME/.taskrc
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_cmd task || die "taskwarrior not found"
if [[ ! -x "$FIREMAP_BIN" ]]; then
  warn "firemap not found at: $FIREMAP_BIN"
  warn "Set AOS_FIREMAP_BIN or run from within the repo root (so ./firemap exists)"
fi

ensure_taskrc_block
write_unit

msg ""
msg "Next:"
msg "  systemctl --user enable --now alphaos-firemap-weekly.timer"
