#!/usr/bin/env fish
# Frame Map Dashboard – Fish Interface
# Wraps framectl/frame.py mit gum UI

set -l FRAMECTL (dirname (status filename))/framectl
set -l DOMAINS BODY BEING BALANCE BUSINESS

function _frame_header
    echo ""
    echo "⚔️  FRAME MAP – Wo stehst du wirklich?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _frame_pick_domain
    if type -q gum
        gum choose --header "Domain wählen:" $DOMAINS ALL
    else
        echo "Domain [BODY/BEING/BALANCE/BUSINESS/ALL]:"
        read -l choice
        echo $choice
    end
end

function frame_dashboard
    _frame_header

    # Zeige Status aller 4 Domains
    set -l vault $HOME/AlphaOS-Vault/Game/Frame
    for domain in $DOMAINS
        set -l file $vault/{$domain}_frame.md
        if test -f $file
            set -l mtime (date -r $file "+%Y-%m-%d" 2>/dev/null; or stat -c "%y" $file 2>/dev/null | cut -d' ' -f1)
            echo "  ✔ $domain  ($mtime)"
        else
            echo "  ✘ $domain  (kein Frame)"
        end
    end
    echo ""
end

function frame_new
    _frame_header
    set -l domain (_frame_pick_domain)
    if test "$domain" = ALL
        bash $FRAMECTL new
    else
        bash $FRAMECTL new $domain
    end
end

function frame_show
    _frame_header
    set -l domain (_frame_pick_domain)
    if test "$domain" = ALL
        bash $FRAMECTL show
    else
        bash $FRAMECTL show $domain
    end
end

# Main
switch "$argv[1]"
    case new
        frame_new
    case show
        frame_show
    case list
        bash $FRAMECTL list
    case ""
        frame_dashboard
        if type -q gum
            set -l action (gum choose --header "Was tun?" "new — Frame anlegen" "show — Frame anzeigen" "list — Alle auflisten" "exit")
            switch $action
                case "new*"
                    frame_new
                case "show*"
                    frame_show
                case "list*"
                    bash $FRAMECTL list
            end
        end
    case "*"
        echo "Usage: frame.fish [new|show|list]"
end
