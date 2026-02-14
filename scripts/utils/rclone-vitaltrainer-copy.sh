#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper:
# canonical implementation lives in scripts/sync-utils/rclone-vitaltrainer-copy.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TARGET="$SCRIPT_DIR/../sync-utils/rclone-vitaltrainer-copy.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "rclone-vitaltrainer-copy: missing target script: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
