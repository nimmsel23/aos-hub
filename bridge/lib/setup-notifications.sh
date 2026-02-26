#!/usr/bin/env bash
set -euo pipefail

# setup-notifications.sh — Configure desktop notifications for aos-bridge service
#
# This script sets up the systemd drop-in configuration needed for
# aos-bridge.service to send desktop notifications via notify-send.
#
# Usage:
#   ./lib/setup-notifications.sh [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect user ID (for XDG_RUNTIME_DIR)
USER_ID="${SUDO_UID:-$(id -u)}"
USER_NAME="${SUDO_USER:-$(id -un)}"

# Get current DISPLAY (fallback to :0 or :1)
DISPLAY_VAR="${DISPLAY:-:1}"

# systemd drop-in path
DROPINS_DIR="/etc/systemd/system/aos-bridge.service.d"
DROPINS_FILE="$DROPINS_DIR/notifications.conf"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

msg() { echo "[setup-notifications] $*"; }
die() { echo "[setup-notifications] ERROR: $*" >&2; exit 1; }

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
  die "This script must be run as root or with sudo"
fi

msg "Configuring desktop notifications for aos-bridge.service"
msg "  User: $USER_NAME (UID: $USER_ID)"
msg "  Display: $DISPLAY_VAR"
msg "  Drop-in: $DROPINS_FILE"

if [[ $DRY_RUN -eq 1 ]]; then
  msg "[DRY RUN] Would create:"
  cat <<EOF
$DROPINS_FILE:
---
[Service]
Environment="DISPLAY=$DISPLAY_VAR"
Environment="DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$USER_ID/bus"
Environment="XDG_RUNTIME_DIR=/run/user/$USER_ID"
---
EOF
  msg "[DRY RUN] Would run: systemctl daemon-reload"
  msg "[DRY RUN] Would run: systemctl restart aos-bridge.service"
  exit 0
fi

# Create drop-in directory
msg "Creating drop-in directory..."
mkdir -p "$DROPINS_DIR"

# Create drop-in config
msg "Writing drop-in config..."
cat > "$DROPINS_FILE" <<EOF
[Service]
Environment="DISPLAY=$DISPLAY_VAR"
Environment="DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$USER_ID/bus"
Environment="XDG_RUNTIME_DIR=/run/user/$USER_ID"
EOF

# Reload systemd
msg "Reloading systemd..."
systemctl daemon-reload

# Restart bridge
msg "Restarting aos-bridge.service..."
systemctl restart aos-bridge.service

# Wait for bridge to be ready
sleep 2

# Verify bridge is running
if systemctl is-active --quiet aos-bridge.service; then
  msg "✓ Bridge is running"
else
  die "Bridge failed to start"
fi

# Check if notifications are enabled in config
msg ""
msg "Configuration complete!"
msg ""
msg "Desktop notifications are now enabled for Core4 events."
msg "To test, log a Core4 event via:"
msg "  curl -X POST http://127.0.0.1:8080/bridge/core4/log \\"
msg "    -H 'Content-Type: application/json' \\"
msg "    -d '{\"domain\":\"body\",\"task\":\"fitness\",\"done\":true}'"
msg ""
msg "To disable notifications, set in /etc/aos/aos.env:"
msg "  AOS_CORE4_DESKTOP_NOTIFY=0"
