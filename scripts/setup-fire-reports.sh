#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
CANONICAL="$ROOT_DIR/game/fire/setup-fire-reports.sh"

if [[ ! -x "$CANONICAL" ]]; then
  printf "ERR: missing canonical Fire reports setup script: %s\n" "$CANONICAL" >&2
  exit 1
fi

exec "$CANONICAL" "$@"
