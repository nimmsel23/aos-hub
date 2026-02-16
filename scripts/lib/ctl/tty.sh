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
  local key=""

  if [[ -t 0 ]]; then
    if read -r -t "$timeout" -n 1 key; then
      printf -v "$outvar" "%s" "$key"
      return 0
    fi
    return 1
  fi

  if [[ -r /dev/tty && -w /dev/tty ]]; then
    if read -r -t "$timeout" -n 1 key </dev/tty >/dev/tty; then
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
