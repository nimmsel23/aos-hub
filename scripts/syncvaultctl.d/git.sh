#!/usr/bin/env bash

# Git-related actions for syncvaultctl

git_sync_enforcer_cmd() {
    if command -v git-sync-enforcer >/dev/null 2>&1; then
        echo "git-sync-enforcer"
        return 0
    fi
    if [ -x "$HOME/.dotfiles/bin/git-sync-enforcer" ]; then
        echo "$HOME/.dotfiles/bin/git-sync-enforcer"
        return 0
    fi
    return 1
}

git_auto_sync_repo() {
    local repo="$1"
    local label="$2"
    local script
    script="$(git_auto_sync_script)" || { print_msg "$RED" "Git auto-sync script not found"; return 1; }
    bash "$script" "$repo" "$label"
}

git_autosync_repo() {
    local repo_name="$1"
    local repo_path="$2"
    local gse

    if gse="$(git_sync_enforcer_cmd)"; then
        run_allow_fail "$gse" autosync "$repo_name"
        return $?
    fi

    git_auto_sync_repo "$repo_path" "$repo_name"
}

git_autosync_all() {
    local gse
    if gse="$(git_sync_enforcer_cmd)"; then
        run_allow_fail "$gse" autosync
        return $?
    fi

    local repo
    repo="$(vault_git_repo)" || true
    if [ -n "${repo:-}" ]; then
        git_auto_sync_repo "$repo" "AlphaOs-Vault"
    fi
    repo="$(vitaltrainer_git_repo)" || true
    if [ -n "${repo:-}" ]; then
        git_auto_sync_repo "$repo" "Vitaltrainer"
    fi
    git_auto_sync_repo "$HOME/Dokumente/BUSINESS/FADARO" "FADARO"
}

vault_git_sync() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    git_autosync_repo "AlphaOs-Vault" "$repo"
}

vault_git_status() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    print_msg "$GREEN" "AlphaOS-Vault Status:"
    echo ""
    git -C "$repo" status
}

vault_git_log() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    print_msg "$GREEN" "Recent Commits:"
    echo ""
    git -C "$repo" log --oneline --graph --decorate -10
}

vault_git_diff() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    print_msg "$GREEN" "Changes:"
    echo ""
    git -C "$repo" diff
}

vault_git_remote() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    print_msg "$GREEN" "Remote Repository:"
    echo ""
    git -C "$repo" remote -v
    echo ""
    if command -v gh >/dev/null 2>&1; then
        gh repo view 2>/dev/null || echo "Not connected to GitHub"
    fi
}

vault_git_check_symlinks() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    local script="$repo/.scripts/check-symlinks.sh"
    if [ -x "$script" ]; then
        bash "$script"
    else
        print_msg "$YELLOW" "Missing symlink check script: $script"
        return 1
    fi
}

vault_git_setup() {
    local repo
    repo="$(vault_git_repo)" || { print_msg "$RED" "Vault repo not found"; return 1; }
    if ! command -v gh >/dev/null 2>&1; then
        print_msg "$YELLOW" "GitHub CLI (gh) not installed."
        echo "Install with: sudo pacman -S github-cli"
        return 1
    fi
    print_msg "$GREEN" "Setting up GitHub repository..."
    echo ""
    echo "This will create a private repository on GitHub."
    echo ""
    read -r -p "Repository name (default: AlphaOS-Vault): " repo_name
    repo_name=${repo_name:-AlphaOS-Vault}
    gh repo create "$repo_name" --private --source="$repo" --remote=origin --push
}

vault_git_dispatch() {
    local cmd="${1:-status}"
    case "$cmd" in
        sync) vault_git_sync ;;
        status) vault_git_status ;;
        log) vault_git_log ;;
        diff) vault_git_diff ;;
        remote) vault_git_remote ;;
        check) vault_git_check_symlinks ;;
        setup) vault_git_setup ;;
        *)
            print_msg "$RED" "Unknown vault command: $cmd"
            echo "Use: syncvaultctl vault [sync|status|log|diff|remote|check|setup]"
            return 1
            ;;
    esac
}

vitaltrainer_git_sync() {
    local repo
    repo="$(vitaltrainer_git_repo)" || { print_msg "$RED" "Vitaltrainer repo not found"; return 1; }
    git_autosync_repo "Vitaltrainer" "$repo"
}

fadaro_git_sync() {
    local repo="$HOME/Dokumente/BUSINESS/FADARO"
    git_autosync_repo "FADARO" "$repo"
}

menu_vault_git() {
    if ! have_gum || ! have_tty; then
        print_msg "$RED" "gum not available or no TTY"
        return 1
    fi
    while true; do
        local choice
        choice="$(printf "%s\n" \
            "Sync (git-auto-sync.sh)" \
            "Status" \
            "Log" \
            "Diff" \
            "Remote" \
            "Check symlinks" \
            "Setup repo (gh)" \
            "Back" \
            | gum choose --header "Vault git tools")"

        case "$choice" in
            "Sync (git-auto-sync.sh)") run_allow_fail vault_git_sync ;;
            "Status") run_allow_fail vault_git_status ;;
            "Log") run_allow_fail vault_git_log ;;
            "Diff") run_allow_fail vault_git_diff ;;
            "Remote") run_allow_fail vault_git_remote ;;
            "Check symlinks") run_allow_fail vault_git_check_symlinks ;;
            "Setup repo (gh)") run_allow_fail vault_git_setup ;;
            "Back") break ;;
        esac
        pause_screen
    done
}

menu_fadaro_push() {
    if ! confirm_action "Run FADARO git auto-sync now?"; then
        return 0
    fi
    fadaro_git_sync
}

menu_vault_push() {
    if ! confirm_action "Run AlphaOS-Vault git auto-sync now?"; then
        return 0
    fi
    vault_git_sync
}

menu_vitaltrainer_push() {
    if ! confirm_action "Run Vitaltrainer git auto-sync now?"; then
        return 0
    fi
    vitaltrainer_git_sync
}

# Show git sync status
show_git_status() {
    print_header "🔧 GIT SYNC STATUS"

    echo ""
    if command -v git-sync-enforcer &>/dev/null; then
        git-sync-enforcer status
    else
        print_msg "$RED" "git-sync-enforcer not found"
    fi
}
