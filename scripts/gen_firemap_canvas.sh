#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_DIR="${AOS_FIREMAP_TEMPLATE_DIR:-$HOME/.alpha_os/logs/firemap}"
CANVAS_DIR="${AOS_CANVAS_DIR:-$HOME/ObsidianVault/Canvas}"

WEEK="$(date +%V)"
YEAR="$(date +%Y)"
DEST="${CANVAS_DIR}/firemap_${YEAR}-KW${WEEK}.canvas"
SRC="${TEMPLATE_DIR}/weekly_canvas_template.canvas"

mkdir -p "$CANVAS_DIR"
if [[ ! -f "$SRC" ]]; then
  echo "ERR: template not found: $SRC" >&2
  exit 1
fi

cp "$SRC" "$DEST"
sed -i "s/{{date:YYYY}}/$YEAR/g" "$DEST"
sed -i "s/{{date:WW}}/$WEEK/g" "$DEST"
echo "OK: wrote $DEST"
