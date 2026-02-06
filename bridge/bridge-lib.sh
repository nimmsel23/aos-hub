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

bridge_recompute_config() {
  # Defaults
  : "${AOS_BRIDGE_HOST:=127.0.0.1}"
  : "${AOS_BRIDGE_PORT:=8080}"
  : "${AOS_BRIDGE_TOKEN:=}"
  : "${AOS_BRIDGE_TOKEN_HEADER:=X-Bridge-Token}"

  BRIDGE_HOST="$AOS_BRIDGE_HOST"
  BRIDGE_PORT="$AOS_BRIDGE_PORT"
  BRIDGE_BASE_URL="${AOS_BRIDGE_URL:-http://${BRIDGE_HOST}:${BRIDGE_PORT}}"
  BRIDGE_TOKEN="$AOS_BRIDGE_TOKEN"
  BRIDGE_TOKEN_HEADER="$AOS_BRIDGE_TOKEN_HEADER"

  # Tailscale helpers (optional)
  TS_PATH="${AOS_BRIDGE_TAILSCALE_PATH:-/bridge}"
  TS_TARGET="${AOS_BRIDGE_TAILSCALE_TARGET:-http://127.0.0.1:${BRIDGE_PORT}}"

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
