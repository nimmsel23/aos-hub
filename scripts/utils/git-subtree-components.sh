#!/usr/bin/env bash
# Push selected aos-hub components as split histories to dedicated remotes.
#
# Usage:
#   git-subtree-components.sh doctor
#   git-subtree-components.sh push [all|index-node|router|bridge ...] [--dry-run]
#
# Optional env:
#   AOS_SUBTREE_INDEX_REMOTE=alphaos-index-node
#   AOS_SUBTREE_ROUTER_REMOTE=alphaos-router
#   AOS_SUBTREE_BRIDGE_REMOTE=alphaos-bridge
#   AOS_SUBTREE_INDEX_BRANCH=main
#   AOS_SUBTREE_ROUTER_BRANCH=main
#   AOS_SUBTREE_BRIDGE_BRANCH=main
#   AOS_SUBTREE_INDEX_REMOTE_URL=git@github.com:<user>/alphaos-index-node.git
#   AOS_SUBTREE_ROUTER_REMOTE_URL=git@github.com:<user>/alphaos-router.git
#   AOS_SUBTREE_BRIDGE_REMOTE_URL=git@github.com:<user>/alphaos-bridge.git

set -euo pipefail

SELF="$(basename "$0")"

log() { printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }
ok() { printf "OK  %s\n" "$*"; }
warn() { printf "WARN %s\n" "$*" >&2; }
die() { printf "ERR %s\n" "$*" >&2; exit 1; }

DEFAULT_COMPONENTS=(index-node router bridge)
DRY_RUN=0

get_prefix() {
  case "$1" in
    index-node) printf "%s\n" "${AOS_SUBTREE_INDEX_PREFIX:-index-node}" ;;
    router) printf "%s\n" "${AOS_SUBTREE_ROUTER_PREFIX:-router}" ;;
    bridge) printf "%s\n" "${AOS_SUBTREE_BRIDGE_PREFIX:-bridge}" ;;
    *) return 1 ;;
  esac
}

get_remote() {
  case "$1" in
    index-node) printf "%s\n" "${AOS_SUBTREE_INDEX_REMOTE:-alphaos-index-node}" ;;
    router) printf "%s\n" "${AOS_SUBTREE_ROUTER_REMOTE:-alphaos-router}" ;;
    bridge) printf "%s\n" "${AOS_SUBTREE_BRIDGE_REMOTE:-alphaos-bridge}" ;;
    *) return 1 ;;
  esac
}

get_remote_url() {
  case "$1" in
    index-node) printf "%s\n" "${AOS_SUBTREE_INDEX_REMOTE_URL:-}" ;;
    router) printf "%s\n" "${AOS_SUBTREE_ROUTER_REMOTE_URL:-}" ;;
    bridge) printf "%s\n" "${AOS_SUBTREE_BRIDGE_REMOTE_URL:-}" ;;
    *) return 1 ;;
  esac
}

get_branch() {
  case "$1" in
    index-node) printf "%s\n" "${AOS_SUBTREE_INDEX_BRANCH:-main}" ;;
    router) printf "%s\n" "${AOS_SUBTREE_ROUTER_BRANCH:-main}" ;;
    bridge) printf "%s\n" "${AOS_SUBTREE_BRIDGE_BRANCH:-main}" ;;
    *) return 1 ;;
  esac
}

usage() {
  cat <<EOF
$SELF - split/push component repos from aos-hub

Usage:
  $SELF doctor
  $SELF push [all|index-node|router|bridge ...] [--dry-run]
EOF
}

need_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not inside a git repository"
}

ensure_remote_exists() {
  local component="$1"
  local remote="$2"
  local remote_url
  remote_url="$(get_remote_url "$component")"

  if git remote get-url "$remote" >/dev/null 2>&1; then
    return 0
  fi
  if [[ -n "$remote_url" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log "dry-run: git remote add $remote $remote_url"
    else
      git remote add "$remote" "$remote_url"
      ok "added remote $remote -> $remote_url"
    fi
    return 0
  fi
  warn "remote missing for $component: $remote (set AOS_SUBTREE_*_REMOTE_URL or add remote manually)"
  return 1
}

doctor_component() {
  local component="$1"
  local prefix remote branch
  prefix="$(get_prefix "$component")"
  remote="$(get_remote "$component")"
  branch="$(get_branch "$component")"

  if [[ -d "$prefix" ]]; then
    ok "$component prefix exists: $prefix"
  else
    warn "$component prefix missing: $prefix"
  fi

  if git remote get-url "$remote" >/dev/null 2>&1; then
    ok "$component remote exists: $remote -> $(git remote get-url "$remote")"
  else
    warn "$component remote missing: $remote"
  fi

  if git log -1 --oneline -- "$prefix" >/dev/null 2>&1; then
    ok "$component last change: $(git log -1 --oneline -- "$prefix")"
  else
    warn "$component has no history under prefix: $prefix"
  fi

  log "$component target branch: $branch"
}

push_component() {
  local component="$1"
  local prefix remote branch split_commit
  prefix="$(get_prefix "$component")"
  remote="$(get_remote "$component")"
  branch="$(get_branch "$component")"

  [[ -d "$prefix" ]] || die "$component prefix missing: $prefix"
  ensure_remote_exists "$component" "$remote" || return 1

  log "splitting $component from prefix: $prefix"
  split_commit="$(git subtree split --prefix="$prefix")"
  [[ -n "$split_commit" ]] || die "subtree split failed for $component"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: git push -u $remote $split_commit:$branch"
  else
    git push -u "$remote" "$split_commit:$branch"
    ok "$component pushed: $remote $split_commit:$branch"
  fi
}

cmd_doctor() {
  need_repo
  if [[ -n "$(git status --porcelain)" ]]; then
    warn "working tree is dirty; subtree push includes committed history only"
  else
    ok "working tree clean"
  fi
  local component
  for component in "${DEFAULT_COMPONENTS[@]}"; do
    doctor_component "$component"
  done
}

cmd_push() {
  need_repo
  local -a components=()
  local arg
  for arg in "$@"; do
    case "$arg" in
      --dry-run|--dry) DRY_RUN=1 ;;
      all) components=("${DEFAULT_COMPONENTS[@]}") ;;
      index-node|router|bridge) components+=("$arg") ;;
      *) die "unknown component/flag: $arg" ;;
    esac
  done

  if [[ "${#components[@]}" -eq 0 ]]; then
    components=("${DEFAULT_COMPONENTS[@]}")
  fi

  local component
  for component in "${components[@]}"; do
    push_component "$component"
  done
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    doctor)
      shift
      cmd_doctor "$@"
      ;;
    push)
      shift
      cmd_push "$@"
      ;;
    ""|-h|--help|help)
      usage
      ;;
    *)
      die "unknown command: $cmd"
      ;;
  esac
}

main "$@"
