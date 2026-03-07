#!/usr/bin/env bash
set -euo pipefail
exec /home/alpha/.dotfiles/scripts/sync/sync-utils/rclone-dokumente-safe-push.sh "$@"
