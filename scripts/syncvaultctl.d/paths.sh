#!/usr/bin/env bash

# Path helpers for syncvaultctl

vaultctl_cmd() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    if [ -x "$repo_root/scripts/sync-utils/vaultctl" ]; then
        echo "$repo_root/scripts/sync-utils/vaultctl"
        return 0
    fi
    if [ -x "$repo_root/scripts/utils/vaultctl" ]; then
        echo "$repo_root/scripts/utils/vaultctl"
        return 0
    fi
    if command -v vaultctl >/dev/null 2>&1; then
        echo "vaultctl"
        return 0
    fi
    if [ -x "$HOME/.dotfiles/bin/vaultctl" ]; then
        echo "$HOME/.dotfiles/bin/vaultctl"
        return 0
    fi
    return 1
}

resolve_vault_root() {
    local candidates=()
    [ -n "${AOS_VAULT_ROOT:-}" ] && candidates+=("$AOS_VAULT_ROOT")
    [ -n "${AOS_RCLONE_LOCAL:-}" ] && candidates+=("$AOS_RCLONE_LOCAL")
    [ -n "${AOS_VAULT_DIR:-}" ] && candidates+=("$AOS_VAULT_DIR")
    candidates+=("$HOME/Dokumente/AlphaOs-Vault" "$HOME/AlphaOS-Vault" "$HOME/AlphaOs-Vault")

    local c
    for c in "${candidates[@]}"; do
        [ -n "$c" ] || continue
        if [ -d "$c" ] || [ -L "$c" ]; then
            if command -v realpath >/dev/null 2>&1; then
                realpath -m -- "$c"
                return 0
            fi
            if command -v readlink >/dev/null 2>&1; then
                readlink -f -- "$c" 2>/dev/null || echo "$c"
                return 0
            fi
            echo "$c"
            return 0
        fi
    done
    return 1
}

vaultctl_run() {
    local vaultctl
    vaultctl="$(vaultctl_cmd)" || return 1
    local root
    root="$(resolve_vault_root || true)"
    if [ -n "$root" ]; then
        AOS_VAULT_ROOT="$root" "$vaultctl" "$@"
        return $?
    fi
    "$vaultctl" "$@"
}


aos_sync_cmd() {
    if command -v aos-sync >/dev/null 2>&1; then
        echo "aos-sync"
        return 0
    fi
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    if [ -x "$repo_root/scripts/aos-sync" ]; then
        echo "$repo_root/scripts/aos-sync"
        return 0
    fi
    if [ -x "$HOME/.dotfiles/bin/utils/aos-sync" ]; then
        echo "$HOME/.dotfiles/bin/utils/aos-sync"
        return 0
    fi
    return 1
}

vault_git_dir() {
    local override="${AOS_VAULT_GIT_DIR:-}"
    if [ -n "$override" ]; then
        echo "$override"
        return 0
    fi
    if [ -d "$HOME/AlphaOS-Vault" ]; then
        echo "$HOME/AlphaOS-Vault"
        return 0
    fi
    if [ -d "$HOME/AlphaOs-Vault" ]; then
        echo "$HOME/AlphaOs-Vault"
        return 0
    fi
    return 1
}

vault_git_repo() {
    local dir
    dir="$(vault_git_dir)" || return 1
    echo "$dir"
}

vitaltrainer_git_repo() {
    local override="${AOS_VITALTRAINER_DIR:-}"
    if [ -n "$override" ]; then
        echo "$override"
        return 0
    fi
    if [ -d "$HOME/Dokumente/BUSINESS/Vitaltrainer" ]; then
        echo "$HOME/Dokumente/BUSINESS/Vitaltrainer"
        return 0
    fi
    return 1
}

git_auto_sync_script() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local script="$repo_root/scripts/sync-utils/git-auto-sync.sh"
    if [ -x "$script" ]; then
        echo "$script"
        return 0
    fi
    script="$repo_root/scripts/utils/git-auto-sync.sh"
    if [ -x "$script" ]; then
        echo "$script"
        return 0
    fi
    script="$HOME/.dotfiles/scripts/utils/git-auto-sync.sh"
    if [ -x "$script" ]; then
        echo "$script"
        return 0
    fi
    local repo
    repo="$(vault_git_repo)" || return 1
    script="$repo/.scripts/git-auto-sync.sh"
    if [ -x "$script" ]; then
        echo "$script"
        return 0
    fi
    return 1
}
