#!/usr/bin/env bash
set -euo pipefail

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

TASK_BIN="${AOS_TASK_BIN:-${TASK_BIN:-task}}"
TASKRC_PATH="${AOS_TASKRC:-${TASKRC:-}}"
EXPORT_FILTER="${AOS_TASK_EXPORT_FILTER:-${TASK_EXPORT_FILTER:-status:pending}}"
OUT_PATH="${AOS_TASK_EXPORT_PATH:-${TASK_EXPORT:-$HOME/.local/share/alphaos/task_export.json}}"
VAULT_PATH="${AOS_TASK_EXPORT_VAULT_PATH:-$HOME/AlphaOS-Vault/.alphaos/task_export.json}"
COPY_TO_VAULT="${AOS_TASK_EXPORT_COPY_TO_VAULT:-1}"

need_cmd "$TASK_BIN" || die "taskwarrior not found: $TASK_BIN"
need_cmd python3 || die "python3 not found"

if [[ -n "$TASKRC_PATH" ]]; then
  export TASKRC="$TASKRC_PATH"
fi

mkdir -p "$(dirname "$OUT_PATH")"

tmp="$(mktemp "${OUT_PATH}.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

args=("$TASK_BIN" "rc.verbose=0" "rc.confirmation=no")
if [[ -n "$EXPORT_FILTER" ]]; then
  # shellcheck disable=SC2206
  args+=($EXPORT_FILTER)
fi
args+=("export")

if ! "${args[@]}" >"$tmp"; then
  die "task export failed"
fi

if ! python3 -c 'import json,sys; json.load(open(sys.argv[1], "r", encoding="utf-8"))' "$tmp" >/dev/null 2>&1; then
  die "invalid JSON from task export"
fi

mv -f "$tmp" "$OUT_PATH"
trap - EXIT

msg "✅ Wrote: $OUT_PATH"

if [[ "$COPY_TO_VAULT" == "1" ]]; then
  if [[ "$VAULT_PATH" == *"/"* ]]; then
    mkdir -p "$(dirname "$VAULT_PATH")"
  fi
  if cp -f "$OUT_PATH" "$VAULT_PATH" 2>/dev/null; then
    msg "✅ Copied: $VAULT_PATH"
  else
    warn "Vault copy failed: $VAULT_PATH"
  fi
fi
