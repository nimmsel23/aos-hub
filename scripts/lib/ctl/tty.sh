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
  local key="" old_stty="" rc=1

  _ctl_raw_read() {
    local _fd_in="${1:-0}" _fd_out="${2:-1}"
    old_stty="$(stty -g <&"$_fd_in" 2>/dev/null)" || old_stty=""
    stty -echo raw <&"$_fd_in" 2>/dev/null || true
    if read -r -t "$timeout" -n 1 key <&"$_fd_in"; then
      rc=0
    fi
    [[ -n "$old_stty" ]] && stty "$old_stty" <&"$_fd_in" 2>/dev/null || true
    return $rc
  }

  if [[ -t 0 ]]; then
    _ctl_raw_read 0 1
    if [[ $rc -eq 0 ]]; then
      printf -v "$outvar" "%s" "$key"
      return 0
    fi
    return 1
  fi

  if [[ -r /dev/tty && -w /dev/tty ]]; then
    exec 9</dev/tty
    _ctl_raw_read 9 9
    exec 9<&-
    if [[ $rc -eq 0 ]]; then
      printf -v "$outvar" "%s" "$key"
      return 0
    fi
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
