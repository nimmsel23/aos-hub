#!/usr/bin/env fish
# Freedom Map Fish UI (thin wrapper around freedomctl)

set -l DOMAINS BODY BEING BALANCE BUSINESS

function _freedom_script_dir
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

function _freedom_can_gum
    type -q gum; and test -t 0; and test -t 1
end

function _freedom_header
    echo ""
    echo "🗺️  FREEDOM MAP – Quartalsrichtung / Vision"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _freedom_usage
    printf '%s\n' \
        'Usage: freedom.fish [new|show|list|edit|help]' \
        'Default (no args): dashboard + optional gum actions'
end

function _freedom_run
    set -l freedomctl (_freedom_script_dir)/freedomctl
    bash "$freedomctl" $argv
end

function _freedom_pick_domain
    if _freedom_can_gum
        gum choose --header "Domain wählen:" $DOMAINS ALL
    else
        echo "Domain [BODY/BEING/BALANCE/BUSINESS/ALL]:"
        read -l choice
        echo (string upper -- (string trim -- "$choice"))
    end
end

function freedom_dashboard
    _freedom_header
    _freedom_run list
    echo ""
end

function freedom_new
    _freedom_header
    set -l domain (_freedom_pick_domain)
    if test "$domain" = ALL
        _freedom_run new
    else
        _freedom_run new $domain
    end
end

function freedom_show
    _freedom_header
    set -l domain (_freedom_pick_domain)
    if test "$domain" = ALL
        _freedom_run show
    else
        _freedom_run show $domain
    end
end

function freedom_edit
    _freedom_header
    set -l domain (_freedom_pick_domain)
    if test "$domain" = ALL
        _freedom_run edit
    else
        _freedom_run edit $domain
    end
end

switch "$argv[1]"
    case new
        freedom_new
    case show
        freedom_show
    case list
        _freedom_run list
    case edit
        freedom_edit
    case help --help -h
        _freedom_usage
    case ""
        freedom_dashboard
        if _freedom_can_gum
            set -l action (gum choose --header "Was tun?" \
                "new — Freedom anlegen" \
                "show — Freedom anzeigen" \
                "edit — Freedom öffnen" \
                "list — Alle auflisten" \
                "exit")
            switch $action
                case "new*"
                    freedom_new
                case "show*"
                    freedom_show
                case "edit*"
                    freedom_edit
                case "list*"
                    _freedom_run list
            end
        end
    case "*"
        _freedom_usage
        exit 2
end
