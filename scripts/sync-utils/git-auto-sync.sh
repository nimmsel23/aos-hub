#!/usr/bin/env bash
set -euo pipefail
exec /home/alpha/.dotfiles/scripts/sync/sync-utils/git-auto-sync.sh "$@"
