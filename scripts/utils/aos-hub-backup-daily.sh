#!/usr/bin/env bash
set -euo pipefail

SRC="/home/alpha/aos-hub"
USB_MOUNT="/mnt/eos-usb"
DST_SUBVOL="${USB_MOUNT}/@aos-hub"
CONFIG="/etc/aos-backup.conf"
BAK_RETENTION_DAYS=0

if [[ -f "${CONFIG}" ]]; then
  # shellcheck disable=SC1090
  source "${CONFIG}"
fi

if ! mountpoint -q "${USB_MOUNT}"; then
  echo "${USB_MOUNT} is not mounted; skipping daily backup."
  exit 0
fi

if [[ ! -d "${SRC}" ]]; then
  echo "Source missing: ${SRC}"
  exit 1
fi

stamp=$(date +%Y%m%d-%H%M)

move_symlink_dir_conflicts() {
  local src="$1"
  local dst="$2"
  local ts="$3"

  while IFS= read -r -d '' link; do
    local rel="${link#"$src"/}"
    local dst_path="${dst}/${rel}"
    [[ -e "$dst_path" ]] || continue

    # Common rsync failure mode: source is symlink, destination is non-empty directory.
    if [[ -L "$link" && -d "$dst_path" && ! -L "$dst_path" ]]; then
      local backup_path="${dst_path}.bak-${ts}-prelink"
      local i=1
      while [[ -e "$backup_path" ]]; do
        backup_path="${dst_path}.bak-${ts}-prelink-${i}"
        i=$((i + 1))
      done
      echo "Moving stale directory aside: ${dst_path} -> ${backup_path}"
      mv "$dst_path" "$backup_path"
    fi
  done < <(find "$src" -type l -print0)
}

move_symlink_dir_conflicts "${SRC}" "${DST_SUBVOL}" "${stamp}"

rsync -a --backup --suffix=".bak-${stamp}" "${SRC}/" "${DST_SUBVOL}/"

if (( BAK_RETENTION_DAYS > 0 )); then
  find "${DST_SUBVOL}" -type f -name '*.bak-*' -mtime "+${BAK_RETENTION_DAYS}" -delete
fi
