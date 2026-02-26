#!/usr/bin/env fish
# Frame Map Fish UI (thin wrapper around framectl)

set -l DOMAINS BODY BEING BALANCE BUSINESS

function _frame_script_dir
    set -l f (status filename)
    if test -z "$f"
        set f (status current-filename)
    end
    if test -n "$f"
        dirname -- "$f"
    else
        pwd
    end
end

function _frame_can_gum
    type -q gum; and test -t 0; and test -t 1
end

function _frame_header
    echo ""
    echo "⚔️  FRAME MAP – Wo stehst du wirklich?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _frame_usage
    printf '%s\n' \
        'Usage: frame.fish [new|show|list|edit|help]' \
        'Default (no args): dashboard + optional gum actions'
end

function _frame_pick_domain
    if _frame_can_gum
        gum choose --header "Domain wählen:" $DOMAINS ALL
    else
        echo "Domain [BODY/BEING/BALANCE/BUSINESS/ALL]:"
        read -l choice
        echo (string upper -- (string trim -- "$choice"))
    end
end

function _frame_run
    set -l framectl (_frame_script_dir)/framectl
    bash "$framectl" $argv
end

function frame_dashboard
    _frame_header
    _frame_run list
    echo ""
end

function frame_new
    _frame_header
    set -l domain (_frame_pick_domain)
    if test "$domain" = ALL
        _frame_run new
    else
        _frame_run new $domain
    end
end

function frame_show
    _frame_header
    set -l domain (_frame_pick_domain)
    if test "$domain" = ALL
        _frame_run show
    else
        _frame_run show $domain
    end
end

function frame_edit
    _frame_header
    set -l domain (_frame_pick_domain)
    if test "$domain" = ALL
        _frame_run edit
    else
        _frame_run edit $domain
    end
end

switch "$argv[1]"
    case new
        frame_new
    case show
        frame_show
    case list
        _frame_run list
    case edit
        frame_edit
    case help --help -h
        _frame_usage
    case ""
        frame_dashboard
        if _frame_can_gum
            set -l action (gum choose --header "Was tun?" \
                "new — Frame anlegen" \
                "show — Frame anzeigen" \
                "edit — Frame öffnen" \
                "list — Alle auflisten" \
                "exit")
            switch $action
                case "new*"
                    frame_new
                case "show*"
                    frame_show
                case "edit*"
                    frame_edit
                case "list*"
                    _frame_run list
            end
        end
    case "*"
        _frame_usage
        exit 2
end
