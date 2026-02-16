# shellcheck shell=bash

msg() {
  local app="${CTL_APP_PREFIX:-}"
  if [[ -n "$app" ]]; then
    printf "[%s] %s\n" "$app" "$*"
  else
    printf "%s\n" "$*"
  fi
}

warn() {
  local app="${CTL_APP_PREFIX:-}"
  if [[ -n "$app" ]]; then
    printf "[%s] WARN: %s\n" "$app" "$*" >&2
  else
    printf "WARN: %s\n" "$*" >&2
  fi
}

die() {
  local app="${CTL_APP_PREFIX:-}"
  if [[ -n "$app" ]]; then
    printf "[%s] ERR: %s\n" "$app" "$*" >&2
  else
    printf "ERR: %s\n" "$*" >&2
  fi
  exit 1
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }
has_gum() { command -v gum >/dev/null 2>&1; }
has_fzf() { command -v fzf >/dev/null 2>&1; }
has_jq() { command -v jq >/dev/null 2>&1; }

need_cmd() {
  local cmd="${1:-}"
  local hint="${2:-}"
  command -v "$cmd" >/dev/null 2>&1 || {
    if [[ -n "$hint" ]]; then
      ui_err "Missing: $cmd ($hint)"
    else
      ui_err "Missing: $cmd"
    fi
    exit 1
  }
}
