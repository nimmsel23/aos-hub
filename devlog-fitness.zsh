#!/usr/bin/env zsh
set -euo pipefail

REPO="/home/alpha/core4-fitness-centre"
LOGFILE="/tmp/fitnessctx-dev.log"

cd -- "$REPO/fitnessctx"

echo "fitnessctx dev server (8788)"
echo "logs: $LOGFILE"
echo "stop: Ctrl+C"
echo "----------------------------"

: > "$LOGFILE"

node --watch server.mjs 2>&1 | tee -a "$LOGFILE"
