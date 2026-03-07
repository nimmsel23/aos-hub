#!/usr/bin/env zsh
# Full-screen-ish TUI wrapper for doorctx dev (Port 8786)
set -euo pipefail

REPO="/home/alpha/aos-hub/index-node"
API_PORT="${DOORCTX_PORT:-8786}"
LOGFILE="/tmp/doorctx-dev.log"

menu() {
  clear
  cat <<EOF
┌─ DOORCTX DEV ──────────────────────────────────────────────────┐
│ Port: $API_PORT   Repo: $REPO                                  │
│ Server: doorctx-server.js (Door Centre standalone)             │
├────────────────────────────────────────────────────────────────┤
│ 1) Start server (node doorctx-server.js)                       │
│ 2) Tail logs                                                   │
│ 3) Open in browser (http://127.0.0.1:$API_PORT)                │
│ 4) Status (health)                                             │
│ 5) Stop server                                                 │
│ 6) API Test (door/potential/hotlist)                           │
│ 7) Exit                                                        │
└────────────────────────────────────────────────────────────────┘
EOF
}

start_server() {
  cd "$REPO"
  : > "$LOGFILE"
  echo "Starting doorctx-server.js ... logs -> $LOGFILE"
  DOORCTX_PORT="$API_PORT" DOORCTX_HOST="0.0.0.0" (node doorctx-server.js >"$LOGFILE" 2>&1 &)
  sleep 1
  echo "Server started on http://127.0.0.1:$API_PORT"
  read -k 1 -s -r -p "Press any key..."
}

tail_logs() {
  echo "Tailing $LOGFILE (Ctrl+C to exit)..."
  tail -f "$LOGFILE"
}

open_browser() {
  echo "Opening http://127.0.0.1:$API_PORT/pwa/door/"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:$API_PORT/pwa/door/" >/dev/null 2>&1 &
  fi
  sleep 0.5
}

health() {
  echo "Checking health..."
  curl -fsS "http://127.0.0.1:$API_PORT/health" | jq . || echo "❌ offline"
  read -k 1 -s -r -p "Press any key..."
}

stop_server() {
  echo "Stopping doorctx-server.js..."
  pkill -f "doorctx-server.js" || true
  echo "✓ Stopped"
  sleep 1
}

api_test() {
  echo "Testing /api/door/potential/hotlist..."
  curl -fsS "http://127.0.0.1:$API_PORT/api/door/potential/hotlist?mode=active" | jq . || echo "❌ API error"
  read -k 1 -s -r -p "Press any key..."
}

while true; do
  menu
  echo -n "Select: "
  read -r choice
  case "$choice" in
    1) start_server ;;
    2) tail_logs ;;
    3) open_browser ;;
    4) health ;;
    5) stop_server ;;
    6) api_test ;;
    7) exit 0 ;;
    *) ;;
  esac
done
