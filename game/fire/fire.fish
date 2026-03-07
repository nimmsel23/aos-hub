#!/usr/bin/env fish
# Fire Fish UI (thin wrapper around firectl)

function _fire_script_dir
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

function _fire_can_gum
    type -q gum; and test -t 0; and test -t 1
end

function _fire_header
    echo ""
    echo "🔥  FIRE MAP – Wochenausführung"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _fire_usage
    printf '%s\n' \
        'Usage: fire.fish [menu|status|doctor|logs|daily|weekly|help]' \
        '  daily   -> firectl build daily' \
        '  weekly  -> firectl build weekly' \
        'Default (no args): status + optional gum actions'
end

function _fire_run
    set -l firectl (_fire_script_dir)/firectl
    bash "$firectl" $argv
end

function fire_dashboard
    _fire_header
    _fire_run status
end

switch "$argv[1]"
    case menu
        _fire_run menu
    case status
        fire_dashboard
    case doctor
        _fire_run doctor
    case logs
        _fire_run logs $argv[2..-1]
    case daily
        _fire_header
        _fire_run build daily
    case weekly
        _fire_header
        _fire_run build weekly
    case send-daily
        _fire_header
        _fire_run send daily
    case send-weekly
        _fire_header
        _fire_run send weekly
    case help --help -h
        _fire_usage
    case ""
        fire_dashboard
        if _fire_can_gum
            set -l action (gum choose --header "Fire Action" \
                "weekly — Markdown bauen" \
                "daily — Daily Markdown bauen" \
                "send weekly" \
                "send daily" \
                "doctor" \
                "logs --follow" \
                "menu (firectl)" \
                "exit")
            switch $action
                case "weekly*"
                    _fire_run build weekly
                case "daily*"
                    _fire_run build daily
                case "send weekly"
                    _fire_run send weekly
                case "send daily"
                    _fire_run send daily
                case doctor
                    _fire_run doctor
                case "logs --follow"
                    _fire_run logs --follow
                case "menu (firectl)"
                    _fire_run menu
            end
        end
    case "*"
        # passthrough for advanced firectl usage
        _fire_run $argv
end
