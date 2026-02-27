#!/usr/bin/env bash
set -euo pipefail

APP="ctl-help-audit"
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DO_STATIC=1
DO_RUNTIME=1
STRICT=0
VERBOSE=0
PROBE_MISSING=0
RUNTIME_TIMEOUT_SEC="${AOS_CTL_HELP_AUDIT_TIMEOUT_SEC:-3}"
MAX_OUTPUT_LINES="${AOS_CTL_HELP_AUDIT_MAX_LINES:-12}"

CANDIDATE_REGEX='(^|/)(aos|aosctl|routerctl|bridgectl|firemap)$|/scripts/[^/]*ctl$|/door/cli/doorctl$|/game/tent/tentctl$|/core4/python-core4/core4ctl$'

usage() {
  cat <<EOF
$APP — audit help support for frontdoors and *ctl scripts

Usage:
  $APP [options]

Options:
  --static-only         Only run static source scan
  --runtime-only        Only run runtime --help probes
  --probe-missing       Also probe runtime for files missing static --help markers (less safe)
  --timeout SEC         Runtime probe timeout in seconds (default: $RUNTIME_TIMEOUT_SEC)
  --max-lines N         Max lines of captured help output shown in verbose mode (default: $MAX_OUTPUT_LINES)
  --verbose             Show captured output snippets for non-pass results
  --strict              Exit non-zero if any fail is found
  -h, --help            Show this help

Notes:
  - Runtime probes call: <script> --help (non-interactive, with timeout)
  - By default, runtime probes are skipped for files without static --help markers
EOF
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

match_text() {
  local pattern="$1" file="$2"
  if have_cmd rg; then
    rg -q -- "$pattern" "$file"
  else
    grep -Eq -- "$pattern" "$file"
  fi
}

collect_candidates() {
  if have_cmd rg; then
    rg --files "$ROOT_DIR" | rg "$CANDIDATE_REGEX" | sort
    return 0
  fi

  find "$ROOT_DIR" -type f 2>/dev/null | sort | while IFS= read -r f; do
    case "$f" in
      "$ROOT_DIR"/aos|"$ROOT_DIR"/aosctl|"$ROOT_DIR"/firemap|\
      "$ROOT_DIR"/router/routerctl|"$ROOT_DIR"/bridge/bridgectl|\
      "$ROOT_DIR"/door/cli/doorctl|"$ROOT_DIR"/game/tent/tentctl|\
      "$ROOT_DIR"/core4/python-core4/core4ctl|"$ROOT_DIR"/scripts/*ctl)
        printf "%s\n" "$f"
        ;;
    esac
  done
}

static_scan() {
  local file="$1"
  local has_long=0 has_short=0 has_help_word=0 has_combo=0

  match_text '--help' "$file" && has_long=1 || true
  match_text '(^|[^[:alnum:]_])-h([^[:alnum:]_]|$)' "$file" && has_short=1 || true
  match_text '(^|[^[:alnum:]_])help([^[:alnum:]_]|$)' "$file" && has_help_word=1 || true
  match_text 'help[^[:cntrl:]]*--help|--help[^[:cntrl:]]*help' "$file" && has_combo=1 || true

  STATIC_MARKERS=""
  (( has_long == 1 )) && STATIC_MARKERS+="--help "
  (( has_short == 1 )) && STATIC_MARKERS+="-h "
  (( has_help_word == 1 )) && STATIC_MARKERS+="help "
  STATIC_MARKERS="${STATIC_MARKERS% }"

  if (( has_long == 1 && has_short == 1 && has_help_word == 1 )); then
    STATIC_STATUS="pass"
  elif (( has_long == 1 || has_short == 1 || has_help_word == 1 )); then
    STATIC_STATUS="warn"
  else
    STATIC_STATUS="fail"
  fi

  if (( has_combo == 1 )); then
    STATIC_NOTE="combo"
  else
    STATIC_NOTE=""
  fi
}

runtime_probe() {
  local file="$1"
  local tmp rc=0

  RUNTIME_STATUS="skip"
  RUNTIME_NOTE=""
  RUNTIME_OUTPUT=""

  if [[ ! -x "$file" ]]; then
    RUNTIME_NOTE="not executable"
    return 0
  fi

  if (( PROBE_MISSING == 0 )) && [[ "${STATIC_MARKERS:-}" != *"--help"* ]]; then
    RUNTIME_NOTE="skipped (no static --help marker)"
    return 0
  fi

  tmp="$(mktemp)"
  if have_cmd timeout; then
    set +e
    timeout "${RUNTIME_TIMEOUT_SEC}" "$file" --help >"$tmp" 2>&1
    rc=$?
    set -e
  else
    set +e
    "$file" --help >"$tmp" 2>&1
    rc=$?
    set -e
    RUNTIME_NOTE="no timeout cmd"
  fi

  RUNTIME_OUTPUT="$(head -n "$MAX_OUTPUT_LINES" "$tmp" || true)"
  rm -f "$tmp"

  local helpish=0 unknownish=0 ttyish=0
  printf "%s" "$RUNTIME_OUTPUT" | grep -Eiq 'usage|commands|examples|show this help|^help\b' && helpish=1 || true
  printf "%s" "$RUNTIME_OUTPUT" | grep -Eiq 'unknown command|invalid option|unrecognized option|illegal option' && unknownish=1 || true
  printf "%s" "$RUNTIME_OUTPUT" | grep -Eiq 'tty|/dev/tty|interactive' && ttyish=1 || true

  case "$rc" in
    0)
      if (( helpish == 1 )) && (( unknownish == 0 )); then
        RUNTIME_STATUS="pass"
      else
        RUNTIME_STATUS="warn"
        [[ -z "$RUNTIME_NOTE" ]] && RUNTIME_NOTE="exit=0 but output not help-like"
      fi
      ;;
    124|137)
      RUNTIME_STATUS="fail"
      RUNTIME_NOTE="timeout"
      ;;
    *)
      if (( helpish == 1 )) && (( unknownish == 0 )); then
        RUNTIME_STATUS="warn"
        [[ -z "$RUNTIME_NOTE" ]] && RUNTIME_NOTE="non-zero rc=$rc (but help-like)"
      elif (( ttyish == 1 )); then
        RUNTIME_STATUS="warn"
        [[ -z "$RUNTIME_NOTE" ]] && RUNTIME_NOTE="TTY-dependent"
      else
        RUNTIME_STATUS="fail"
        [[ -z "$RUNTIME_NOTE" ]] && RUNTIME_NOTE="rc=$rc"
      fi
      ;;
  esac
}

status_rank() {
  case "$1" in
    pass) echo 0 ;;
    skip) echo 1 ;;
    warn) echo 2 ;;
    fail) echo 3 ;;
    *) echo 2 ;;
  esac
}

overall_status() {
  local s_rank=0 r_rank=0
  if (( DO_STATIC == 1 )); then
    s_rank="$(status_rank "$STATIC_STATUS")"
  fi
  if (( DO_RUNTIME == 1 )); then
    r_rank="$(status_rank "$RUNTIME_STATUS")"
  fi
  if (( s_rank >= 3 || r_rank >= 3 )); then
    echo "fail"
  elif (( s_rank >= 2 || r_rank >= 2 )); then
    echo "warn"
  else
    echo "pass"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --static-only)
      DO_STATIC=1
      DO_RUNTIME=0
      ;;
    --runtime-only)
      DO_STATIC=0
      DO_RUNTIME=1
      ;;
    --probe-missing)
      PROBE_MISSING=1
      ;;
    --timeout)
      RUNTIME_TIMEOUT_SEC="${2:-}"
      shift
      ;;
    --timeout=*)
      RUNTIME_TIMEOUT_SEC="${1#*=}"
      ;;
    --max-lines)
      MAX_OUTPUT_LINES="${2:-}"
      shift
      ;;
    --max-lines=*)
      MAX_OUTPUT_LINES="${1#*=}"
      ;;
    --verbose)
      VERBOSE=1
      ;;
    --strict)
      STRICT=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[$APP] unknown option: $1" >&2
      echo >&2
      usage >&2
      exit 2
      ;;
  esac
  shift || true
done

[[ "$RUNTIME_TIMEOUT_SEC" =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "[$APP] invalid --timeout" >&2; exit 2; }
[[ "$MAX_OUTPUT_LINES" =~ ^[0-9]+$ ]] || { echo "[$APP] invalid --max-lines" >&2; exit 2; }

mapfile -t CANDIDATES < <(collect_candidates)

if ((${#CANDIDATES[@]} == 0)); then
  echo "[$APP] no candidates found under $ROOT_DIR" >&2
  exit 1
fi

printf "%s\n" "$APP"
printf "root: %s\n" "$ROOT_DIR"
printf "candidates: %d | static=%s runtime=%s | timeout=%ss\n" \
  "${#CANDIDATES[@]}" \
  "$([[ "$DO_STATIC" == 1 ]] && echo on || echo off)" \
  "$([[ "$DO_RUNTIME" == 1 ]] && echo on || echo off)" \
  "$RUNTIME_TIMEOUT_SEC"
if (( DO_RUNTIME == 1 && PROBE_MISSING == 0 )); then
  printf "runtime mode: safe (skip files without static --help marker)\n"
fi
echo
printf "%-6s %-6s %-7s %s\n" "OVER" "STAT" "RUN" "PATH"

pass_count=0
warn_count=0
fail_count=0
skip_runtime_count=0

for file in "${CANDIDATES[@]}"; do
  rel="${file#$ROOT_DIR/}"
  STATIC_STATUS="skip"
  STATIC_MARKERS=""
  STATIC_NOTE=""
  RUNTIME_STATUS="skip"
  RUNTIME_NOTE=""
  RUNTIME_OUTPUT=""

  (( DO_STATIC == 1 )) && static_scan "$file"
  (( DO_RUNTIME == 1 )) && runtime_probe "$file"

  over="$(overall_status)"
  case "$over" in
    pass) pass_count=$((pass_count + 1)) ;;
    warn) warn_count=$((warn_count + 1)) ;;
    fail) fail_count=$((fail_count + 1)) ;;
  esac
  [[ "$RUNTIME_STATUS" == "skip" ]] && skip_runtime_count=$((skip_runtime_count + 1))

  local_stat="$STATIC_STATUS"
  local_run="$RUNTIME_STATUS"
  (( DO_STATIC == 0 )) && local_stat="-"
  (( DO_RUNTIME == 0 )) && local_run="-"

  printf "%-6s %-6s %-7s %s\n" "$over" "$local_stat" "$local_run" "$rel"

  if (( VERBOSE == 1 )); then
    if [[ "$over" != "pass" || "$RUNTIME_STATUS" != "pass" ]]; then
      [[ -n "$STATIC_MARKERS" ]] && printf "  static markers: %s\n" "$STATIC_MARKERS"
      [[ -n "$STATIC_NOTE" ]] && printf "  static note   : %s\n" "$STATIC_NOTE"
      [[ -n "$RUNTIME_NOTE" ]] && printf "  runtime note  : %s\n" "$RUNTIME_NOTE"
      if [[ -n "$RUNTIME_OUTPUT" ]]; then
        printf "  runtime out   :\n"
        while IFS= read -r line; do
          printf "    %s\n" "$line"
        done <<<"$RUNTIME_OUTPUT"
      fi
    fi
  fi
done

echo
printf "summary: pass=%d warn=%d fail=%d" "$pass_count" "$warn_count" "$fail_count"
if (( DO_RUNTIME == 1 )); then
  printf " runtime-skipped=%d" "$skip_runtime_count"
fi
printf "\n"

if (( STRICT == 1 && fail_count > 0 )); then
  exit 1
fi
