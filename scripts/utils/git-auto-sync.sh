#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper:
# canonical implementation lives in scripts/sync-utils/git-auto-sync.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TARGET="$SCRIPT_DIR/../sync-utils/git-auto-sync.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "git-auto-sync: missing target script: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
