#!/usr/bin/env bash

# Shared env loader for aos-hub ctl scripts.
#
# Convention:
# - Preferred:  <repo>/.env/aos.env  (repo ships `.env` as a symlink to `~/.env`)
# - Fallback:   ~/.env/aos.env
#
# Override:
# - `AOS_ENV_FILE=/path/to/file` (explicit)
# - Script flags may pass an explicit env file to `aos_env_load <file> <root>`
#
# Behavior:
# - If an explicit file is provided and missing -> returns non-zero.
# - If no explicit file is provided and no default exists -> no-op (success).
# - Uses "allexport" while sourcing so keys become exported environment variables.

AOS_ENV_LOAD_ERROR=""

aos_env_expand_path() {
  local raw="${1-}"
  local root_dir="${2-}"
  local out="$raw"

  if [[ -z "$out" ]]; then
    printf "%s\n" ""
    return 0
  fi

  case "$out" in
    "~") out="$HOME" ;;
    "~/"*) out="$HOME/${out#~/}" ;;
  esac

  if [[ "$out" != /* && -n "$root_dir" ]]; then
    out="$root_dir/$out"
  fi

  printf "%s\n" "$out"
}

aos_env_resolve_file() {
  local explicit_file="${1-}"
  local root_dir="${2-}"

  if [[ -n "$explicit_file" ]]; then
    aos_env_expand_path "$explicit_file" "$root_dir"
    return 0
  fi

  if [[ -n "${AOS_ENV_FILE:-}" ]]; then
    aos_env_expand_path "${AOS_ENV_FILE}" "$root_dir"
    return 0
  fi

  if [[ -n "$root_dir" && -f "$root_dir/.env/aos.env" ]]; then
    printf "%s\n" "$root_dir/.env/aos.env"
    return 0
  fi

  if [[ -f "${HOME}/.env/aos.env" ]]; then
    printf "%s\n" "${HOME}/.env/aos.env"
    return 0
  fi

  printf "%s\n" ""
}

aos_env_default_vault_dir() {
  local -a candidates=(
    "${HOME}/vault"
    "${HOME}/vault"
    "${HOME}/Dokumente/vault"
    "${HOME}/vault"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -d "$c" || -L "$c" ]]; then
      printf "%s\n" "$c"
      return 0
    fi
  done
  printf "%s\n" "${HOME}/vault"
}

aos_env_apply_defaults() {
  if [[ -z "${AOS_VAULT_DIR:-}" ]]; then
    export AOS_VAULT_DIR
    AOS_VAULT_DIR="$(aos_env_default_vault_dir)"
  fi
  if [[ -z "${AOS_VAULT_ROOT:-}" ]]; then
    export AOS_VAULT_ROOT="$AOS_VAULT_DIR"
  fi
  if [[ -z "${AOS_RCLONE_LOCAL:-}" ]]; then
    export AOS_RCLONE_LOCAL="$AOS_VAULT_DIR"
  fi
}

aos_env_load() {
  local explicit_file="${1-}"
  local root_dir="${2-}"

  AOS_ENV_LOAD_ERROR=""
  if [[ "${AOS_ENV_DISABLE:-0}" == "1" ]]; then
    return 0
  fi

  local f
  f="$(aos_env_resolve_file "$explicit_file" "$root_dir")"
  export AOS_ENV_FILE_CANDIDATE="$f"

  if [[ -z "$f" ]]; then
    if [[ "${AOS_ENV_REQUIRE:-0}" == "1" ]]; then
      AOS_ENV_LOAD_ERROR="env file required but no default was found"
      return 2
    fi
    aos_env_apply_defaults
    return 0
  fi

  if [[ ! -f "$f" ]]; then
    AOS_ENV_LOAD_ERROR="env file not found: $f"
    return 2
  fi

  if [[ "${AOS_ENV_RELOAD:-0}" != "1" && "${AOS_ENV_FILE_EFFECTIVE:-}" == "$f" && "${AOS_ENV_LOADED:-0}" == "1" ]]; then
    return 0
  fi

  local was_allexport=0
  if shopt -qo allexport; then
    was_allexport=1
  fi

  set -a
  # shellcheck disable=SC1090
  if ! source "$f"; then
    AOS_ENV_LOAD_ERROR="failed to source env file: $f"
    if (( ! was_allexport )); then
      set +a
    fi
    return 3
  fi
  if (( ! was_allexport )); then
    set +a
  fi

  export AOS_ENV_FILE_EFFECTIVE="$f"
  export AOS_ENV_LOADED=1
  aos_env_apply_defaults
  return 0
}

aos_env_status() {
  printf "AOS_ENV_FILE_EFFECTIVE=%s\n" "${AOS_ENV_FILE_EFFECTIVE:-}"
  printf "AOS_ENV_FILE_CANDIDATE=%s\n" "${AOS_ENV_FILE_CANDIDATE:-}"
  printf "AOS_ENV_LOADED=%s\n" "${AOS_ENV_LOADED:-0}"
  if [[ -n "${AOS_ENV_LOAD_ERROR:-}" ]]; then
    printf "AOS_ENV_LOAD_ERROR=%s\n" "${AOS_ENV_LOAD_ERROR}"
  fi
}
