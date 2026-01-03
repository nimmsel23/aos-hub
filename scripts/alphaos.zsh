#!/usr/bin/env zsh
# AlphaOS ZSH helpers (router/bridge/index-node)

: ${AOS_INDEX_URL:="http://127.0.0.1:8799"}
: ${AOS_BRIDGE_URL:="http://127.0.0.1:8080"}

_aos_post_json() {
  local url="$1"
  local payload="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS -H "Content-Type: application/json" -d "$payload" "$url"
  else
    python - <<PY
import sys, json, urllib.request
url = sys.argv[1]
data = sys.argv[2].encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as r:
    sys.stdout.write(r.read().decode("utf-8"))
PY
  fi
}

_aos_get() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$url"
  else
    python - <<PY
import sys, urllib.request
with urllib.request.urlopen(sys.argv[1]) as r:
    sys.stdout.write(r.read().decode("utf-8"))
PY
  fi
}

aos_env() {
  echo "AOS_INDEX_URL=$AOS_INDEX_URL"
  echo "AOS_BRIDGE_URL=$AOS_BRIDGE_URL"
}

aos_hotlist() {
  local idea="$*"
  if [[ -z "$idea" ]]; then
    echo "usage: aos_hotlist \"idea text\""
    return 1
  fi
  local payload
  payload=$(printf '{"idea": "%s", "source": "zsh"}' "${idea//\"/\\\"}")
  _aos_post_json "$AOS_INDEX_URL/api/hotlist" "$payload"
}

aos_core4() {
  local domain="$1"
  local task="$2"
  local points="${3:-0.5}"
  if [[ -z "$domain" || -z "$task" ]]; then
    echo "usage: aos_core4 <domain> <task> [points]"
    echo "example: aos_core4 body fitness"
    return 1
  fi
  local payload
  payload=$(printf '{"domain": "%s", "task": "%s", "points": %s, "source": "zsh"}' "$domain" "$task" "$points")
  _aos_post_json "$AOS_BRIDGE_URL/bridge/core4/log" "$payload"
}

aos_core4_today() {
  _aos_get "$AOS_BRIDGE_URL/bridge/core4/today"
}

aos_bridge_health() {
  _aos_get "$AOS_BRIDGE_URL/health"
}

aos_router_restart() {
  systemctl --user restart alphaos-router.service
}

aos_bridge_restart() {
  systemctl --user restart aos-bridge.service
}

aos_services() {
  systemctl --user status alphaos-router.service --no-pager
  systemctl --user status aos-bridge.service --no-pager
}
