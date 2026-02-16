#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper:
# canonical implementation lives in scripts/sync-utils/rclone-domain-sync.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TARGET="$SCRIPT_DIR/../sync-utils/rclone-domain-sync.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "rclone-domain-sync: missing target script: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
