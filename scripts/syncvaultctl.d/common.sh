#!/usr/bin/env bash

# Common helpers for syncvaultctl

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

domain_emoji() {
    case "$1" in
        BODY) echo "💪" ;;
        BEING) echo "🧘" ;;
        BALANCE) echo "⚖️" ;;
        BUSINESS) echo "💼" ;;
        *) echo "" ;;
    esac
}

# Print colored message
print_msg() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

have_gum() {
    command -v gum >/dev/null 2>&1
}

have_tty() {
    [ -t 1 ]
}

pause_screen() {
    if have_tty; then
        read -r -p "Press Enter to continue..." _
    fi
}

run_allow_fail() {
    local had_errexit=0
    [[ "$-" == *e* ]] && had_errexit=1
    set +e
    "$@"
    local rc=$?
    if (( had_errexit )); then
        set -e
    fi
    return "$rc"
}

confirm_action() {
    local prompt="$1"
    if [[ "${CTL_ASSUME_YES:-0}" == "1" ]]; then
        return 0
    fi
    if [[ "${CTL_ASSUME_NO:-0}" == "1" ]]; then
        return 1
    fi
    if have_gum && have_tty; then
        gum confirm "$prompt"
    elif [ -t 0 ] && [ -t 1 ]; then
        local ans=""
        read -r -p "$prompt [y/N] " ans
        [[ "$ans" =~ ^[Yy]$ ]]
    else
        return 1
    fi
}

# Print section header
print_header() {
    echo ""
    print_msg "$BOLD$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_msg "$BOLD$CYAN" "$1"
    print_msg "$BOLD$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}
