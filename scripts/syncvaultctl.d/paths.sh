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

aos_sync_cmd() {
    if command -v aos-sync >/dev/null 2>&1; then
        echo "aos-sync"
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
