#!/usr/bin/env zsh
# αOS ZSH helpers — Index Node, Bridge, PWA Contexts

: ${AOS_INDEX_URL:="http://127.0.0.1:8799"}
: ${AOS_BRIDGE_URL:="http://127.0.0.1:8080"}

# ── HTTP helpers ─────────────────────────────────────────────────────────────

_aos_post_json() {
  local url="$1" payload="$2"
  curl -fsS -H "Content-Type: application/json" -d "$payload" "$url"
}

_aos_get() {
  curl -fsS "$1"
}

# ── Config ───────────────────────────────────────────────────────────────────

aos_env() {
  echo "AOS_INDEX_URL=$AOS_INDEX_URL"
  echo "AOS_BRIDGE_URL=$AOS_BRIDGE_URL"
}

# ── Hot List ─────────────────────────────────────────────────────────────────

aos_hotlist() {
  local title="$*"
  if [[ -z "$title" ]]; then
    echo "usage: aos_hotlist \"idea text\""
    return 1
  fi
  local payload
  payload=$(printf '{"title": "%s", "source": "zsh"}' "${title//\"/\\\"}")
  _aos_post_json "$AOS_INDEX_URL/api/door/hotlist" "$payload"
}

aos_hotlist_list() {
  _aos_get "$AOS_INDEX_URL/api/door/hotlist" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items') or data.get('data', {}).get('items', [])
for i, item in enumerate(items, 1):
    print(f\"{i}. {item.get('title', item.get('idea', '?'))} [{item.get('source','')}]\")
" 2>/dev/null || _aos_get "$AOS_INDEX_URL/api/door/hotlist"
}

# ── Core4 ────────────────────────────────────────────────────────────────────

aos_core4() {
  local domain="$1" task="$2"
  if [[ -z "$domain" || -z "$task" ]]; then
    echo "usage: aos_core4 <domain> <task>"
    echo "       domains: body being balance business"
    echo "       tasks:   fitness fuel meditation memoirs partner posterity discover declare"
    return 1
  fi
  local payload
  payload=$(printf '{"domain": "%s", "task": "%s", "source": "zsh"}' "$domain" "$task")
  _aos_post_json "$AOS_BRIDGE_URL/bridge/api/core4/log" "$payload"
}

aos_core4_today() {
  _aos_get "$AOS_BRIDGE_URL/bridge/core4/today"
}

# ── Ports ────────────────────────────────────────────────────────────────────

aos_ports() {
  _aos_get "$AOS_INDEX_URL/api/system/ports" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
labels = {
  8799: 'index-node',      8780: 'pwa-standalone',
  8080: 'bridge',          4100: 'vital-hub client-only',
  8781: 'core4ctx',        8782: 'firectx',
  8783: 'focusctx',        8784: 'framectx',
  8785: 'freedomctx',      8786: 'doorctx',
  8787: 'gamectx',         8788: 'vital-hub konsole',
  8790: 'memoirsctx',      8791: 'daily ctx',
  9001: 'entspannungsctx', 9000: 'fuelctx',
  9002: 'fitnessctx',
}
for p in data.get('ports', []):
    port = p['port']
    icon = '✓' if p['ok'] else '✗'
    label = labels.get(port, '')
    print(f'{icon} {port}  {label}')
" 2>/dev/null || echo "Index Node offline"
}

# ── Health ───────────────────────────────────────────────────────────────────

aos_health() {
  echo "=== αOS Health ==="
  printf "Index Node (8799): "
  _aos_get "$AOS_INDEX_URL/health" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('ok') else 'FAIL')" 2>/dev/null || echo "OFFLINE"
  printf "Bridge     (8080): "
  _aos_get "$AOS_BRIDGE_URL/health" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('ok') else 'FAIL')" 2>/dev/null || echo "OFFLINE"
}

# ── Services ─────────────────────────────────────────────────────────────────

_aos_svc_line() {
  local scope="$1" name="$2"
  local flag=""
  [[ "$scope" == "user" ]] && flag="--user"
  local state
  state=$(systemctl $flag is-active "$name" 2>/dev/null)
  local icon="●"
  case "$state" in
    active)   icon="\e[32m●\e[0m" ;;
    inactive) icon="\e[90m○\e[0m" ;;
    failed)   icon="\e[31m✗\e[0m" ;;
    *)        icon="\e[33m?\e[0m" ;;
  esac
  printf "  %b %-40s %s\n" "$icon" "$name" "$state"
}

aos_services() {
  echo "=== αOS + PWA Services ==="
  echo "--- Core (system) ---"
  _aos_svc_line system aos-index.service
  _aos_svc_line system aos-bridge.service

  echo "--- PWA Contexts (system) ---"
  _aos_svc_line system pwa-dev.service
  _aos_svc_line system pwa-core4-ctx.service
  _aos_svc_line system pwa-game-ctx.service
  _aos_svc_line system pwa-fire-ctx.service
  _aos_svc_line system pwa-focus-ctx.service
  _aos_svc_line system pwa-frame-ctx.service
  _aos_svc_line system pwa-freedom-ctx.service
  _aos_svc_line system pwa-memoirs-ctx.service
  _aos_svc_line system pwa-client-ctx.service

  echo "--- Vital Hub (user) ---"
  _aos_svc_line user vital-hub-konsole.service

  echo "--- Timers ---"
  _aos_svc_line system aos-fire-daily.timer
  _aos_svc_line system aos-fire-weekly.timer
  _aos_svc_line system aos-hub-push.timer
  _aos_svc_line system aos-heartbeat.timer
}

# ── Restart helpers ──────────────────────────────────────────────────────────

aos_restart_index()  { sudo systemctl restart aos-index.service; }
aos_restart_bridge() { sudo systemctl restart aos-bridge.service; }
aos_restart_konsole(){ systemctl --user restart vital-hub-konsole.service; }
