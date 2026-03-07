#!/usr/bin/env bash
set -euo pipefail

scope="${1:-}"
case "$scope" in
  daily|weekly) ;;
  *) echo "Usage: tele-fire-send.sh daily|weekly" >&2; exit 2 ;;
esac

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BOT="${SCRIPT_DIR}/firemap_bot.py"
PYTHON_BIN="${AOS_PYTHON_BIN:-python}"

if [[ ! -f "$BOT" ]]; then
  echo "missing bot: $BOT" >&2
  exit 1
fi

exec "$PYTHON_BIN" "$BOT" "$scope"
