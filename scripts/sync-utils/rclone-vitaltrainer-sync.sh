#!/usr/bin/env bash
# Rclone Vitaltrainer Copy Wrapper (legacy entrypoint)
# Usage: rclone-vitaltrainer-sync.sh [push|pull|sync|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COPY_SCRIPT="${SCRIPT_DIR}/rclone-vitaltrainer-copy.sh"

case "${1:-sync}" in
  sync|push)
    exec "$COPY_SCRIPT" push
    ;;
  pull)
    exec "$COPY_SCRIPT" pull
    ;;
  status)
    exec "$COPY_SCRIPT" status
    ;;
  init)
    echo "Init not required for copy mode. Use: $0 push|pull"
    ;;
  *)
    echo "Usage: $0 [push|pull|sync|status]"
    exit 1
    ;;
esac
