#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_DIR="${AOS_FIREMAP_TEMPLATE_DIR:-$HOME/.alpha_os/logs/firemap}"
CANVAS_DIR="${AOS_CANVAS_DIR:-$HOME/ObsidianVault/Canvas}"

DATE="$(date +%F)"
DEST="${CANVAS_DIR}/firemap_${DATE}.canvas"
SRC="${TEMPLATE_DIR}/firemap_daily_template.canvas"

mkdir -p "$CANVAS_DIR"
if [[ ! -f "$SRC" ]]; then
  echo "ERR: template not found: $SRC" >&2
  exit 1
fi

cp "$SRC" "$DEST"
sed -i "s/{{date:YYYY-MM-DD}}/$DATE/g" "$DEST"
echo "OK: wrote $DEST"
