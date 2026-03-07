#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ENV_FILE="$SCRIPT_DIR/fire.env"

CAL_NAME=""
DRY_RUN=0
SKIP_AUTH=0
SKIP_LIST=0
SKIP_SETUP=0

usage() {
  cat <<'EOF'
game/fire/gcal-bootstrap.sh — bootstrap Fire Taskwarrior -> GCal sync

What it does:
  1) Checks gcalcli
  2) Prints Google OAuth setup guidance (no app password)
  3) Runs gcalcli init
  4) Lists calendars
  5) Stores selected calendar in game/fire/fire.env
  6) Runs Fire GCal doctor

Usage:
  game/fire/gcal-bootstrap.sh [--calendar "Calendar Name"] [--dry-run]
                             [--skip-auth] [--skip-list] [--skip-setup]

Examples:
  game/fire/gcal-bootstrap.sh
  game/fire/gcal-bootstrap.sh --calendar "AlphaOS Fire" --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --calendar) CAL_NAME="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-auth) SKIP_AUTH=1; shift ;;
    --skip-list) SKIP_LIST=1; shift ;;
    --skip-setup) SKIP_SETUP=1; shift ;;
    -h|--help|help) usage; exit 0 ;;
    *) echo "[gcal-bootstrap] unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

have() { command -v "$1" >/dev/null 2>&1; }
run() { "$@"; }
run_or_echo() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[DRY]'; printf ' %q' "$@"; printf '\n' >&2
    return 0
  fi
  run "$@"
}

load_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
}

find_client_json() {
  local candidate
  if [[ -n "${AOS_FIRE_GCAL_CLIENT_SECRET_JSON:-}" && -f "${AOS_FIRE_GCAL_CLIENT_SECRET_JSON:-}" ]]; then
    printf '%s\n' "$AOS_FIRE_GCAL_CLIENT_SECRET_JSON"
    return 0
  fi
  for candidate in "$SCRIPT_DIR"/client_secret*.json; do
    [[ -f "$candidate" ]] || continue
    printf '%s\n' "$candidate"
    return 0
  done
  return 1
}

print_guide() {
  cat <<'EOF'

[Fire GCal Bootstrap] Google auth guide

- You do NOT need a Google app password for gcalcli.
- gcalcli uses OAuth (Client ID + Client Secret) from Google Cloud Console.

Steps:
1. Open Google Cloud Console credentials page:
   https://console.cloud.google.com/apis/credentials
2. Create/select a project.
3. Enable "Google Calendar API" for that project.
4. Create OAuth Client ID + Client Secret (Desktop app is easiest).
5. Put the downloaded JSON into `game/fire/` (e.g. `client_secret....json`).
6. Run `gcalcli init` and paste client_id / client_secret when prompted
   (the Fire auth wrapper will point you to the JSON file).
7. List calendars (`gcalcli --nocolor list`) and choose the exact calendar name.
8. Save it to Fire config (`game/fire/gcal-setup.sh`).

gcalcli auth docs:
- https://github.com/insanum/gcalcli/blob/HEAD/docs/api-auth.md

If gcalcli is missing:
- Arch/EndeavourOS: `sudo pacman -S gcalcli` (or `yay -S gcalcli`)
- pipx fallback: `pipx install gcalcli`

EOF
}

if ! have gcalcli; then
  print_guide
  echo "[gcal-bootstrap] gcalcli not found; install it first, then rerun." >&2
  exit 1
fi

load_env
print_guide

if client_json="$(find_client_json)"; then
  echo "[gcal-bootstrap] OAuth client JSON found: $client_json" >&2
else
  echo "[gcal-bootstrap] No OAuth client JSON found in game/fire/ (pattern: client_secret*.json)" >&2
fi
echo >&2

if [[ "$SKIP_AUTH" -eq 0 ]]; then
  run_or_echo "$SCRIPT_DIR/gcal-auth.sh"
fi

if [[ "$SKIP_LIST" -eq 0 ]]; then
  run_or_echo "$SCRIPT_DIR/gcal-list.sh"
fi

if [[ "$SKIP_SETUP" -eq 0 ]]; then
  if [[ -n "$CAL_NAME" ]]; then
    run_or_echo "$SCRIPT_DIR/gcal-setup.sh" --calendar "$CAL_NAME" --no-list
  else
    run_or_echo "$SCRIPT_DIR/gcal-setup.sh" --no-list
  fi
fi

run_or_echo "$SCRIPT_DIR/gcal-doctor.sh"

cat <<'EOF'

[Fire GCal Bootstrap] Next:
- Preview: game/fire/gcal-due.sh --backend print
- Push:    game/fire/gcal-due.sh
- Auto:    game/fire/firectl gcal auto enable
- Wrapper: game/fire/firectl gcal due

EOF
