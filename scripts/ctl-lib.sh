#!/usr/bin/env bash
set -euo pipefail

# Shared helpers for *ctl scripts (UI, env, curl).
# Keep this generic: no component-specific logic.

msg() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERR: %s\n" "$*" >&2; exit 1; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }
has_gum() { command -v gum >/dev/null 2>&1; }
has_fzf() { command -v fzf >/dev/null 2>&1; }

ui_title() {
  local title="${1:-ctl}"
  if has_gum; then
    gum style --bold --border normal --padding "1 2" "$title"
  else
    msg "=== $title ==="
  fi
}

ui_info() {
  if has_gum; then
    gum style --faint "$*"
  else
    msg "$*"
  fi
}

ui_ok() {
  local prefix="${CTL_UI_OK_PREFIX:-OK}"
  if has_gum; then
    gum style --foreground 10 "$prefix $*"
  else
    msg "$prefix $*"
  fi
}

ui_err() {
  local prefix="${CTL_UI_ERR_PREFIX:-ERR}"
  if has_gum; then
    gum style --foreground 9 "$prefix $*"
  else
    warn "$prefix $*"
  fi
}

ui_warn() {
  local prefix="${CTL_UI_WARN_PREFIX:-WARN}"
  if has_gum; then
    gum style --foreground 11 "$prefix $*"
  else
    warn "$prefix $*"
  fi
}

ui_confirm() {
  if has_gum; then
    gum confirm "$@"
  else
    read -p "$* (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
  fi
}

ui_input() {
  local prompt="$1"
  local default="${2:-}"
  if has_gum; then
    if [[ -n "$default" ]]; then
      gum input --prompt "$prompt " --value "$default"
    else
      gum input --prompt "$prompt "
    fi
  else
    if [[ -n "$default" ]]; then
      read -p "$prompt [$default]: " -r
      echo "${REPLY:-$default}"
    else
      read -p "$prompt: " -r
      echo "$REPLY"
    fi
  fi
}

ui_choose() {
  local prompt="$1"
  shift
  local options=("$@")
  local prefer="${CTL_CHOOSE_PREFER:-fzf}"

  if [[ "$prefer" == "gum" ]]; then
    if has_gum; then
      gum choose --header="$prompt" "${options[@]}"
      return 0
    fi
    if has_fzf; then
      printf '%s\n' "${options[@]}" | fzf --prompt="$prompt > " --height=~50% --border
      return 0
    fi
  else
    if has_fzf; then
      printf '%s\n' "${options[@]}" | fzf --prompt="$prompt > " --height=~50% --border
      return 0
    fi
    if has_gum; then
      gum choose --header="$prompt" "${options[@]}"
      return 0
    fi
  fi

  ui_info "$prompt"
  select opt in "${options[@]}"; do
    if [[ -n "$opt" ]]; then
      echo "$opt"
      return 0
    fi
  done
}

choose() {
  local prompt="${CTL_CHOOSE_PROMPT:-select}"
  ui_choose "$prompt" "$@"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    ui_err "Missing: $1"
    exit 1
  }
}

load_env_file_if_present() {
  local f="$1"
  [[ -n "$f" ]] || return 0
  [[ -f "$f" ]] || return 0
  # shellcheck disable=SC1090
  set -a; source "$f"; set +a
}

format_json() {
  if has_cmd jq; then
    jq -C . 2>/dev/null || cat
  elif has_cmd python; then
    python -m json.tool
  else
    cat
  fi
}

curl_json() {
  local url="$1"
  need_cmd curl
  curl -fsS "$url" 2>&1 || return 1
}

curl_json_post() {
  local url="$1"
  need_cmd curl
  curl -fsS -X POST "$url" 2>&1 || return 1
}

curl_json_post_data() {
  local url="$1"
  local data="$2"
  need_cmd curl
  curl -fsS -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>&1 || return 1
}
