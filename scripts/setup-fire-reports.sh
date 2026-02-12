#!/usr/bin/env bash
set -euo pipefail

# setup-fire-reports.sh — ensure Taskwarrior fire reports exist (fired/firew)
#
# This is intentionally separate from scripts/setup-fire-map.sh (which currently installs report.fire).

APP="setup-fire-reports"
TASKRC="${AOS_TASKRC:-$HOME/.taskrc}"

msg() { printf "%s\n" "$*"; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }

ensure_block() {
  if [[ -f "$TASKRC" ]] && rg -q "αOS Fire Reports" "$TASKRC"; then
    msg "✅ Fire reports already present in $TASKRC"
    return
  fi

  cat >>"$TASKRC" <<'EOF'

# αOS Fire Reports (daily + weekly)
#
# Daily: due-today style execution list.
report.fired.description=Fire Daily (due soon)
report.fired.columns=id,project,tags,due.relative,description
report.fired.labels=ID,Project,Tags,Due,Description
report.fired.filter=+fire (status:pending or status:waiting) (due.before:tomorrow or scheduled.before:tomorrow)
report.fired.sort=due+

# Weekly: current week (Mon–Sun), not "next 7 days".
report.firew.description=Fire Weekly (this week)
report.firew.columns=id,project,tags,due.relative,description
report.firew.labels=ID,Project,Tags,Due,Description
report.firew.filter=+fire (status:pending or status:waiting) ((due.after:sow and due.before:eow+1day) or (scheduled.after:sow and scheduled.before:eow+1day))
report.firew.sort=due+
EOF

  msg "✅ Added fire reports block to $TASKRC"
}

usage() {
  cat <<EOF
$APP — Taskwarrior fire report installer

Usage:
  scripts/setup-fire-reports.sh

Env:
  AOS_TASKRC=$HOME/.taskrc
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_cmd task
need_cmd rg
ensure_block
