#!/usr/bin/env bash
set -euo pipefail

PWA_STANDALONE_PORT="${PWA_STANDALONE_PORT:-8780}"
INDEX_PORT="${INDEX_PORT:-8799}"
ROUTE_PATH="${ROUTE_PATH:-/pwa}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
TIMEOUT_SEC="${TIMEOUT_SEC:-1}"

health_ok() {
  local port="$1"
  curl -fsS --max-time "$TIMEOUT_SEC" "http://127.0.0.1:${port}${HEALTH_PATH}" >/dev/null 2>&1
}

current_proxy() {
  tailscale serve status --json 2>/dev/null | node -e '
    const fs = require("fs");
    const cfg = JSON.parse(fs.readFileSync(0, "utf8"));
    const web = cfg.Web || {};
    for (const host of Object.keys(web)) {
      const handlers = (web[host] && web[host].Handlers) || {};
      if (handlers["/pwa"] && handlers["/pwa"].Proxy) {
        process.stdout.write(String(handlers["/pwa"].Proxy));
        process.exit(0);
      }
    }
    process.stdout.write("");
  '
}

funnel_enabled() {
  tailscale funnel status 2>/dev/null | grep -q "Funnel on"
}

select_target_port() {
  if health_ok "$PWA_STANDALONE_PORT"; then
    echo "$PWA_STANDALONE_PORT"
    return 0
  fi
  if health_ok "$INDEX_PORT"; then
    echo "$INDEX_PORT"
    return 0
  fi
  return 1
}

main() {
  local target_port
  if ! target_port="$(select_target_port)"; then
    echo "[pwa-failover] no healthy runtime on ports ${PWA_STANDALONE_PORT} or ${INDEX_PORT}" >&2
    exit 1
  fi

  local desired="http://127.0.0.1:${target_port}/pwa"
  local current
  current="$(current_proxy || true)"

  if [[ "$current" == "$desired" ]]; then
    echo "[pwa-failover] unchanged: ${ROUTE_PATH} -> ${desired}"
    exit 0
  fi

  local had_funnel=0
  if funnel_enabled; then
    had_funnel=1
  fi

  tailscale serve --bg --set-path "$ROUTE_PATH" "$desired" >/dev/null

  if [[ "$had_funnel" -eq 1 ]]; then
    tailscale funnel --bg "$INDEX_PORT" >/dev/null 2>&1 || true
  fi

  echo "[pwa-failover] switched: ${ROUTE_PATH} -> ${desired}"
}

main "$@"
