#!/usr/bin/env bash
# αOS Fire Map Setup (Taskwarrior-first)
# Uses repo scripts + systemd timer; no pip, no cron.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIREMAP_SETUP="$ROOT_DIR/game/fire/setup-fire-map.sh"

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }

die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

msg "🔥 αOS Fire Map Setup (Taskwarrior-first)"

need_cmd task || die "taskwarrior not found"
need_cmd rg || warn "rg not found; setup script will still run"

if [[ ! -x "$FIREMAP_SETUP" ]]; then
  die "setup script not found: $FIREMAP_SETUP"
fi

msg "▶ Running: $FIREMAP_SETUP"
"$FIREMAP_SETUP"

msg ""
msg "✅ Fire Map Taskwarrior config installed."
msg ""
msg "Next steps:"
msg "  1) systemctl --user enable --now aos-fire-weekly.timer"
msg "  2) Ensure Fire tags: +fire +production +hit"
msg "  3) Ensure scheduled/due dates for calendar visibility"
msg ""
msg "Optional:"
msg "  - Run daily snapshot via router: /fire"
msg "  - Run weekly snapshot via router: /fireweek"
