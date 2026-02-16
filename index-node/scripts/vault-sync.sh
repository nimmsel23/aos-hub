#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-bisync}" # pull | push | bisync
ALLOW_PULL="${VAULT_ALLOW_PULL:-${AOS_ALLOW_PULL:-0}}"

# Local vault path priority:
#   1) explicit VAULT_LOCAL
#   2) shared aos env (AOS_VAULT_DIR / AOS_VAULT_ROOT)
#   3) legacy default
LOCAL="${VAULT_LOCAL:-${AOS_VAULT_DIR:-${AOS_VAULT_ROOT:-$HOME/AlphaOS-Vault}}}"
REMOTE="${VAULT_REMOTE:-fabian:AlphaOS-Vault}"
REMOTE_BACKUP="${VAULT_REMOTE_BACKUP:-fabian:AlphaOS-Vault-backups}"
LOCAL_BACKUP="${VAULT_LOCAL_BACKUP:-$HOME/.local/share/alphaos/vault-backups}"
RCLONE_FLAGS="${VAULT_RCLONE_FLAGS:---skip-links}"

STAMP="$(date +%Y%m%d-%H%M%S)"

canonical_path() {
  local p="$1"
  readlink -f "$p" 2>/dev/null || echo "$p"
}

write_probe_local() {
  local dir="$1"
  local probe="$dir/.vault-sync-write-probe.$$"
  if ! : >"$probe" 2>/dev/null; then
    echo "vault-sync: local path is not writable: $dir" >&2
    return 1
  fi
  rm -f "$probe"
}

assert_no_ro_mounts_under_local() {
  local mode="$1"
  local base="$2"

  case "$mode" in
    pull|bisync) ;;
    *) return 0 ;;
  esac

  local base_canon
  base_canon="$(canonical_path "$base")"

  local -a ro_mounts=()
  local src mnt fstype opts _
  while read -r src mnt fstype opts _; do
    mnt="${mnt//\\040/ }"
    [[ "$mnt" == "$base_canon" || "$mnt" == "$base_canon/"* ]] || continue
    [[ ",$opts," == *,ro,* ]] || continue
    ro_mounts+=("$mnt ($fstype)")
  done </proc/mounts

  if [[ ${#ro_mounts[@]} -gt 0 ]]; then
    echo "vault-sync: refusing '$mode' because read-only mounts exist under local vault:" >&2
    printf "  - %s\n" "${ro_mounts[@]}" >&2
    echo "vault-sync: disable/unmount those mounts first (for example: mountctl disable all)." >&2
    return 1
  fi
}

require_mode_allowed() {
  local mode="$1"
  case "$mode" in
    pull|bisync)
      if [[ "$ALLOW_PULL" != "1" ]]; then
        echo "vault-sync: '$mode' is disabled by default (set VAULT_ALLOW_PULL=1 to override intentionally)." >&2
        return 1
      fi
      ;;
    *) ;;
  esac
}

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone not found in PATH" >&2
  exit 1
fi

mkdir -p "$LOCAL_BACKUP"
mkdir -p "$LOCAL"

require_mode_allowed "$MODE"
assert_no_ro_mounts_under_local "$MODE" "$LOCAL"
if [[ "$MODE" == "pull" || "$MODE" == "bisync" ]]; then
  write_probe_local "$LOCAL"
fi

case "$MODE" in
  pull)
    # Remote → Local, keep local overwritten/deleted files in a dated local backup folder
    BACKUP_DIR="${LOCAL_BACKUP}/pull-${STAMP}"
    mkdir -p "$BACKUP_DIR"
    exec rclone copy "$REMOTE" "$LOCAL" \
      --create-empty-src-dirs \
      --update \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR"
    ;;
  push)
    # Local → Remote, keep remote-overwritten/deleted files in a dated remote backup folder
    BACKUP_DIR="${REMOTE_BACKUP}/push-${STAMP}"
    exec rclone copy "$LOCAL" "$REMOTE" \
      --create-empty-src-dirs \
      --update \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR"
    ;;
  bisync|*)
    # Two-way sync with backup on remote, prefer newer files on conflicts
    BACKUP_DIR="${REMOTE_BACKUP}/bisync-${STAMP}"
    exec rclone bisync "$LOCAL" "$REMOTE" \
      --create-empty-src-dirs \
      $RCLONE_FLAGS \
      --backup-dir "$BACKUP_DIR" \
      --check-sync \
      --conflict-resolve newer \
      --track-renames \
      --resilient
    ;;
esac
