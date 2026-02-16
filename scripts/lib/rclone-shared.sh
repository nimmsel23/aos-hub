#!/usr/bin/env bash

# Shared rclone helpers for *ctl scripts.
# Keep this file side-effect free (functions only).

RCLONE_SHARED_ERROR=""

rclone_shared_has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

rclone_shared_has_remote_prefix() {
  local p="${1:-}"
  [[ "$p" == *:* ]]
}

rclone_shared_is_remote_root() {
  # Examples:
  #   eldanioo:
  #   eldanioo:/
  local p="${1:-}"
  [[ "$p" =~ ^[^:]+:(/)?$ ]]
}

rclone_shared_remote_name() {
  local p="${1:-}"
  if rclone_shared_has_remote_prefix "$p"; then
    printf "%s\n" "${p%%:*}"
    return 0
  fi
  printf "%s\n" "$p"
}

rclone_shared_remote_root() {
  local p="${1:-}"
  local name
  name="$(rclone_shared_remote_name "$p")"
  [[ -n "$name" ]] || return 1
  printf "%s:\n" "$name"
}

rclone_shared_require() {
  local bin="${1:-}"
  local cfg="${2:-}"
  RCLONE_SHARED_ERROR=""

  if [[ -z "$bin" || ! -x "$bin" ]]; then
    RCLONE_SHARED_ERROR="rclone not found in PATH"
    return 1
  fi
  if [[ -z "$cfg" || ! -f "$cfg" ]]; then
    RCLONE_SHARED_ERROR="rclone config missing: $cfg"
    return 2
  fi
  return 0
}

rclone_shared_list_remotes() {
  local bin="${1:-}"
  local cfg="${2:-}"
  "$bin" --config "$cfg" listremotes
}

rclone_shared_about() {
  local bin="${1:-}"
  local cfg="${2:-}"
  local remote="${3:-}"
  "$bin" --config "$cfg" about "$remote"
}

rclone_shared_lsf_root() {
  local bin="${1:-}"
  local cfg="${2:-}"
  local remote="${3:-}"
  "$bin" --config "$cfg" lsf "$remote" --max-depth 1
}

rclone_shared_reconnect() {
  local bin="${1:-}"
  local cfg="${2:-}"
  local remote_hint="${3:-}"
  local remote_root
  remote_root="$(rclone_shared_remote_root "$remote_hint")" || return 2
  "$bin" --config "$cfg" config reconnect "$remote_root"
}
