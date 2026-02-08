#!/usr/bin/env bash
set -euo pipefail

# Shared helpers for Core4 *ctl scripts.
# Generic UI/env helpers live in `scripts/ctl-lib.sh`.

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd -P)"

# shellcheck disable=SC1090
source "$ROOT_DIR/scripts/ctl-lib.sh"

: "${CTL_CHOOSE_PROMPT:=core4ctl}"
: "${CTL_CHOOSE_PREFER:=fzf}"

core4_load_env() {
  # Optional global env (safe to ignore if missing).
  load_env_file_if_present "${AOS_ENV_FILE:-$HOME/.env/aos.env}" || true
  load_env_file_if_present "${AOS_CORE4_ENV_FILE:-$HOME/.env/core4.env}" || true
}

core4_recompute_config() {
  HUB_DIR="${AOS_HUB_DIR:-$ROOT_DIR}"
  CORE4_TRACKER="${CORE4_TRACKER:-$HUB_DIR/python-core4/tracker.py}"

  UNIT_SRC_DIR="${HUB_DIR}/systemd"
  UNIT_DST_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

  CORE4_LOCAL_DIR="${AOS_CORE4_LOCAL_DIR:-$HOME/AlphaOS-Vault/Core4}"
  CORE4_MOUNT_DIR="${AOS_CORE4_MOUNT_DIR:-$HOME/AlphaOS-Vault/Alpha_Core4}"
  CORE4_REMOTE="${AOS_VAULT_REMOTE_CORE4:-eldanioo:Alpha_Core4}"
  CORE4_MOUNT_SERVICE="${AOS_CORE4_MOUNT_SERVICE:-rclone-alpha-core4.service}"
}

have() { command -v "$1" >/dev/null 2>&1; }

need_core4_tracker() {
  if [[ ! -x "$CORE4_TRACKER" ]]; then
    die "core4 tracker not executable: $CORE4_TRACKER"
  fi
}

need_core4_seeder() {
  CORE4_SEEDER="${CORE4_SEEDER:-$HUB_DIR/python-core4/seed_week.py}"
  if [[ ! -f "$CORE4_SEEDER" ]]; then
    die "core4 seeder not found: $CORE4_SEEDER"
  fi
  if ! command -v python3 &>/dev/null; then
    die "python3 required for seed_week.py"
  fi
}

notify_tele() {
  local msg="$1"
  if command -v tele >/dev/null 2>&1; then
    tele -s "$msg" &
  fi
}

run_rclone_copy() {
  local label="$1"
  local src="$2"
  local dst="$3"
  shift 3

  local rclone_bin
  rclone_bin="${AOS_RCLONE_BIN:-$(command -v rclone || true)}"
  if [[ -z "${rclone_bin:-}" || ! -x "$rclone_bin" ]]; then
    die "rclone not found"
  fi

  local output rc=0
  output="$(
    "$rclone_bin" copy "$src" "$dst" "$@" \
      --stats=1s \
      --stats-one-line \
      --contimeout 5s \
      --timeout 30s \
      --retries 1 \
      --low-level-retries 1 \
      2>&1
  )" || rc=$?

  if [[ "$rc" -ne 0 ]]; then
    printf "%s\n" "$output" >&2
    return "$rc"
  fi

  # Best-effort signal only (for debugging): if something was transferred, send a silent proof.
  local last transferred
  last="$(printf "%s\n" "$output" | tail -n 1)"
  transferred="$(printf "%s\n" "$last" | sed -n 's/.*Transferred:[[:space:]]*\\([0-9][0-9]*\\).*/\\1/p')"
  if [[ -n "${transferred:-}" && "$transferred" != "0" ]]; then
    notify_tele "Core4 ${label}: transferred ${transferred}"
  fi
  return 0
}

vaultctl_cmd() {
  local repo_vaultctl="${HUB_DIR}/scripts/sync-utils/vaultctl"
  local repo_alt="${HUB_DIR}/scripts/utils/vaultctl"
  if [[ -x "$repo_vaultctl" ]]; then
    echo "$repo_vaultctl"
    return 0
  fi
  if [[ -x "$repo_alt" ]]; then
    echo "$repo_alt"
    return 0
  fi
  if have vaultctl; then
    echo "vaultctl"
    return 0
  fi
  if [[ -x "$HOME/.dotfiles/bin/vaultctl" ]]; then
    echo "$HOME/.dotfiles/bin/vaultctl"
    return 0
  fi
  return 1
}

