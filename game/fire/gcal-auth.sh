#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ENV_FILE="$SCRIPT_DIR/fire.env"

# Load local Fire env if present so the JSON path can be pinned there.
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

find_client_json() {
  local candidate

  # Explicit env wins (lets the user move the file later without changing scripts).
  if [[ -n "${AOS_FIRE_GCAL_CLIENT_SECRET_JSON:-}" ]]; then
    if [[ -f "$AOS_FIRE_GCAL_CLIENT_SECRET_JSON" ]]; then
      printf '%s\n' "$AOS_FIRE_GCAL_CLIENT_SECRET_JSON"
      return 0
    fi
    echo "[gcal-auth] AOS_FIRE_GCAL_CLIENT_SECRET_JSON set but file missing: $AOS_FIRE_GCAL_CLIENT_SECRET_JSON" >&2
  fi

  for candidate in "$SCRIPT_DIR"/client_secret*.json; do
    [[ -f "$candidate" ]] || continue
    printf '%s\n' "$candidate"
    return 0
  done
  return 1
}

json_get_field() {
  local file="$1" key="$2"
  python3 - "$file" "$key" <<'PY'
import json, sys
path, key = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
installed = data.get("installed") or data.get("web") or {}
value = installed.get(key, "")
if value:
    print(value)
PY
}

if ! command -v gcalcli >/dev/null 2>&1; then
  echo "[gcal-auth] missing: gcalcli" >&2
  echo "[gcal-auth] install first, then rerun (or use: game/fire/gcal-bootstrap.sh)" >&2
  exit 1
fi

if client_json="$(find_client_json)"; then
  client_id="$(json_get_field "$client_json" client_id || true)"
  client_secret="$(json_get_field "$client_json" client_secret || true)"
  cat >&2 <<EOF
[gcal-auth] OAuth client JSON detected:
  $client_json

Use the values inside this file when \`gcalcli init\` prompts for:
- client_id: ${client_id:-<not found>}
- client_secret: ${client_secret:-<not found>}

EOF
else
  cat >&2 <<'EOF'
[gcal-auth] No OAuth client JSON found in game/fire/.

Expected file pattern:
  game/fire/client_secret*.json

Place your Google Cloud OAuth Desktop client JSON there, then rerun.
EOF
fi

# Keep auth interactive; gcalcli init owns the prompt flow.
exec gcalcli init "$@"
