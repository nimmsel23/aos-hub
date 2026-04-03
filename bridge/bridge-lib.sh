#!/usr/bin/env bash
set -euo pipefail

# Shared helpers for Bridge CLI scripts.
# Generic helpers live in scripts/ctl-lib.sh; Bridge-only logic remains here.

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd -P)"

# shellcheck disable=SC1090
source "$ROOT_DIR/scripts/ctl-lib.sh"

: "${CTL_CHOOSE_PROMPT:=bridgectl}"
: "${CTL_CHOOSE_PREFER:=gum}"

bridge_detect_mode() {
  # Detect whether aos-bridge is running as system or user service.
  # Returns: "system" or "user"
  local sys_active user_active
  sys_active="$(systemctl is-active "aos-bridge.service" 2>/dev/null || true)"
  user_active="$(systemctl --user is-active "aos-bridge.service" 2>/dev/null || true)"

  if [[ "$sys_active" == "active" ]]; then
    echo "system"
  else
    echo "user"
  fi
}

bridge_recompute_config() {
  # Load bridge.env first (bridge-specific secrets)
  local bridge_env="${BRIDGE_ENV_FILE:-$HOME/.env/bridge.env}"
  if [[ -f "$bridge_env" ]]; then
    # shellcheck disable=SC1090
    source "$bridge_env"
  fi

  # Defaults
  : "${BRIDGE_HOST:=127.0.0.1}"
  : "${BRIDGE_PORT:=8080}"
  : "${BRIDGE_TOKEN:=}"
  : "${BRIDGE_TOKEN_HEADER:=X-Bridge-Token}"

  BRIDGE_BASE_URL="${BRIDGE_URL:-http://${BRIDGE_HOST}:${BRIDGE_PORT}}"

  # Tailscale helpers (optional)
  TS_PATH="${BRIDGE_TAILSCALE_PATH:-/bridge}"
  TS_TARGET="${BRIDGE_TAILSCALE_TARGET:-http://127.0.0.1:${BRIDGE_PORT}}"

  CURL_TIMEOUT_ARGS=(--connect-timeout 5 --max-time 20)
}

bridge_curl_get() {
  local url="$1"
  if ! has_cmd curl; then
    die "curl not found"
  fi
  if [[ -n "$BRIDGE_TOKEN" ]]; then
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" -H "$BRIDGE_TOKEN_HEADER: $BRIDGE_TOKEN" "$url"
  else
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" "$url"
  fi
}

bridge_curl_post() {
  local url="$1"
  if ! has_cmd curl; then
    die "curl not found"
  fi
  if [[ -n "$BRIDGE_TOKEN" ]]; then
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" -X POST -H "$BRIDGE_TOKEN_HEADER: $BRIDGE_TOKEN" "$url"
  else
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" -X POST "$url"
  fi
}

bridge_curl_post_json() {
  local url="$1"
  local json="$2"
  if ! has_cmd curl; then
    die "curl not found"
  fi
  if [[ -n "$BRIDGE_TOKEN" ]]; then
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" -X POST -H "$BRIDGE_TOKEN_HEADER: $BRIDGE_TOKEN" -H "Content-Type: application/json" -d "$json" "$url"
  else
    curl -fsS "${CURL_TIMEOUT_ARGS[@]}" -X POST -H "Content-Type: application/json" -d "$json" "$url"
  fi
}
