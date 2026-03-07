# shellcheck shell=bash

ui_choose() {
  local prompt="$1"
  shift
  local -a options=("$@")
  [[ "${#options[@]}" -gt 0 ]] || return 1

  local prefer="${CTL_CHOOSE_PREFER:-fzf}"
  local allow_noninteractive="${CTL_CHOOSE_ALLOW_NONINTERACTIVE:-0}"
  local default_value="${CTL_CHOOSE_DEFAULT:-}"
  local default_index="${CTL_CHOOSE_INDEX:-1}"

  if [[ "$prefer" == "gum" ]]; then
    if ui_menu_gum "$prompt" "${options[@]}"; then
      return 0
    fi
    if ui_menu_fzf "$prompt" "${options[@]}"; then
      return 0
    fi
  else
    if ui_menu_fzf "$prompt" "${options[@]}"; then
      return 0
    fi
    if ui_menu_gum "$prompt" "${options[@]}"; then
      return 0
    fi
  fi

  if [[ "$allow_noninteractive" == "1" ]] && ! ctl_can_prompt; then
    if [[ -n "$default_value" ]]; then
      local candidate=""
      for candidate in "${options[@]}"; do
        if [[ "$candidate" == "$default_value" ]]; then
          printf "%s\n" "$candidate"
          return 0
        fi
      done
    fi

    if [[ "$default_index" =~ ^[0-9]+$ ]] && (( default_index >= 1 && default_index <= ${#options[@]} )); then
      printf "%s\n" "${options[$((default_index - 1))]}"
      return 0
    fi
    return 1
  fi

  ctl_choose_from_list "$prompt" "${options[@]}"
}

choose() {
  local prompt="${CTL_CHOOSE_PROMPT:-select}"
  ui_choose "$prompt" "$@"
}
