#!/usr/bin/env bash

# Rclone-related actions for syncvaultctl

menu_vaultctl() {
    local vaultctl
    vaultctl="$(vaultctl_cmd)" || { print_msg "$RED" "vaultctl not found"; pause_screen; return; }

    while true; do
        local choice
        choice="$(printf "%s\n" \
            "Status" \
            "Push now (copy)" \
            "Push dry-run (copy)" \
            "Pull now (copy)" \
            "Pull dry-run (copy)" \
            "Timers" \
            "Logs" \
            "Watch" \
            "Back" \
            | gum choose --header "Vault sync (vaultctl)")"

        case "$choice" in
            "Status") run_allow_fail vaultctl_run status ;;
            "Push now (copy)") run_allow_fail vaultctl_run sync ;;
            "Push dry-run (copy)") run_allow_fail vaultctl_run sync --dry-run ;;
            "Pull now (copy)") run_allow_fail vaultctl_run pull ;;
            "Pull dry-run (copy)") run_allow_fail vaultctl_run pull --dry-run ;;
            "Timers") run_allow_fail vaultctl_run timers ;;
            "Logs") run_allow_fail vaultctl_run logs ;;
            "Watch") run_allow_fail vaultctl_run watch ;;
            "Back") break ;;
        esac
        pause_screen
    done
}

menu_aos_sync() {
    local aos_sync
    aos_sync="$(aos_sync_cmd)" || { print_msg "$RED" "aos-sync not found"; pause_screen; return; }
    run_allow_fail "$aos_sync" menu
    pause_screen
}

# Show rclone sync status
show_rclone_status() {
    print_header "☁️  RCLONE COPY STATUS"

    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local domain_script="$repo_root/scripts/sync-utils/rclone-domain-sync.sh"
    local vital_script="$repo_root/scripts/sync-utils/rclone-vitaltrainer-copy.sh"
    if [ ! -x "$domain_script" ]; then
        domain_script="$repo_root/scripts/utils/rclone-domain-sync.sh"
    fi
    if [ ! -x "$vital_script" ]; then
        vital_script="$repo_root/scripts/utils/rclone-vitaltrainer-copy.sh"
    fi

    # AlphaOS-Vault (push/pull via vaultctl)
    local vaultctl
    vaultctl="$(vaultctl_cmd)" || true
    if [ -n "${vaultctl:-}" ]; then
        echo ""
        print_msg "$BOLD$BLUE" "📚 AlphaOS-Vault (push/pull copy)"
        run_allow_fail vaultctl_run status
    fi

    # Vitaltrainer (copy push/pull)
    if [ -x "$vital_script" ]; then
        echo ""
        print_msg "$BOLD$BLUE" "🎓 Vitaltrainer (push/pull copy)"
        "$vital_script" status
    elif [ -f ~/.dotfiles/scripts/utils/rclone-vitaltrainer-copy.sh ]; then
        echo ""
        print_msg "$BOLD$BLUE" "🎓 Vitaltrainer (push/pull copy)"
        ~/.dotfiles/scripts/utils/rclone-vitaltrainer-copy.sh status
    fi

    # 4 Domains (copy push/pull)
    if [ -x "$domain_script" ]; then
        for domain in BODY BEING BALANCE BUSINESS; do
            echo ""
            print_msg "$BOLD$BLUE" "$(domain_emoji "$domain") ${domain} (push/pull copy)"
            AOS_NO_CLEAR=1 AOS_COMPACT=1 "$domain_script" "$domain" status
        done
    elif [ -f ~/.dotfiles/scripts/utils/rclone-domain-sync.sh ]; then
        for domain in BODY BEING BALANCE BUSINESS; do
            echo ""
            print_msg "$BOLD$BLUE" "$(domain_emoji "$domain") ${domain} (push/pull copy)"
            AOS_NO_CLEAR=1 AOS_COMPACT=1 ~/.dotfiles/scripts/utils/rclone-domain-sync.sh "$domain" status
        done
    fi
}

# Show domain sync status only
show_domains_status() {
    print_header "🎯 ALPHAOS DOMAINS COPY STATUS"

    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local script="$repo_root/scripts/sync-utils/rclone-domain-sync.sh"
    if [ ! -x "$script" ]; then
        script="$repo_root/scripts/utils/rclone-domain-sync.sh"
    fi
    if [ -x "$script" ]; then
        for domain in BODY BEING BALANCE BUSINESS; do
            echo ""
            print_msg "$BOLD$BLUE" "$(domain_emoji "$domain") ${domain} Domain (push/pull copy)"
            AOS_NO_CLEAR=1 AOS_COMPACT=1 "$script" "$domain" status
        done
    elif [ -f ~/.dotfiles/scripts/utils/rclone-domain-sync.sh ]; then
        for domain in BODY BEING BALANCE BUSINESS; do
            echo ""
            print_msg "$BOLD$BLUE" "$(domain_emoji "$domain") ${domain} Domain (push/pull copy)"
            AOS_NO_CLEAR=1 AOS_COMPACT=1 ~/.dotfiles/scripts/utils/rclone-domain-sync.sh "$domain" status
        done
    else
        print_msg "$RED" "Domain sync script not found"
    fi
}

show_domain_logs() {
    print_header "📄 DOMAIN LOGS (last 10 pushed files)"

    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local script="$repo_root/scripts/sync-utils/rclone-domain-sync.sh"
    if [ ! -x "$script" ]; then
        script="$repo_root/scripts/utils/rclone-domain-sync.sh"
    fi
    if [ ! -x "$script" ]; then
        script="$HOME/.dotfiles/scripts/utils/rclone-domain-sync.sh"
    fi
    if [ ! -x "$script" ]; then
        print_msg "$RED" "Domain sync script not found"
        return 1
    fi

    for domain in BODY BEING BALANCE BUSINESS; do
        echo ""
        print_msg "$BOLD$BLUE" "$(domain_emoji "$domain") ${domain}"
        AOS_NO_CLEAR=1 AOS_LOG_LIMIT=10 "$script" "$domain" log
    done
}

menu_domain_copy() {
    local domain="$1"
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local script="$repo_root/scripts/sync-utils/rclone-domain-sync.sh"
    local log_file="${AOS_DOMAIN_LOG_FILE:-}"
    local timer="${domain,,}-domain-sync.timer"
    if [ -z "${log_file}" ]; then
        if [ -f "$HOME/.dotfiles/logs/rclone-${domain,,}-sync.log" ]; then
            log_file="$HOME/.dotfiles/logs/rclone-${domain,,}-sync.log"
        else
            log_file="${AOS_DOMAIN_LOG_DIR:-$HOME/.local/share/alphaos/logs}/rclone-${domain,,}-sync.log"
        fi
    fi

    if [ ! -x "$script" ]; then
        script="$repo_root/scripts/utils/rclone-domain-sync.sh"
    fi
    if [ ! -x "$script" ]; then
        script="$HOME/.dotfiles/scripts/utils/rclone-domain-sync.sh"
        log_file="$HOME/.dotfiles/logs/rclone-${domain,,}-sync.log"
        if [ ! -x "$script" ]; then
            print_msg "$RED" "Missing script: $script"
            pause_screen
            return
        fi
    fi

    while true; do
        local choice
        choice="$(printf "%s\n" \
            "Run push now" \
            "Run pull now" \
            "Run push-sync (delete remote)" \
            "Timer status" \
            "Enable timer" \
            "Disable timer" \
            "Tail log" \
            "Back" \
            | gum choose --header "${domain} copy (push/pull)")"

        case "$choice" in
            "Run push now") run_allow_fail "$script" "$domain" push ;;
            "Run pull now") run_allow_fail "$script" "$domain" pull ;;
            "Run push-sync (delete remote)")
                if confirm_action "Push-sync will delete remote files not present locally. Continue?"; then
                    run_allow_fail "$script" "$domain" push-sync
                fi
                ;;
            "Timer status")
                run_allow_fail systemctl --user status "$timer" --no-pager
                run_allow_fail systemctl --user list-timers "$timer" --no-pager
                ;;
            "Enable timer") run_allow_fail systemctl --user enable --now "$timer" ;;
            "Disable timer") run_allow_fail systemctl --user disable --now "$timer" ;;
            "Tail log")
                if [ -f "$log_file" ]; then
                    tail -n 200 "$log_file"
                else
                    print_msg "$YELLOW" "No log file found"
                fi
                ;;
            "Back") break ;;
        esac
        pause_screen
    done
}

menu_domains() {
    while true; do
        local choice
        choice="$(printf "%s\n" \
            "BODY" \
            "BEING" \
            "BALANCE" \
            "BUSINESS" \
            "Back" \
            | gum choose --header "Domain copy (push/pull)")"

        case "$choice" in
            "BODY"|"BEING"|"BALANCE"|"BUSINESS")
                menu_domain_copy "$choice"
                ;;
            "Back") break ;;
        esac
    done
}

menu_vitaltrainer_copy() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local script="$repo_root/scripts/sync-utils/rclone-vitaltrainer-copy.sh"
    local push_log="${AOS_VITALTRAINER_PUSH_LOG_FILE:-}"
    local pull_log="${AOS_VITALTRAINER_PULL_LOG_FILE:-}"
    if [ -z "${push_log}" ]; then
        if [ -f "$HOME/.dotfiles/logs/vitaltrainer-rclone-push.log" ]; then
            push_log="$HOME/.dotfiles/logs/vitaltrainer-rclone-push.log"
        else
            push_log="$HOME/.local/share/alphaos/logs/vitaltrainer-rclone-push.log"
        fi
    fi
    if [ -z "${pull_log}" ]; then
        if [ -f "$HOME/.dotfiles/logs/vitaltrainer-rclone-pull.log" ]; then
            pull_log="$HOME/.dotfiles/logs/vitaltrainer-rclone-pull.log"
        else
            pull_log="$HOME/.local/share/alphaos/logs/vitaltrainer-rclone-pull.log"
        fi
    fi
    if [ ! -x "$script" ]; then
        script="$repo_root/scripts/utils/rclone-vitaltrainer-copy.sh"
    fi
    if [ ! -x "$script" ]; then
        script="$HOME/.dotfiles/scripts/utils/rclone-vitaltrainer-copy.sh"
        if [ ! -x "$script" ]; then
            print_msg "$RED" "Missing script: $script"
            pause_screen
            return
        fi
    fi

    while true; do
        local choice
        choice="$(printf "%s\n" \
            "Run push now" \
            "Run pull now" \
            "Timer status" \
            "Enable push timer" \
            "Disable push timer" \
            "Enable pull timer" \
            "Disable pull timer" \
            "Tail push log" \
            "Tail pull log" \
            "Back" \
            | gum choose --header "Vitaltrainer copy (no deletes)")"

        case "$choice" in
            "Run push now") run_allow_fail "$script" push ;;
            "Run pull now") run_allow_fail "$script" pull ;;
            "Timer status")
                run_allow_fail systemctl --user list-timers --all | grep -E "vitaltrainer-rclone-(push|pull)" || true
                ;;
            "Enable push timer") run_allow_fail systemctl --user enable --now vitaltrainer-rclone-push.timer ;;
            "Disable push timer") run_allow_fail systemctl --user disable --now vitaltrainer-rclone-push.timer ;;
            "Enable pull timer") run_allow_fail systemctl --user enable --now vitaltrainer-rclone-pull.timer ;;
            "Disable pull timer") run_allow_fail systemctl --user disable --now vitaltrainer-rclone-pull.timer ;;
            "Tail push log")
                if [ -f "$push_log" ]; then
                    tail -n 200 "$push_log"
                else
                    print_msg "$YELLOW" "No push log file found"
                fi
                ;;
            "Tail pull log")
                if [ -f "$pull_log" ]; then
                    tail -n 200 "$pull_log"
                else
                    print_msg "$YELLOW" "No pull log file found"
                fi
                ;;
            "Back") break ;;
        esac
        pause_screen
    done
}
