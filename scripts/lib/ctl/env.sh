# shellcheck shell=bash

load_env_file_if_present() {
  local f="$1"
  [[ -n "$f" ]] || return 0
  [[ -f "$f" ]] || return 0
  local was_allexport=0
  if shopt -qo allexport; then
    was_allexport=1
  fi
  # shellcheck disable=SC1090
  set -a
  source "$f"
  if (( ! was_allexport )); then
    set +a
  fi
}
