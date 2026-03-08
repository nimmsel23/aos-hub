#!/usr/bin/env zsh
# Full-screen-ish TUI wrapper for fitnessctx dev (Port 8788)
set -euo pipefail

REPO="/home/alpha/core4-fitness-centre"
API_PORT="${API_PORT:-8788}"
LOGFILE="/tmp/fitnessctx-dev.log"

menu() {
  clear
  cat <<EOF
┌─ FITNESSCTX DEV ───────────────────────────────────────────────┐
│ Port: $API_PORT   Repo: $REPO/fitnessctx                      │
├────────────────────────────────────────────────────────────────┤
│ 1) Start server (--watch)                                      │
│ 2) Tail logs                                                   │
│ 3) Open in browser (http://127.0.0.1:$API_PORT)                │
│ 4) Status (health)                                             │
│ 5) Stop all node --watch server.mjs                            │
│ 6) Exit                                                        │
└────────────────────────────────────────────────────────────────┘
EOF
}

start_server() {
  cd "$REPO/fitnessctx"
  : > "$LOGFILE"
  echo "Starting npm run dev ... logs -> $LOGFILE"
  HOST=0.0.0.0 API_PORT="$API_PORT" (npm run dev >"$LOGFILE" 2>&1 &) 
  sleep 0.5
}

tail_logs() {
  echo "Tailing $LOGFILE (Ctrl+C to exit)..."
  tail -f "$LOGFILE"
}

open_browser() {
  echo "Open http://127.0.0.1:$API_PORT"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:$API_PORT" >/dev/null 2>&1 &
  fi
}

health() {
  curl -fsS "http://127.0.0.1:$API_PORT/health" || echo "offline"
}

stop_server() {
  pkill -f "server.mjs" || true
}

while true; do
  menu
  echo -n "Select: "
  read -r choice
  case "$choice" in
    1) start_server ;;
    2) tail_logs ;;
    3) open_browser ;;
    4) health; read -k 1 -s -r -p "Press any key..." ;;
    5) stop_server ;;
    6) exit 0 ;;
    *) ;;
  esac
done
