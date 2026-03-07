#!/usr/bin/env bash
set -euo pipefail
exec /home/alpha/.dotfiles/scripts/sync/sync-utils/rclone-aos-hub-live-push.sh "$@"
