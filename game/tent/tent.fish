#!/usr/bin/env fish
# Tent Fish UI (local review/session frontdoor + tentctl passthrough)

function _tent_script_dir
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

function _tent_can_gum
    type -q gum; and test -t 0; and test -t 1
end

function _tent_iso_week
    date +%G-W%V
end

function _tent_kw_label --argument-names week
    if string match -rq '^\d{4}-W\d{2}$' -- "$week"
        set -l kw (string replace -r '^\d{4}-W' '' -- "$week")
        echo "KW$kw"
    else
        echo "KW00"
    end
end

function _tent_vault_root
    if set -q AOS_VAULT_DIR
        echo "$AOS_VAULT_DIR"
    else if set -q ALPHAOS_VAULT_DIR
        echo "$ALPHAOS_VAULT_DIR"
    else
        echo "$HOME/vault"
    end
end

function _tent_dir
    echo (_tent_vault_root)"/Game/Tent"
end

function _tent_md_for_week --argument-names week
    echo (_tent_dir)"/generalstent_"(_tent_kw_label "$week")".md"
end

function _tent_header
    echo ""
    echo "🏕️  GENERAL'S TENT – Weekly Review"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

function _tent_usage
    printf '%s\n' \
        'Usage: tent.fish [review|new|run|status|show [YYYY-Www]|list|json [YYYY-Www]|help|-- <tentctl args...>]' \
        'Default (no args): Tent dashboard + optional gum actions' \
        '' \
        'Notes:' \
        '  review/new/run  -> local generals_tent.fish session' \
        '  other args       -> passthrough to tentctl (fallback / bot wrapper)'
end

function _tent_run_local_review
    set -l gentent (_tent_script_dir)/generals_tent.fish
    fish "$gentent" $argv
end

function _tent_run_ctl
    set -l tentctl (_tent_script_dir)/tentctl
    bash "$tentctl" $argv
end

function tent_dashboard
    _tent_header
    set -l week (_tent_iso_week)
    set -l md (_tent_md_for_week $week)
    set -l csv (_tent_dir)/weekly_core4score.csv
    set -l json (_tent_dir)/reviews/$week.json
    echo "Week: $week ("(_tent_kw_label $week)")"
    echo "Tent dir: "(_tent_dir)
    echo ""
    for f in $md $csv $json
        if test -f $f
            echo "  ✔ $f"
        else
            echo "  ✘ $f"
        end
    end
    echo ""
end

function tent_list
    set -l dir (_tent_dir)
    if not test -d $dir
        echo "No Tent dir yet: $dir"
        return 0
    end
    set -l files (find "$dir" -maxdepth 1 -type f -name 'generalstent_KW*.md' 2>/dev/null | sort -r)
    if test (count $files) -eq 0
        echo "No generalstent files yet."
        return 0
    end
    printf '%s\n' $files
end

function tent_show --argument-names week
    if test -z "$week"
        set week (_tent_iso_week)
    end
    set -l f (_tent_md_for_week $week)
    if not test -f $f
        echo "Tent file not found: $f" >&2
        return 1
    end
    if set -q EDITOR
        $EDITOR $f
    else
        cat $f
    end
end

function tent_json --argument-names week
    if test -z "$week"
        set week (_tent_iso_week)
    end
    set -l jf (_tent_dir)/reviews/$week.json
    if not test -f $jf
        echo "Tent JSON not found: $jf" >&2
        return 1
    end
    if command -sq jq
        jq . $jf
    else
        cat $jf
    end
end

switch "$argv[1]"
    case review new run
        _tent_run_local_review $argv[2..-1]
    case status dashboard
        tent_dashboard
    case list
        tent_list
    case show
        tent_show "$argv[2]"
    case json
        tent_json "$argv[2]"
    case ctl
        _tent_run_ctl $argv[2..-1]
    case help --help -h
        _tent_usage
    case ""
        tent_dashboard
        if _tent_can_gum
            set -l action (gum choose --header "Tent Action" \
                "review — General's Tent Session" \
                "show — Aktuelle Woche öffnen" \
                "json — Aktuelle Woche JSON" \
                "list — Historie anzeigen" \
                "tentctl help" \
                "exit")
            switch $action
                case "review*"
                    _tent_run_local_review
                case "show*"
                    tent_show (_tent_iso_week)
                case "json*"
                    tent_json (_tent_iso_week)
                case "list*"
                    tent_list
                case "tentctl help"
                    _tent_run_ctl help
            end
        end
    case --
        _tent_run_ctl $argv[2..-1]
    case "*"
        # Unknown subcommands fall through to tentctl for compatibility.
        _tent_run_ctl $argv
end
