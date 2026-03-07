#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"

source "$ROOT_DIR/scripts/lib/aos-env.sh" 2>/dev/null && aos_env_load "" "$ROOT_DIR" 2>/dev/null || true
# Fire-local overrides (kept separate from aos.env)
if [[ -f "$SCRIPT_DIR/fire.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/fire.env"
fi

APP="gcal-push-due"
TODAY="${AOS_FIRE_GCAL_DAY:-$(date +%F)}"
BACKEND="${AOS_FIRE_GCAL_BACKEND:-gcalcli}" # gcalcli|ics|print
# Prefer local Fire sync var, then existing GAS Fire Centre names/IDs if present in env.
CALENDAR="${AOS_FIRE_GCAL_CALENDAR:-${AOS_FIRE_GCAL_CALENDAR_ID:-${AOS_FIRE_GCAL_NAME:-${FIRE_GCAL_CALENDAR_NAME:-${FIRE_GCAL_CALENDAR_ID:-}}}}}"
ICS_OUT="${AOS_FIRE_GCAL_ICS_OUT:-$SCRIPT_DIR/work/gcal-due/$TODAY/tasks.ics}"
EVENT_PREFIX_TODAY="${AOS_FIRE_GCAL_PREFIX_TODAY:-[TW today]}"
EVENT_PREFIX_OVERDUE="${AOS_FIRE_GCAL_PREFIX_OVERDUE:-[TW overdue]}"
MARKER_PREFIX="${AOS_FIRE_GCAL_MARKER_PREFIX:-AOS_TW_GCAL_SYNC}"
TASK_BIN="${AOS_TASK_BIN:-task}"
# Task selection source:
# - filters (default): two explicit Taskwarrior filters
# - report: one Taskwarrior report/query, then split by due date into today/overdue
TW_SOURCE="${AOS_FIRE_GCAL_TW_SOURCE:-filters}" # filters|report
TW_FILTER_TODAY="${AOS_FIRE_GCAL_TW_FILTER_TODAY:-status:pending due:today}"
TW_FILTER_OVERDUE="${AOS_FIRE_GCAL_TW_FILTER_OVERDUE:-status:pending due.before:today}"
TW_REPORT="${AOS_FIRE_GCAL_TW_REPORT:-fired}"
# When enabled, tasks with `scheduled` are created as timed events on TODAY using HH:MM from Taskwarrior.
SCHEDULED_AS_TIMED="${AOS_FIRE_GCAL_SCHEDULED_AS_TIMED:-1}"
SCHEDULED_DURATION_MIN="${AOS_FIRE_GCAL_SCHEDULED_DURATION_MIN:-60}"
DRY_RUN=0
NO_DELETE=0
DOCTOR=0

die() { echo "[$APP] $*" >&2; exit 1; }
warn() { echo "[$APP] WARN: $*" >&2; }
info() { echo "[$APP] $*" >&2; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

usage() {
  cat <<'EOF'
game/fire/gcal-push-due.sh — push Taskwarrior due:today + overdue tasks to Google Calendar

Usage:
  game/fire/gcal-push-due.sh [--day YYYY-MM-DD] [--backend gcalcli|ics|print] [--calendar NAME] [--dry-run] [--no-delete] [--doctor]

Env (optional):
  AOS_FIRE_GCAL_BACKEND=gcalcli|ics|print
  AOS_FIRE_GCAL_CALENDAR="Calendar Name"
  FIRE_GCAL_CALENDAR_NAME="Existing GAS Fire calendar name"   # fallback
  FIRE_GCAL_CALENDAR_ID="Existing GAS Fire calendar id"       # fallback
  AOS_FIRE_GCAL_ICS_OUT=game/fire/work/gcal-due/YYYY-MM-DD/tasks.ics
  AOS_FIRE_GCAL_PREFIX_TODAY="[TW today]"
  AOS_FIRE_GCAL_PREFIX_OVERDUE="[TW overdue]"
  AOS_FIRE_GCAL_TW_SOURCE=filters|report
  AOS_FIRE_GCAL_TW_FILTER_TODAY="status:pending due:today"
  AOS_FIRE_GCAL_TW_FILTER_OVERDUE="status:pending due.before:today"
  AOS_FIRE_GCAL_TW_REPORT="fired"   # used when source=report
  AOS_FIRE_GCAL_SCHEDULED_AS_TIMED=1
  AOS_FIRE_GCAL_SCHEDULED_DURATION_MIN=60

Notes:
  - Default task selection uses:
      task status:pending due:today export
      task status:pending due.before:today export
  - Optional report mode uses:
      task <AOS_FIRE_GCAL_TW_REPORT> export
    and then splits that result into today/overdue by due date.
  - If a task has `scheduled` and AOS_FIRE_GCAL_SCHEDULED_AS_TIMED=1,
    it is pushed as a timed event (HH:MM from scheduled) instead of all-day.
  - gcalcli backend tries to delete previous sync events for the same day (marker-based) before re-adding.
  - If your local gcalcli is broken, use --backend ics as fallback and import/subscribe manually.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --day) TODAY="${2:-}"; shift 2 ;;
    --backend) BACKEND="${2:-}"; shift 2 ;;
    --calendar) CALENDAR="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-delete) NO_DELETE=1; shift ;;
    --doctor) DOCTOR=1; shift ;;
    -h|--help|help) usage; exit 0 ;;
    *) die "unknown arg: $1" ;;
  esac
done

need "$TASK_BIN"
need jq

cmd_doctor() {
  local due_count overdue_count
  due_count="$(tw_selected_today_json | jq 'length' 2>/dev/null || echo '?')"
  overdue_count="$(tw_selected_overdue_json | jq 'length' 2>/dev/null || echo '?')"
  echo "backend=$BACKEND"
  echo "day=$TODAY"
  echo "calendar=${CALENDAR:-<default>}"
  echo "tw_source=$TW_SOURCE"
  echo "scheduled_as_timed=$SCHEDULED_AS_TIMED"
  echo "scheduled_duration_min=$SCHEDULED_DURATION_MIN"
  if [[ "$TW_SOURCE" == "report" ]]; then
    echo "tw_report=$TW_REPORT"
  else
    echo "tw_filter_today=$TW_FILTER_TODAY"
    echo "tw_filter_overdue=$TW_FILTER_OVERDUE"
  fi
  echo "gcalcli=$(command -v gcalcli || echo missing)"
  echo "task_bin=$TASK_BIN"
  echo "task=$(command -v "$TASK_BIN" || echo missing)"
  echo "jq=$(command -v jq || echo missing)"
  echo "due_today=$due_count"
  echo "overdue=$overdue_count"
  echo "fire_env=$SCRIPT_DIR/fire.env"
}

tw_export() {
  local query="$1"
  "$TASK_BIN" rc.confirmation=no rc.verbose=nothing "$query" export 2>/dev/null || echo '[]'
}

tw_get_report_filter() {
  local name="$1"
  "$TASK_BIN" _get "rc.report.${name}.filter" 2>/dev/null || true
}

tw_report_export_json() {
  local filter
  filter="$(tw_get_report_filter "$TW_REPORT" | tr -d '\r')"
  [[ -n "${filter// }" ]] || {
    warn "report filter missing for: $TW_REPORT (expected rc.report.${TW_REPORT}.filter)"
    echo '[]'
    return 0
  }
  tw_export "$filter"
}

tw_report_split_json() {
  local raw_json
  raw_json="$(tw_report_export_json)"
  RAW_JSON="$raw_json" python3 - "$TODAY" <<'PY'
import datetime as dt
import json
import os
import sys

today = dt.date.fromisoformat(sys.argv[1])
items = json.loads(os.environ.get("RAW_JSON", "[]"))
out_today = []
out_overdue = []

def parse_tw_ts(value):
    if not value or not isinstance(value, str):
        return None
    try:
        u = dt.datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
        return u.astimezone().date()
    except Exception:
        return None

for item in items or []:
    if item.get("status") != "pending":
        continue
    # Prefer due for due/overdue semantics; fallback to scheduled when due is absent.
    ref = item.get("due") or item.get("scheduled")
    local_day = parse_tw_ts(ref)
    if not local_day:
        continue
    enriched = dict(item)
    if local_day == today:
        enriched["__scope"] = "today"
        out_today.append(enriched)
    elif local_day < today:
        enriched["__scope"] = "overdue"
        out_overdue.append(enriched)

print(json.dumps({"today": out_today, "overdue": out_overdue}))
PY
}

tw_selected_today_json() {
  if [[ "$TW_SOURCE" == "report" ]]; then
    tw_report_split_json | jq '.today'
  else
    tw_export "$TW_FILTER_TODAY"
  fi
}

tw_selected_overdue_json() {
  if [[ "$TW_SOURCE" == "report" ]]; then
    tw_report_split_json | jq '.overdue'
  else
    tw_export "$TW_FILTER_OVERDUE"
  fi
}

merge_tasks() {
  local due_json overdue_json
  due_json="$(tw_selected_today_json)"
  overdue_json="$(tw_selected_overdue_json)"
  # Preserve origin query to label calendar entries as "today" vs "overdue".
  jq -cn \
    --argjson due "$due_json" \
    --argjson overdue "$overdue_json" \
    '
      [($due // [])[] | . + {__scope:"today"}] +
      [($overdue // [])[] | . + {__scope:"overdue"}]
      | unique_by(.uuid)
    '
}

tw_due_pretty() {
  local raw="${1:-}"
  [[ -n "$raw" ]] || { printf '\n'; return 0; }
  local iso
  iso="$(printf '%s' "$raw" | sed -E 's/^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$/\1-\2-\3 \4:\5:\6 UTC/')"
  printf '%s\n' "$iso"
}

tw_ts_to_local_hm() {
  local raw="${1:-}" iso
  [[ -n "$raw" ]] || { printf '\n'; return 0; }
  iso="$(tw_due_pretty "$raw")"
  [[ -n "$iso" ]] || { printf '\n'; return 0; }
  date -d "$iso" +%H:%M 2>/dev/null || printf '\n'
}

ics_escape() {
  sed -e 's/\\/\\\\/g' -e 's/;/\\;/g' -e 's/,/\\,/g'
}

ics_begin() {
  mkdir -p "$(dirname "$ICS_OUT")"
  cat >"$ICS_OUT" <<EOF
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AlphaOS//Taskwarrior Due Sync//EN
CALSCALE:GREGORIAN
EOF
}

ics_add_event() {
  local uid="$1" title="$2" desc="$3" hm="${4:-}"
  local ymd next dtstamp
  ymd="${TODAY//-/}"
  next="$(date -d "$TODAY +1 day" +%F)"
  dtstamp="$(date -u +%Y%m%dT%H%M%SZ)"
  {
    echo "BEGIN:VEVENT"
    echo "UID:${uid}"
    echo "DTSTAMP:${dtstamp}"
    if [[ -n "$hm" ]]; then
      local dtstart dtend
      dtstart="$(date -d "$TODAY $hm" +%Y%m%dT%H%M%S 2>/dev/null || true)"
      dtend="$(date -d "$TODAY $hm +${SCHEDULED_DURATION_MIN} minutes" +%Y%m%dT%H%M%S 2>/dev/null || true)"
      if [[ -n "$dtstart" && -n "$dtend" ]]; then
        echo "DTSTART:${dtstart}"
        echo "DTEND:${dtend}"
      else
        echo "DTSTART;VALUE=DATE:${ymd}"
        echo "DTEND;VALUE=DATE:${next//-/}"
      fi
    else
      echo "DTSTART;VALUE=DATE:${ymd}"
      echo "DTEND;VALUE=DATE:${next//-/}"
    fi
    printf 'SUMMARY:%s\n' "$(printf '%s' "$title" | ics_escape)"
    printf 'DESCRIPTION:%s\n' "$(printf '%s' "$desc" | ics_escape)"
    echo "END:VEVENT"
  } >>"$ICS_OUT"
}

ics_end() {
  echo "END:VCALENDAR" >>"$ICS_OUT"
}

run_or_echo() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[DRY]'; printf ' %q' "$@"; printf '\n' >&2
    return 0
  fi
  "$@"
}

gcal_delete_previous() {
  local marker_day="$MARKER_PREFIX day=$TODAY"
  local next_day
  next_day="$(date -d "$TODAY +1 day" +%F)"
  [[ "$NO_DELETE" -eq 1 ]] && return 0

  local -a cmd=(gcalcli delete)
  [[ -n "$CALENDAR" ]] && cmd+=(--calendar "$CALENDAR")
  # Best-effort idempotency: clean up this script's prior events for the same day.
  run_or_echo "${cmd[@]}" --iamaexpert "$marker_day" "$TODAY" "$next_day" >/dev/null 2>&1 || \
    warn "gcalcli delete failed (continuing; possible duplicates on rerun)"
}

gcal_add() {
  local title="$1" desc="$2" hm="${3:-}"
  local -a cmd=(gcalcli add)
  [[ -n "$CALENDAR" ]] && cmd+=(--calendar "$CALENDAR")
  if [[ -n "$hm" ]]; then
    run_or_echo "${cmd[@]}" \
      --title "$title" \
      --when "$TODAY $hm" \
      --duration "$SCHEDULED_DURATION_MIN" \
      --description "$desc" \
      --noprompt >/dev/null
  else
    run_or_echo "${cmd[@]}" \
      --title "$title" \
      --when "$TODAY" \
      --allday \
      --duration 1 \
      --description "$desc" \
      --noprompt >/dev/null
  fi
}

print_item() {
  local scope="$1" uuid="$2" title="$3" due="$4" sched="$5" mode="$6" project="$7" tags="$8"
  printf '%s | %s | %s | due=%s | scheduled=%s | mode=%s | project=%s | tags=%s\n' \
    "$scope" "$uuid" "$title" "$due" "$sched" "$mode" "$project" "$tags"
}

main() {
  case "$TW_SOURCE" in
    filters|report) ;;
    *) die "invalid AOS_FIRE_GCAL_TW_SOURCE: $TW_SOURCE (expected filters|report)" ;;
  esac

  if [[ "$DOCTOR" -eq 1 ]]; then
    cmd_doctor
    return 0
  fi

  local tasks_json
  tasks_json="$(merge_tasks)"

  local count
  count="$(jq 'length' <<<"$tasks_json")"
  info "tasks selected for $TODAY: $count"

  if [[ "$BACKEND" == "gcalcli" ]]; then
    need gcalcli
    [[ -n "$CALENDAR" ]] || warn "AOS_FIRE_GCAL_CALENDAR not set; gcalcli will use its default calendar"
    gcal_delete_previous
  elif [[ "$BACKEND" == "ics" ]]; then
    # Auth-free fallback for local testing/import when GCal write auth isn't ready.
    ics_begin
  elif [[ "$BACKEND" != "print" ]]; then
    die "invalid backend: $BACKEND (expected gcalcli|ics|print)"
  fi

  jq -c '.[]' <<<"$tasks_json" | while IFS= read -r item; do
    uuid="$(jq -r '.uuid // ""' <<<"$item")"
    scope="$(jq -r '.__scope // ""' <<<"$item")"
    desc="$(jq -r '.description // ""' <<<"$item")"
    project="$(jq -r '.project // ""' <<<"$item")"
    tags="$(jq -r '(.tags // []) | join(",")' <<<"$item")"
    due_raw="$(jq -r '.due // ""' <<<"$item")"
    scheduled_raw="$(jq -r '.scheduled // ""' <<<"$item")"
    [[ -n "$uuid" ]] || continue
    local_prefix="$EVENT_PREFIX_TODAY"
    [[ "$scope" == "overdue" ]] && local_prefix="$EVENT_PREFIX_OVERDUE"
    [[ -n "$desc" ]] || desc="Task $uuid"
    title="$local_prefix $desc"
    due_pretty="$(tw_due_pretty "$due_raw")"
    sched_pretty="$(tw_due_pretty "$scheduled_raw")"
    sched_hm=""
    mode="all-day"
    if [[ "$SCHEDULED_AS_TIMED" == "1" ]]; then
      sched_hm="$(tw_ts_to_local_hm "$scheduled_raw")"
      if [[ -n "$sched_hm" ]]; then
        mode="timed@$sched_hm"
      fi
    fi
    marker="$MARKER_PREFIX day=$TODAY uuid=$uuid scope=$scope"
    body=$(
      cat <<EOF
$marker
task_uuid: $uuid
scope: $scope
task_due: ${due_pretty:-n/a}
task_scheduled: ${sched_pretty:-n/a}
event_mode: $mode
project: ${project:-}
tags: ${tags:-}
EOF
    )

    case "$BACKEND" in
      print)
        print_item "$scope" "$uuid" "$desc" "${due_pretty:-n/a}" "${sched_pretty:-n/a}" "$mode" "${project:-}" "${tags:-}"
        ;;
      ics)
        ics_add_event "${uuid}-${scope}-${TODAY}@alphaos.local" "$title" "$body" "$sched_hm"
        ;;
      gcalcli)
        gcal_add "$title" "$body" "$sched_hm"
        ;;
    esac
  done

  if [[ "$BACKEND" == "ics" ]]; then
    ics_end
    info "wrote ICS: $ICS_OUT"
    printf '%s\n' "$ICS_OUT"
  fi
}

main "$@"
