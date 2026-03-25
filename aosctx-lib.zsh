#!/usr/bin/env zsh

# Shared helper library for doorctx and gamectx.
# Contains UI primitives and common utilities extracted from both scripts.
#
# Callers should set these variables before sourcing:
#   CTX_NAME            - Prefix for error messages (default: "aosctx")
#   CTX_DEFAULT_SERVICE - Service name fallback (e.g., "aos-doorctx.service")
#   CTX_DEFAULT_URL     - URL fallback (e.g., "http://127.0.0.1:8786/")

# Guard against multiple sourcing
[[ -n "${_AOSCTX_LIB_LOADED:-}" ]] && return 0
_AOSCTX_LIB_LOADED=1

# Error handler with context-aware prefix
die() {
  printf "[%s] %s\n" "${CTX_NAME:-aosctx}" "$*" >&2
  exit 1
}

# Check if a command exists
have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# Check if stdin/stdout are TTY (interactive prompt possible)
can_prompt() {
  [[ -t 0 && -t 1 ]]
}

# Resolve a binary to its full path (configured or fallback to PATH)
resolve_bin() {
  local configured="${1:?configured path}"
  local fallback_name="${2:?fallback name}"
  local found=""

  if [[ -x "$configured" ]]; then
    printf "%s\n" "$configured"
    return 0
  fi

  found="$(command -v "$fallback_name" 2>/dev/null || true)"
  [[ -n "$found" ]] || return 1
  printf "%s\n" "$found"
}

# Print a cyan title line
title() {
  print -P "%F{cyan}==%f %B$1%b %F{cyan}==%f"
}

# Print muted (gray) text
muted() {
  print -P "%F{244}$1%f"
}

# Pause screen if interactive (press Enter to continue)
pause_screen() {
  can_prompt || return 0
  printf "Press Enter to continue..."
  read -r _ || true
}

# Clear screen if interactive (ANSI clear)
clear_screen() {
  can_prompt || return 0
  printf '\033c'
}

# Extract a field from runtime status text using awk
# Usage: runtime_field LABEL [OCCURRENCE] [TEXT]
runtime_field() {
  local label="${1:?label}"
  local occurrence="${2:-1}"
  local text="${3:-}"
  printf "%s\n" "$text" | awk -v label="$label" -v occurrence="$occurrence" '
    $0 ~ ("^" label "[[:space:]]*:") {
      count++
      if (count == occurrence) {
        sub("^[^:]*:[[:space:]]*", "")
        print
        exit
      }
    }
  '
}

# Render a runtime summary box with service and health status
# Expects caller to set CTX_DEFAULT_SERVICE and CTX_DEFAULT_URL
render_runtime_summary() {
  local status_text
  local service_name
  local service_state
  local boot_state
  local health_state
  local url

  status_text="$(runtime_status_text)"
  service_name="$(runtime_field service 1 "$status_text")"
  service_state="$(runtime_field service 2 "$status_text")"
  boot_state="$(runtime_field boot 1 "$status_text")"
  health_state="$(runtime_field health 1 "$status_text")"
  url="$(runtime_field url 1 "$status_text")"

  printf "Runtime: %s (%s)  boot=%s  health=%s\n" \
    "${service_state:-unknown}" \
    "${service_name:-$CTX_DEFAULT_SERVICE}" \
    "${boot_state:-unknown}" \
    "${health_state:-unknown}"
  printf "PWA URL:  %s\n" "${url:-$CTX_DEFAULT_URL}"
}

# Run a screen with a heading and pause at the end
# Usage: run_screen HEADING COMMAND [ARGS...]
run_screen() {
  local heading="${1:?heading}"
  shift
  clear_screen
  title "$heading"
  "$@"
  echo
  pause_screen
}

# Prompt user for input with an optional default value
# Usage: prompt_with_default PROMPT [DEFAULT_VALUE]
prompt_with_default() {
  local prompt="${1:?prompt}"
  local default_value="${2:-}"
  local value=""

  if [[ -n "$default_value" ]]; then
    printf "%s [%s]: " "$prompt" "$default_value"
  else
    printf "%s: " "$prompt"
  fi

  read -r value || return 1
  printf "%s\n" "${value:-$default_value}"
}
