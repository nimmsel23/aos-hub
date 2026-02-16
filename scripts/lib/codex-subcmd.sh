# codex-subcmd.sh
# Shared helper to add a "codex" subcommand to ctl scripts.
#
# Contract:
# - The caller must define ROOT_DIR (repo root).
# - Usage from any ctl script:
#     # shellcheck disable=SC1091
#     source "$ROOT_DIR/scripts/lib/codex-subcmd.sh"
#     codex_subcmd_maybe "<centre>" "<tool>" "$@" && exit 0
#
# Behaviour:
#   <tool> codex [new] [purpose...]
#   <tool> codex alias <name> <branch>
#   <tool> codex help
#
# This does NOT start Codex automatically; it creates a per-session git branch
# and a fish-friendly alias via scripts/codexsess.

codex_subcmd_help() {
  local tool="${1:-tool}"
  cat <<EOF
$tool codex - create a Codex session branch + fish shortcut

Usage:
  $tool codex [new] [purpose...]
  $tool codex alias <name> <branch>
  $tool codex status

Examples:
  $tool codex multiuser
  $tool codex new "saved maps"
  $tool codex alias jump_main main
EOF
}

codex_subcmd_maybe() {
  local default_centre="${1:-}"
  local tool="${2:-}"
  shift 2 || true

  [[ "${1:-}" == "codex" ]] || return 1
  shift || true

  if [[ -z "${ROOT_DIR:-}" ]]; then
    echo "[$tool] ROOT_DIR is not set; cannot run codex subcommand" >&2
    exit 1
  fi

  local codexsess="${ROOT_DIR:?}/scripts/codexsess"
  [[ -x "$codexsess" ]] || { echo "[$tool] missing: $codexsess" >&2; exit 1; }

  local sub="${1:-}"
  case "$sub" in
    ""|help|-h|--help)
      codex_subcmd_help "$tool"
      return 0
      ;;
    status)
      echo "tool=$tool"
      echo "default_centre=$default_centre"
      echo "root_dir=$ROOT_DIR"
      echo "codexsess=$codexsess"
      return 0
      ;;
    alias)
      shift || true
      [[ $# -eq 2 ]] || { echo "[$tool] Usage: $tool codex alias <name> <branch>" >&2; exit 1; }
      exec "$codexsess" alias "$1" "$2"
      ;;
    new)
      shift || true
      ;;
  esac

  local purpose="${*:-}"
  local slug
  if [[ -n "$purpose" ]]; then
    slug="${purpose}"
  else
    slug="${tool}"
  fi

  exec "$codexsess" new "$default_centre" "$slug"
}
