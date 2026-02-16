#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

errors=0
warnings=0

STRICT_CTLS=(
  backupctl
  firectl
  gamectl
  gasctl
  hubctl
  indexctl
  mountctl
  nodectl
  rclonectl
  syncctl
  telectl
)

LEGACY_CTLS=(
  aos-aliasctl
  aos-syncctl
  blueprintctl
  gitctl
  hookctl
  systemstatusctl
)

WRAPPER_CTLS=(
  doorctl
  syncvaultctl
  voicectl
)

HELPER_DEF_PATTERN='^(msg|warn|die|has_cmd|has_gum|has_fzf|choose|ui_title|ui_info|ui_ok|ui_err|ui_warn)\(\)'

say() {
  printf "%s\n" "$*"
}

err() {
  errors=$((errors + 1))
  printf "ERR: %s\n" "$*" >&2
}

warn() {
  warnings=$((warnings + 1))
  printf "WARN: %s\n" "$*" >&2
}

has_rg() {
  command -v rg >/dev/null 2>&1
}

file_contains() {
  local file="$1"
  local pattern="$2"
  if has_rg; then
    rg -q --fixed-strings "$pattern" "$file"
  else
    grep -Fq "$pattern" "$file"
  fi
}

print_matches() {
  local file="$1"
  local pattern="$2"
  if has_rg; then
    rg -n "$pattern" "$file" || true
  else
    grep -nE "$pattern" "$file" || true
  fi
}

check_file_exists_exec() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    err "missing file: $file"
    return 1
  fi
  if [[ ! -x "$file" ]]; then
    err "not executable: $file"
    return 1
  fi
  return 0
}

check_ctl_contract_strict() {
  local ctl="$1"
  local file="$SCRIPT_DIR/$ctl"
  check_file_exists_exec "$file" || return

  file_contains "$file" "codex-subcmd.sh" || err "$ctl: missing codex-subcmd sourcing"
  file_contains "$file" "aos-env.sh" || err "$ctl: missing aos-env sourcing"
  file_contains "$file" "ctl-lib.sh" || err "$ctl: missing ctl-lib sourcing"

  if print_matches "$file" "$HELPER_DEF_PATTERN" | grep -q .; then
    err "$ctl: defines local common helpers (must use ctl-lib.sh only)"
    print_matches "$file" "$HELPER_DEF_PATTERN" >&2
  fi
}

check_ctl_contract_legacy() {
  local ctl="$1"
  local file="$SCRIPT_DIR/$ctl"
  check_file_exists_exec "$file" || return

  if ! file_contains "$file" "codex-subcmd.sh"; then
    warn "$ctl: no codex-subcmd wiring (migration pending)"
  fi
  if ! file_contains "$file" "aos-env.sh"; then
    warn "$ctl: no aos-env wiring (migration pending)"
  fi
  if ! file_contains "$file" "ctl-lib.sh"; then
    warn "$ctl: no ctl-lib wiring (migration pending)"
  fi
  if print_matches "$file" "$HELPER_DEF_PATTERN" | grep -q .; then
    warn "$ctl: has local helper defs (migration pending)"
  fi
}

check_wrapper_ctl() {
  local ctl="$1"
  local file="$SCRIPT_DIR/$ctl"
  check_file_exists_exec "$file" || return

  if ! file_contains "$file" "exec "; then
    warn "$ctl: wrapper should delegate via exec"
  fi
}

check_duplicate_legacy_utils() {
  local pairs=(
    "sync-utils/git-auto-sync.sh utils/git-auto-sync.sh"
    "sync-utils/rclone-domain-sync.sh utils/rclone-domain-sync.sh"
    "sync-utils/rclone-vitaltrainer-copy.sh utils/rclone-vitaltrainer-copy.sh"
  )
  local pair left right
  for pair in "${pairs[@]}"; do
    left="${pair%% *}"
    right="${pair##* }"
    left="$SCRIPT_DIR/$left"
    right="$SCRIPT_DIR/$right"

    if [[ -f "$left" && -f "$right" ]]; then
      if file_contains "$right" "../sync-utils/" && file_contains "$right" "exec \"\$TARGET\""; then
        say "OK: compatibility wrapper -> ${right#$SCRIPT_DIR/} delegates to ${left#$SCRIPT_DIR/}"
      elif cmp -s "$left" "$right"; then
        warn "duplicate scripts (identical): ${left#$SCRIPT_DIR/} and ${right#$SCRIPT_DIR/}"
      else
        warn "duplicate scripts (different): ${left#$SCRIPT_DIR/} and ${right#$SCRIPT_DIR/}"
      fi
    fi
  done
}

main() {
  say "scripts-lint: checking strict ctl contract"
  local ctl
  for ctl in "${STRICT_CTLS[@]}"; do
    check_ctl_contract_strict "$ctl"
  done

  say "scripts-lint: checking legacy ctl backlog"
  for ctl in "${LEGACY_CTLS[@]}"; do
    check_ctl_contract_legacy "$ctl"
  done

  say "scripts-lint: checking wrapper ctls"
  for ctl in "${WRAPPER_CTLS[@]}"; do
    check_wrapper_ctl "$ctl"
  done

  say "scripts-lint: checking duplicate legacy utils"
  check_duplicate_legacy_utils

  say ""
  say "scripts-lint summary: errors=$errors warnings=$warnings"
  if (( errors > 0 )); then
    exit 1
  fi
}

main "$@"
