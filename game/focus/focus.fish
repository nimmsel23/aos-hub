#!/usr/bin/env fish
# Focus Map Fish UI (thin wrapper around focusctl)

set -l DOMAINS BODY BEING BALANCE BUSINESS

function _focus_script_dir
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

function _focus_can_gum
    type -q gum; and test -t 0; and test -t 1
end

function _focus_header
    echo ""
    echo "🎯  FOCUS MAP – Monatsmission"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _focus_usage
    printf '%s\n' \
        'Usage: focus.fish [new|show|list|edit|ctx|help]' \
        'Default (no args): dashboard + optional gum actions'
end

function _focus_run
    set -l focusctl (_focus_script_dir)/focusctl
    bash "$focusctl" $argv
end

function _focus_pick_domain
    if _focus_can_gum
        gum choose --header "Domain wählen:" $DOMAINS ALL
    else
        echo "Domain [BODY/BEING/BALANCE/BUSINESS/ALL]:"
        read -l choice
        echo (string upper -- (string trim -- "$choice"))
    end
end

function focus_dashboard
    _focus_header
    _focus_run list
    echo ""
end

function focus_new
    _focus_header
    set -l domain (_focus_pick_domain)
    if test "$domain" = ALL
        _focus_run new
    else
        _focus_run new $domain
    end
end

function focus_show
    _focus_header
    set -l domain (_focus_pick_domain)
    if test "$domain" = ALL
        _focus_run show
    else
        _focus_run show $domain
    end
end

function focus_edit
    _focus_header
    set -l domain (_focus_pick_domain)
    if test "$domain" = ALL
        _focus_run edit
    else
        _focus_run edit $domain
    end
end

switch "$argv[1]"
    case new
        focus_new
    case show
        focus_show
    case list
        _focus_run list
    case edit
        focus_edit
    case ctx
        _focus_run ctx $argv[2..-1]
    case help --help -h
        _focus_usage
    case ""
        focus_dashboard
        if _focus_can_gum
            set -l action (gum choose --header "Was tun?" \
                "new — Focus anlegen" \
                "show — Focus anzeigen" \
                "edit — Focus öffnen" \
                "list — Alle auflisten" \
                "ctx — Focus PWA" \
                "exit")
            switch $action
                case "new*"
                    focus_new
                case "show*"
                    focus_show
                case "edit*"
                    focus_edit
                case "list*"
                    _focus_run list
                case "ctx*"
                    _focus_run ctx
            end
        end
    case "*"
        _focus_usage
        exit 2
end
