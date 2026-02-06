#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKRC="${AOS_TASKRC:-$HOME/.taskrc}"

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

ensure_fire_report_v2() {
  if [[ ! -f "$TASKRC" ]]; then
    return
  fi
  if rg -q "Alpha OS Fire Report v2" "$TASKRC"; then
    msg "✅ Taskwarrior Fire report v2 already present."
    return
  fi

  cat >>"$TASKRC" <<'EOF'

# Alpha OS Fire Report v2 (daily execution + undated production/hits)
# - Shows tasks due/scheduled/wait today
# - Also includes undated tasks if tagged +production/+hit/+fire
report.fire.description=Daily Fire (Execution)
report.fire.columns=id,urgency,project,tags,scheduled.relative,due.relative,description
report.fire.filter=(status:pending or status:waiting) and ((due.before:tomorrow) or (scheduled.before:tomorrow) or (wait.before:tomorrow) or ((due.none and scheduled.none and wait.none) and (+production or +hit or +fire)))
report.fire.labels=ID,Urg,Project,Tags,Sched,Due,Description
report.fire.sort=urgency-,due+,scheduled+
EOF

  msg "✅ Added/updated report: task fire"
}

usage() {
  cat <<EOF
setup-fire-map.sh - Taskwarrior Fire config (reports + urgency)

Usage:
  scripts/setup-fire-map.sh

Options:
  --systemd   write+enable user timers via scripts/firectl (recommended)

Env overrides:
  AOS_TASKRC=$HOME/.taskrc
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--systemd" ]]; then
  if [[ -x "$ROOT_DIR/scripts/firectl" ]]; then
    exec "$ROOT_DIR/scripts/firectl" setup-systemd
  fi
  die "missing: $ROOT_DIR/scripts/firectl"
fi

need_cmd task || die "taskwarrior not found"
need_cmd rg || die "rg (ripgrep) not found"

ensure_taskrc_block
ensure_fire_report_v2

msg ""
msg "Next:"
msg "  task fire"
msg "  scripts/firectl setup-systemd   # optional timers"
