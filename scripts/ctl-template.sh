#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# COMPONENT-ctl — Component Manager Template
# ============================================================
# Copy this template when creating new *ctl scripts
#
# Naming convention: <component>ctl (no dashes)
# Examples: routerctl, bridgectl, tentctl, firectl
#
# Pattern: gum/fzf for UI, consistent command structure
# ============================================================

COMPONENTCTL_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"

# ============================================================
# CONFIGURATION
# ============================================================

# Component paths
COMPONENT_DIR="${COMPONENT_DIR:-$SCRIPT_DIR}"
COMPONENT_NAME="${COMPONENT_NAME:-component}"

# Service/unit names (if systemd)
SERVICE_NAME="${SERVICE_NAME:-alphaos-component}"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_FILE="$SYSTEMD_DIR/$SERVICE_NAME.service"

# ============================================================
# UI HELPERS (gum or fallback)
# ============================================================
# CRITICAL: Always use gum for UI when available
# These helpers provide consistent UX across all ctl scripts
# ============================================================

has_gum() { command -v gum >/dev/null 2>&1; }
has_fzf() { command -v fzf >/dev/null 2>&1; }

# Title banner
ui_title() {
  if has_gum; then
    gum style --bold --border normal --padding "1 2" "${1:-componentctl}"
  else
    echo "=== ${1:-componentctl} ==="
  fi
}

# Info message (faint)
ui_info() {
  if has_gum; then
    gum style --faint "$*"
  else
    echo "$*"
  fi
}

# Success message (green check)
ui_ok() {
  if has_gum; then
    gum style --foreground 10 "✔ $*"
  else
    echo "✔ $*"
  fi
}

# Error message (red X)
ui_err() {
  if has_gum; then
    gum style --foreground 9 "✘ $*"
  else
    echo "✘ $*"
  fi >&2
}

# Warning message (yellow ⚠)
ui_warn() {
  if has_gum; then
    gum style --foreground 11 "⚠ $*"
  else
    echo "⚠ $*"
  fi
}

# Confirm prompt
ui_confirm() {
  if has_gum; then
    gum confirm "$@"
  else
    read -p "$* (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
  fi
}

# Input prompt
ui_input() {
  local prompt="$1"
  local default="${2:-}"

  if has_gum; then
    if [[ -n "$default" ]]; then
      gum input --prompt "$prompt " --value "$default"
    else
      gum input --prompt "$prompt "
    fi
  else
    if [[ -n "$default" ]]; then
      read -p "$prompt [$default]: " -r
      echo "${REPLY:-$default}"
    else
      read -p "$prompt: " -r
      echo "$REPLY"
    fi
  fi
}

# Select from options
ui_choose() {
  local prompt="$1"
  shift
  local options=("$@")

  if has_fzf; then
    printf '%s\n' "${options[@]}" | fzf --prompt="$prompt > " --height=~50% --border
  elif has_gum; then
    gum choose --header="$prompt" "${options[@]}"
  else
    ui_info "$prompt"
    select opt in "${options[@]}"; do
      if [[ -n "$opt" ]]; then
        echo "$opt"
        return 0
      fi
    done
  fi
}

# Check if command exists
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    ui_err "Missing: $1"
    [[ -n "${2:-}" ]] && ui_info "$2"
    exit 1
  }
}

# Format JSON output (if available)
format_json() {
  if command -v jq >/dev/null 2>&1; then
    jq -C .
  elif command -v python >/dev/null 2>&1; then
    python -m json.tool
  else
    cat
  fi
}

# HTTP helpers (optional - for services with REST APIs)
curl_json() {
  local url="$1"
  command -v curl >/dev/null 2>&1 || { ui_err "curl not installed"; return 1; }
  curl -fsS "$url" 2>&1 || return 1
}

curl_json_post() {
  local url="$1"
  command -v curl >/dev/null 2>&1 || { ui_err "curl not installed"; return 1; }
  curl -fsS -X POST "$url" 2>&1 || return 1
}

curl_json_post_data() {
  local url="$1"
  local data="$2"
  command -v curl >/dev/null 2>&1 || { ui_err "curl not installed"; return 1; }
  curl -fsS -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>&1 || return 1
}

# Error trap
trap 'ui_err "Failed at line $LINENO"; exit 1' ERR

# ============================================================
# COMMANDS
# ============================================================

show_help() {
  cat << 'EOF'
componentctl - Component Manager
=================================

USAGE:
  componentctl <command> [args...]

COMMANDS:
  start        Start the component
  stop         Stop the component
  restart      Restart the component
  status       Show component status
  logs         Show component logs
  install      Install component
  uninstall    Uninstall component
  doctor       Health check
  version      Show version
  menu         Interactive menu (if gum installed)

EXAMPLES:
  componentctl start
  componentctl status
  componentctl menu

EOF
}

cmd_start() {
  ui_title "Starting Component"
  ui_info "Implementation needed"
  # Example:
  # systemctl --user start "$SERVICE_NAME"
  # ui_ok "Component started"
}

cmd_stop() {
  ui_title "Stopping Component"
  ui_info "Implementation needed"
  # Example:
  # systemctl --user stop "$SERVICE_NAME"
  # ui_ok "Component stopped"
}

cmd_restart() {
  ui_title "Restarting Component"
  cmd_stop
  sleep 1
  cmd_start
}

cmd_status() {
  ui_title "Component Status"
  ui_info "Implementation needed"
  # Example:
  # systemctl --user status "$SERVICE_NAME" --no-pager
}

cmd_logs() {
  ui_title "Component Logs"
  ui_info "Implementation needed"
  # Example:
  # journalctl --user -u "$SERVICE_NAME" -n 50 --no-pager
}

cmd_doctor() {
  ui_title "Component Health Check"
  ui_info "Running diagnostics..."
  echo ""

  # Check dependencies
  if command -v gum >/dev/null 2>&1; then
    ui_ok "gum installed"
  else
    ui_warn "gum not installed (optional, for better UI)"
    ui_info "Install: yay -S gum"
  fi

  if command -v jq >/dev/null 2>&1; then
    ui_ok "jq installed (JSON formatting)"
  else
    ui_warn "jq not installed (optional)"
    ui_info "Install: pacman -S jq"
  fi

  # Check component files
  if [[ -d "$COMPONENT_DIR" ]]; then
    ui_ok "Component directory: $COMPONENT_DIR"
  else
    ui_err "Component directory not found"
  fi

  # Example: Check HTTP endpoint (for services)
  # if response=$(curl_json "http://127.0.0.1:8080/health" 2>&1); then
  #   if echo "$response" | grep -q '"ok".*true'; then
  #     ui_ok "Service is online"
  #     echo "$response" | format_json
  #   else
  #     ui_warn "Service responded but reported not ok"
  #   fi
  # else
  #   ui_err "Service unreachable"
  # fi

  # Example: Check systemd service
  # if systemctl --user is-active --quiet "$SERVICE_NAME"; then
  #   ui_ok "Service $SERVICE_NAME is running"
  # else
  #   ui_err "Service $SERVICE_NAME is not running"
  # fi

  # Add more checks as needed
}

cmd_menu() {
  if ! has_gum; then
    ui_err "Menu requires gum"
    ui_info "Install: yay -S gum"
    exit 1
  fi

  ui_title "Component Menu"

  local choice
  choice=$(ui_choose "Select action" \
    "Start" \
    "Stop" \
    "Restart" \
    "Status" \
    "Logs" \
    "Doctor" \
    "Exit")

  case "$choice" in
    Start) cmd_start ;;
    Stop) cmd_stop ;;
    Restart) cmd_restart ;;
    Status) cmd_status ;;
    Logs) cmd_logs ;;
    Doctor) cmd_doctor ;;
    Exit) exit 0 ;;
  esac
}

cmd_version() {
  echo "componentctl version $COMPONENTCTL_VERSION"
}

# ============================================================
# MAIN DISPATCHER
# ============================================================

main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    start)    cmd_start "$@" ;;
    stop)     cmd_stop "$@" ;;
    restart)  cmd_restart "$@" ;;
    status)   cmd_status "$@" ;;
    logs)     cmd_logs "$@" ;;
    doctor)   cmd_doctor "$@" ;;
    menu)     cmd_menu "$@" ;;
    version)  cmd_version "$@" ;;
    help|--help|-h) show_help ;;
    *)
      ui_err "Unknown command: $command"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
