# shellcheck shell=bash

ctl_choose_from_list() {
  local prompt="$1"
  shift
  local -a options=("$@")

  [[ "${#options[@]}" -gt 0 ]] || return 1
  ctl_can_prompt || return 1

  if ctl_has_usable_dev_tty; then
    exec 7</dev/tty 8>/dev/tty
    printf "%s\n" "$prompt" >&8
    local i=1
    local opt=""
    for opt in "${options[@]}"; do
      printf "  [%d] %s\n" "$i" "$opt" >&8
      i=$((i + 1))
    done
    printf "  [q] Cancel\n" >&8
    while true; do
      printf "> " >&8
      local reply=""
      IFS= read -r reply <&7 || { exec 7<&- 8>&-; return 1; }
      if [[ -z "$reply" || "$reply" =~ ^[qQ]$ ]]; then
        exec 7<&- 8>&-
        return 1
      fi
      if [[ "$reply" =~ ^[0-9]+$ ]] && (( reply >= 1 && reply <= ${#options[@]} )); then
        printf "%s\n" "${options[$((reply - 1))]}"
        exec 7<&- 8>&-
        return 0
      fi
      printf "Please enter 1..%d or q.\n" "${#options[@]}" >&8
    done
  fi

  ui_info "$prompt"
  select opt in "${options[@]}"; do
    if [[ -n "$opt" ]]; then
      printf "%s\n" "$opt"
      return 0
    fi
  done
  return 1
}

ui_title() {
  local title="${1:-ctl}"
  if has_gum && ctl_is_tty 1; then
    gum style --bold --border normal --padding "1 2" "$title"
  else
    msg "=== $title ==="
  fi
}

ui_info() {
  if has_gum && ctl_is_tty 1; then
    gum style --faint "$*"
  else
    msg "$*"
  fi
}

ui_ok() {
  local prefix="${CTL_UI_OK_PREFIX:-OK}"
  if has_gum && ctl_is_tty 1; then
    gum style --foreground 10 "$prefix $*"
  else
    msg "$prefix $*"
  fi
}

ui_err() {
  local prefix="${CTL_UI_ERR_PREFIX:-ERR}"
  if has_gum && ctl_is_tty 1; then
    gum style --foreground 9 "$prefix $*"
  else
    local app="${CTL_APP_PREFIX:-}"
    if [[ -n "$app" ]]; then
      printf "[%s] %s: %s\n" "$app" "$prefix" "$*" >&2
    else
      printf "%s: %s\n" "$prefix" "$*" >&2
    fi
  fi
}

ui_warn() {
  local prefix="${CTL_UI_WARN_PREFIX:-WARN}"
  if has_gum && ctl_is_tty 1; then
    gum style --foreground 11 "$prefix $*"
  else
    local app="${CTL_APP_PREFIX:-}"
    if [[ -n "$app" ]]; then
      printf "[%s] %s: %s\n" "$app" "$prefix" "$*" >&2
    else
      printf "%s: %s\n" "$prefix" "$*" >&2
    fi
  fi
}

ui_confirm() {
  if [[ "${CTL_ASSUME_YES:-0}" == "1" ]]; then
    return 0
  fi
  if [[ "${CTL_ASSUME_NO:-0}" == "1" ]]; then
    return 1
  fi

  if has_gum && ctl_can_prompt; then
    gum confirm "$@"
    return $?
  fi

  if ! ctl_can_prompt; then
    return 1
  fi

  local q="$*"
  if [[ -z "$q" ]]; then
    q="Continue"
  fi
  local reply
  if [[ -t 0 ]]; then
    read -r -p "$q (y/N) " reply || return 1
  elif [[ -r /dev/tty && -w /dev/tty ]]; then
    read -r -p "$q (y/N) " reply </dev/tty >/dev/tty || return 1
  else
    return 1
  fi
  [[ "$reply" =~ ^[Yy]$ ]]
}

ui_input() {
  local prompt="$1"
  local default="${2:-}"
  if has_gum && ctl_can_prompt; then
    if [[ -n "$default" ]]; then
      gum input --prompt "$prompt " --value "$default"
    else
      gum input --prompt "$prompt "
    fi
    return $?
  fi

  if ctl_can_prompt; then
    ctl_readline "$prompt" "$default"
    return $?
  fi

  if [[ -n "$default" ]]; then
    printf "%s\n" "$default"
    return 0
  fi
  return 1
}

ui_pause() {
  local prompt="${1:-Press Enter to continue...}"
  if has_gum && ctl_can_prompt; then
    gum input --prompt "$prompt " --value "" >/dev/null 2>&1 || true
    return 0
  fi
  if ctl_can_prompt; then
    ctl_readline "$prompt" "" >/dev/null || true
  fi
}
