# shellcheck shell=bash

ui_menu_gum() {
  local prompt="$1"
  shift || true
  local -a options=("$@")
  [[ "${#options[@]}" -gt 0 ]] || return 1
  has_gum || return 1
  ctl_can_prompt || return 1
  gum choose --header="$prompt" "${options[@]}"
}
