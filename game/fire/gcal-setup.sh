#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ENV_FILE="$SCRIPT_DIR/fire.env"
CAL_NAME=""
TW_SOURCE=""
TW_REPORT=""
TW_FILTER_TODAY=""
TW_FILTER_OVERDUE=""
RUN_AUTH=0
SHOW_LIST=1
DRY_RUN=0

usage() {
  cat <<'EOF'
game/fire/gcal-setup.sh — interactive setup for Fire Taskwarrior -> GCal sync

Usage:
  game/fire/gcal-setup.sh [--calendar "Calendar Name"] [--auth] [--no-list] [--dry-run]
                         [--tw-source filters|report] [--tw-report NAME]
                         [--tw-filter-today QUERY] [--tw-filter-overdue QUERY]
                         [--use-fired]

Actions:
  - (optional) runs `gcalcli init`
  - (optional) shows `gcalcli --nocolor list`
  - stores selected calendar and/or task-selection settings in `game/fire/fire.env`:
      AOS_FIRE_GCAL_BACKEND="gcalcli"
      AOS_FIRE_GCAL_CALENDAR="..."
      AOS_FIRE_GCAL_TW_SOURCE="report"
      AOS_FIRE_GCAL_TW_REPORT="fired"

Examples:
  game/fire/gcal-setup.sh --calendar "Fire Map"
  game/fire/gcal-setup.sh --use-fired --no-list
  game/fire/gcal-setup.sh --tw-source report --tw-report fired --no-list
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --calendar) CAL_NAME="${2:-}"; shift 2 ;;
    --tw-source) TW_SOURCE="${2:-}"; shift 2 ;;
    --tw-report) TW_REPORT="${2:-}"; shift 2 ;;
    --tw-filter-today) TW_FILTER_TODAY="${2:-}"; shift 2 ;;
    --tw-filter-overdue) TW_FILTER_OVERDUE="${2:-}"; shift 2 ;;
    --use-fired) TW_SOURCE="report"; TW_REPORT="fired"; shift ;;
    --auth) RUN_AUTH=1; shift ;;
    --no-list) SHOW_LIST=0; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help|help) usage; exit 0 ;;
    *) echo "[gcal-setup] unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "[gcal-setup] missing: $1" >&2; exit 1; }; }
need gcalcli

if [[ -n "$TW_SOURCE" ]]; then
  case "$TW_SOURCE" in
    filters|report) ;;
    *) echo "[gcal-setup] invalid --tw-source: $TW_SOURCE (expected filters|report)" >&2; exit 1 ;;
  esac
fi

escape_dq() { sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

upsert_env_kv() {
  local file="$1" key="$2" value="$3"
  local esc tmp
  esc="$(printf '%s' "$value" | escape_dq)"
  tmp="$(mktemp)"
  if [[ -f "$file" ]]; then
    awk -v key="$key" -v val="$esc" '
      BEGIN { done=0 }
      index($0, key "=") == 1 {
        print key "=\"" val "\""
        done=1
        next
      }
      { print }
      END { if (!done) print key "=\"" val "\"" }
    ' "$file" >"$tmp"
  else
    {
      echo "# Fire local env"
      echo
      printf '%s="%s"\n' "$key" "$esc"
    } >"$tmp"
  fi
  mv "$tmp" "$file"
}

has_setup_changes=0
[[ -n "$CAL_NAME" ]] && has_setup_changes=1
[[ -n "$TW_SOURCE" ]] && has_setup_changes=1
[[ -n "$TW_REPORT" ]] && has_setup_changes=1
[[ -n "$TW_FILTER_TODAY" ]] && has_setup_changes=1
[[ -n "$TW_FILTER_OVERDUE" ]] && has_setup_changes=1

if [[ "$RUN_AUTH" -eq 1 ]]; then
  gcalcli init
fi

if [[ "$SHOW_LIST" -eq 1 ]]; then
  echo "[gcal-setup] calendars (gcalcli list):" >&2
  if ! gcalcli --nocolor list; then
    echo >&2
    echo "[gcal-setup] gcalcli list failed (auth likely missing)." >&2
    echo "[gcal-setup] run: game/fire/gcal-auth.sh" >&2
    exit 1
  fi
  echo >&2
fi

if [[ -z "$CAL_NAME" ]]; then
  # Allow non-interactive partial updates (e.g. only switching to task report mode).
  if [[ "$has_setup_changes" -eq 0 ]]; then
    if [[ ! -t 0 ]]; then
      echo "[gcal-setup] no TTY input; pass --calendar \"...\" or task options" >&2
      exit 1
    fi
    read -r -p "Paste exact Google Calendar name for Fire due-sync: " CAL_NAME
  elif [[ -t 0 && "$SHOW_LIST" -eq 1 ]]; then
    # No-op; user likely changed task selection only and already saw the calendar list.
    :
  fi
fi

if [[ -n "$CAL_NAME" ]]; then
  [[ -n "${CAL_NAME// }" ]] || { echo "[gcal-setup] empty calendar name" >&2; exit 1; }
fi

if [[ "$has_setup_changes" -eq 0 && -z "$CAL_NAME" ]]; then
  echo "[gcal-setup] nothing to update" >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[gcal-setup] DRY RUN" >&2
  echo "AOS_FIRE_GCAL_BACKEND=\"gcalcli\"" >&2
  [[ -n "$CAL_NAME" ]] && echo "AOS_FIRE_GCAL_CALENDAR=\"$CAL_NAME\"" >&2
  [[ -n "$TW_SOURCE" ]] && echo "AOS_FIRE_GCAL_TW_SOURCE=\"$TW_SOURCE\"" >&2
  [[ -n "$TW_REPORT" ]] && echo "AOS_FIRE_GCAL_TW_REPORT=\"$TW_REPORT\"" >&2
  [[ -n "$TW_FILTER_TODAY" ]] && echo "AOS_FIRE_GCAL_TW_FILTER_TODAY=\"$TW_FILTER_TODAY\"" >&2
  [[ -n "$TW_FILTER_OVERDUE" ]] && echo "AOS_FIRE_GCAL_TW_FILTER_OVERDUE=\"$TW_FILTER_OVERDUE\"" >&2
  echo "[gcal-setup] target file: $ENV_FILE" >&2
  exit 0
fi

touch "$ENV_FILE"
upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_BACKEND" "gcalcli"
[[ -n "$CAL_NAME" ]] && upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_CALENDAR" "$CAL_NAME"
[[ -n "$TW_SOURCE" ]] && upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_TW_SOURCE" "$TW_SOURCE"
[[ -n "$TW_REPORT" ]] && upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_TW_REPORT" "$TW_REPORT"
[[ -n "$TW_FILTER_TODAY" ]] && upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_TW_FILTER_TODAY" "$TW_FILTER_TODAY"
[[ -n "$TW_FILTER_OVERDUE" ]] && upsert_env_kv "$ENV_FILE" "AOS_FIRE_GCAL_TW_FILTER_OVERDUE" "$TW_FILTER_OVERDUE"

echo "[gcal-setup] saved Fire GCal config to $ENV_FILE" >&2
echo "[gcal-setup] test with: game/fire/gcal-doctor.sh && game/fire/gcal-due.sh --dry-run" >&2
