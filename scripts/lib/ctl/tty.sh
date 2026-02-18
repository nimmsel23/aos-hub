# shellcheck shell=bash

ctl_is_tty() {
  local fd="${1:-1}"
  [[ -t "$fd" ]]
}

ctl_has_usable_dev_tty() {
  [[ -e /dev/tty ]] || return 1
  if { : < /dev/tty; } 2>/dev/null && { : > /dev/tty; } 2>/dev/null; then
    return 0
  fi
  return 1
}

ctl_can_prompt() {
  [[ -t 0 && -t 1 ]] || ctl_has_usable_dev_tty
}

ctl_readline() {
  local prompt="${1:-}"
  local default="${2:-}"
  local reply=""

  if [[ -t 0 ]]; then
    if [[ -n "$default" ]]; then
      read -r -p "$prompt [$default]: " reply || return 1
      printf "%s\n" "${reply:-$default}"
    else
      read -r -p "$prompt: " reply || return 1
      printf "%s\n" "$reply"
    fi
    return 0
  fi

  if [[ -r /dev/tty && -w /dev/tty ]]; then
    if [[ -n "$default" ]]; then
      read -r -p "$prompt [$default]: " reply </dev/tty >/dev/tty || return 1
      printf "%s\n" "${reply:-$default}"
    else
      read -r -p "$prompt: " reply </dev/tty >/dev/tty || return 1
      printf "%s\n" "$reply"
    fi
    return 0
  fi

  return 1
}

ctl_read_key_timed() {
  local timeout="${1:-1}"
  local outvar="${2:-CTL_KEY}"
  # NOTE: internal var is _ctl_key (not "key") so printf -v "$outvar" can
  # reach the *caller's* variable via bash dynamic scoping.
  local _ctl_key="" _ctl_stty="" _ctl_rc=1

  _ctl_read_raw() {
    local _fd="${1:-0}"
    _ctl_stty="$(stty -g <&"$_fd" 2>/dev/null)" || _ctl_stty=""
    [[ -n "$_ctl_stty" ]] && stty -icanon -echo min 1 time 0 <&"$_fd" 2>/dev/null || true
    if IFS= read -r -t "$timeout" -n 1 _ctl_key <&"$_fd" 2>/dev/null; then
      _ctl_rc=0
    fi
    [[ -n "$_ctl_stty" ]] && stty "$_ctl_stty" <&"$_fd" 2>/dev/null || true
  }

  if [[ -t 0 ]]; then
    _ctl_read_raw 0
  elif [[ -r /dev/tty ]]; then
    exec 9</dev/tty 2>/dev/null && { _ctl_read_raw 9; exec 9<&-; } || true
  fi

  if [[ $_ctl_rc -eq 0 ]]; then
    printf -v "$outvar" "%s" "$_ctl_key"
    return 0
  fi
  return 1
}

ctl_pause_return() {
  if [[ -t 0 && -t 1 ]]; then
    msg ""
    msg "Press Enter to return..."
    read -r _ || true
  elif ctl_can_prompt; then
    ui_pause "Press Enter to return"
  fi
}
