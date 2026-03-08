#!/usr/bin/env zsh
# FitnessCtx Development TUI - Enhanced version
# Manages fitnessctx Node.js dev server (Port 8788)

# Strict mode (disable for interactive menu)
setopt LOCAL_OPTIONS

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

REPO="${VITAL_HUB_DIR:-/home/alpha/vital-hub}"
WORKDIR="$REPO/fitnessctx"
API_PORT="${API_PORT:-8788}"
LOGFILE="${LOGFILE:-/tmp/fitnessctx-dev.log}"
PIDFILE="/tmp/fitnessctx-dev.pid"

# Colors
typeset -A COLORS
COLORS=(
  reset   "\033[0m"
  bold    "\033[1m"
  dim     "\033[2m"
  red     "\033[31m"
  green   "\033[32m"
  yellow  "\033[33m"
  blue    "\033[34m"
  magenta "\033[35m"
  cyan    "\033[36m"
)

# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

print_color() {
  local color=$1
  shift
  echo -e "${COLORS[$color]}$@${COLORS[reset]}"
}

check_dependencies() {
  local missing=()

  [[ ! -d "$WORKDIR" ]] && missing+=("Directory: $WORKDIR")
  ! command -v npm &>/dev/null && missing+=("npm")
  ! command -v node &>/dev/null && missing+=("node")
  ! command -v curl &>/dev/null && missing+=("curl")

  if (( ${#missing[@]} > 0 )); then
    print_color red "✗ Missing dependencies:"
    printf "  - %s\n" "${missing[@]}"
    return 1
  fi
  return 0
}

get_server_pid() {
  # Find npm run dev process for fitnessctx
  pgrep -f "npm run dev.*fitnessctx|node.*server.mjs.*$API_PORT" | head -1
}

is_server_running() {
  local pid=$(get_server_pid)
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

get_server_status() {
  if is_server_running; then
    local pid=$(get_server_pid)
    local uptime=$(ps -p "$pid" -o etime= 2>/dev/null | xargs)
    echo "${COLORS[green]}●${COLORS[reset]} Running ${COLORS[dim]}(PID: $pid, Up: ${uptime:-unknown})${COLORS[reset]}"
  else
    echo "${COLORS[red]}○${COLORS[reset]} Stopped"
  fi
}

check_health() {
  local response
  if response=$(curl -fsS --max-time 2 "http://127.0.0.1:$API_PORT/health" 2>&1); then
    print_color green "✓ Health check passed"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    return 0
  else
    print_color red "✗ Health check failed (server offline or not responding)"
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Server Management
# ═══════════════════════════════════════════════════════════════════════════

start_server() {
  if is_server_running; then
    print_color yellow "⚠ Server already running (PID: $(get_server_pid))"
    print_color yellow "  Use 'Restart' to reload or 'Stop' first"
    read -k 1 -s -r "?Press any key..."
    return 1
  fi

  print_color blue "Starting fitnessctx dev server..."

  # Ensure workdir exists
  if [[ ! -d "$WORKDIR" ]]; then
    print_color red "✗ Directory not found: $WORKDIR"
    read -k 1 -s -r "?Press any key..."
    return 1
  fi

  cd "$WORKDIR" || {
    print_color red "✗ Cannot cd to $WORKDIR"
    read -k 1 -s -r "?Press any key..."
    return 1
  }

  # Clear/create logfile
  : > "$LOGFILE"

  # Start server in background
  print_color dim "→ Working dir: $WORKDIR"
  print_color dim "→ Log file: $LOGFILE"
  print_color dim "→ Port: $API_PORT"

  HOST=0.0.0.0 API_PORT="$API_PORT" npm run dev >"$LOGFILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PIDFILE"

  # Wait and verify
  sleep 1.5

  if is_server_running; then
    print_color green "✓ Server started successfully (PID: $(get_server_pid))"
    sleep 1
    check_health
  else
    print_color red "✗ Server failed to start (check logs)"
    print_color yellow "\nLast 10 lines of log:"
    tail -10 "$LOGFILE"
  fi

  read -k 1 -s -r "?Press any key..."
}

stop_server() {
  if ! is_server_running; then
    print_color yellow "⚠ Server not running"
    read -k 1 -s -r "?Press any key..."
    return 0
  fi

  local pid=$(get_server_pid)
  print_color blue "Stopping server (PID: $pid)..."

  # Try graceful shutdown first
  kill "$pid" 2>/dev/null
  sleep 1

  # Force kill if still running
  if is_server_running; then
    print_color yellow "→ Forcing shutdown..."
    pkill -9 -f "npm run dev.*fitnessctx|node.*server.mjs.*$API_PORT"
  fi

  # Clean up
  [[ -f "$PIDFILE" ]] && rm -f "$PIDFILE"

  if ! is_server_running; then
    print_color green "✓ Server stopped"
  else
    print_color red "✗ Failed to stop server"
  fi

  read -k 1 -s -r "?Press any key..."
}

restart_server() {
  print_color blue "Restarting server..."
  stop_server
  sleep 0.5
  start_server
}

# ═══════════════════════════════════════════════════════════════════════════
# Log Management
# ═══════════════════════════════════════════════════════════════════════════

tail_logs() {
  if [[ ! -f "$LOGFILE" ]]; then
    print_color yellow "⚠ Log file not found: $LOGFILE"
    read -k 1 -s -r "?Press any key..."
    return
  fi

  clear
  print_color cyan "═══ Live Logs (Ctrl+C to exit) ═══"
  echo ""
  tail -f "$LOGFILE"
}

view_logs() {
  if [[ ! -f "$LOGFILE" ]]; then
    print_color yellow "⚠ Log file not found: $LOGFILE"
    read -k 1 -s -r "?Press any key..."
    return
  fi

  clear
  print_color cyan "═══ Last 50 lines ═══"
  echo ""
  tail -50 "$LOGFILE"
  echo ""
  read -k 1 -s -r "?Press any key..."
}

clear_logs() {
  print_color yellow "Clear log file? (y/N) "
  read -k 1 -r confirm
  echo ""

  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    : > "$LOGFILE"
    print_color green "✓ Logs cleared"
  else
    print_color dim "Cancelled"
  fi

  sleep 0.5
}

# ═══════════════════════════════════════════════════════════════════════════
# Browser & Info
# ═══════════════════════════════════════════════════════════════════════════

open_browser() {
  local url="http://127.0.0.1:$API_PORT"
  print_color blue "Opening browser: $url"

  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" >/dev/null 2>&1 &
    print_color green "✓ Browser opened"
  elif command -v open &>/dev/null; then
    open "$url" >/dev/null 2>&1 &
    print_color green "✓ Browser opened"
  else
    print_color yellow "⚠ No browser opener found (xdg-open/open)"
    print_color cyan "→ Manual: $url"
  fi

  sleep 1
}

show_info() {
  clear
  print_color cyan "═══════════════════════════════════════════════════════════"
  print_color cyan "  FitnessCtx Development Server - System Info"
  print_color cyan "═══════════════════════════════════════════════════════════"
  echo ""

  print_color bold "Configuration:"
  echo "  Repository:  $REPO"
  echo "  Working Dir: $WORKDIR"
  echo "  Port:        $API_PORT"
  echo "  Log File:    $LOGFILE"
  echo "  PID File:    $PIDFILE"
  echo ""

  print_color bold "Status:"
  echo -n "  Server:      "
  get_server_status
  echo ""

  print_color bold "Dependencies:"
  echo "  node:  $(node --version 2>/dev/null || echo 'not found')"
  echo "  npm:   $(npm --version 2>/dev/null || echo 'not found')"
  echo "  curl:  $(curl --version 2>/dev/null | head -1 || echo 'not found')"
  echo ""

  if [[ -f "$WORKDIR/package.json" ]]; then
    print_color bold "Package Info:"
    echo "  Name:    $(jq -r '.name // "unknown"' "$WORKDIR/package.json" 2>/dev/null)"
    echo "  Version: $(jq -r '.version // "unknown"' "$WORKDIR/package.json" 2>/dev/null)"
    echo ""
  fi

  print_color bold "Endpoints:"
  echo "  Health: http://127.0.0.1:$API_PORT/health"
  echo "  Main:   http://127.0.0.1:$API_PORT/"
  echo ""

  read -k 1 -s -r "?Press any key..."
}

# ═══════════════════════════════════════════════════════════════════════════
# Menu
# ═══════════════════════════════════════════════════════════════════════════

show_menu() {
  clear
  local status=$(get_server_status)

  cat <<EOF
${COLORS[cyan]}┌─────────────────────────────────────────────────────────────────┐${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[bold]}FITNESSCTX DEV${COLORS[reset]} - Port $API_PORT                                   ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} Status: $status                                       ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}├─────────────────────────────────────────────────────────────────┤${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[green]}1${COLORS[reset]}) Start server           ${COLORS[cyan]}│${COLORS[reset]} ${COLORS[yellow]}6${COLORS[reset]}) View logs (last 50)      ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[green]}2${COLORS[reset]}) Stop server            ${COLORS[cyan]}│${COLORS[reset]} ${COLORS[yellow]}7${COLORS[reset]}) Tail logs (live)        ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[green]}3${COLORS[reset]}) Restart server         ${COLORS[cyan]}│${COLORS[reset]} ${COLORS[yellow]}8${COLORS[reset]}) Clear logs              ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[blue]}4${COLORS[reset]}) Health check           ${COLORS[cyan]}│${COLORS[reset]} ${COLORS[magenta]}9${COLORS[reset]}) System info             ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}│${COLORS[reset]} ${COLORS[blue]}5${COLORS[reset]}) Open browser           ${COLORS[cyan]}│${COLORS[reset]} ${COLORS[red]}0${COLORS[reset]}) Exit                    ${COLORS[cyan]}│${COLORS[reset]}
${COLORS[cyan]}└─────────────────────────────────────────────────────────────────┘${COLORS[reset]}
EOF
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Loop
# ═══════════════════════════════════════════════════════════════════════════

main() {
  # Dependency check on startup
  if ! check_dependencies; then
    print_color red "\nCannot proceed without dependencies."
    exit 1
  fi

  # Trap cleanup
  trap 'echo ""; print_color yellow "Exiting..."; exit 0' INT TERM

  # Main menu loop
  while true; do
    show_menu
    echo -n "${COLORS[bold]}Select:${COLORS[reset]} "
    read -k 1 -r choice
    echo ""

    case "$choice" in
      1) start_server ;;
      2) stop_server ;;
      3) restart_server ;;
      4) check_health; read -k 1 -s -r "?Press any key..." ;;
      5) open_browser ;;
      6) view_logs ;;
      7) tail_logs ;;
      8) clear_logs ;;
      9) show_info ;;
      0)
        print_color yellow "Exiting..."
        exit 0
        ;;
      *)
        print_color red "Invalid option: $choice"
        sleep 0.5
        ;;
    esac
  done
}

# Run main
main "$@"
