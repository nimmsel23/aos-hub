#!/usr/bin/env bash
set -euo pipefail
exec /home/alpha/.dotfiles/scripts/sync/sync-utils/aos-safe-rclone-push.sh "$@"
