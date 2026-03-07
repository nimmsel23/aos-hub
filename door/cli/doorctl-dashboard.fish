#!/usr/bin/env fish
# Fish-native Door dashboard using real local Door backends (doorctl/Taskwarrior/Vault).
# Explicitly avoids the legacy `door/gtd` dummy sandbox.

set -l __door_cli_dir (dirname (status current-filename))
set -g DOOR_HOME (realpath "$__door_cli_dir/..")
set -g DOOR_DOORCTL "$DOOR_HOME/cli/doorctl"

function _dd_title --argument-names text
    echo "=== $text ==="
end

function _dd_trim_lines --argument-names max_lines
    set -l n 0
    while read -l line
        echo $line
        set n (math $n + 1)
        if test $n -ge $max_lines
            break
        end
    end
end

function _dd_has_cmd --argument-names name
    command -sq "$name"
end

function _dd_has_doorctl
    test -x "$DOOR_DOORCTL"
end

function _dd_doorctl --description "Call canonical doorctl backend"
    if not _dd_has_doorctl
        echo "missing doorctl: $DOOR_DOORCTL" >&2
        return 127
    end
    "$DOOR_DOORCTL" $argv
end

function _dd_door_vault_root
    # Prefer the user's active lowercase vault path if present; fall back to the
    # default vault path used by many scripts.
    if test -d "$HOME/vault/Door"
        echo "$HOME/vault/Door"
        return 0
    end
    if test -d "$HOME/vault/Door"
        echo "$HOME/vault/Door"
        return 0
    end
    # Last-resort fallback for display (may not exist yet).
    echo "$HOME/vault/Door"
end

function _dd_dashboard_json
    _dd_doorctl --json dashboard 2>/dev/null
end

function _dd_render_counts_and_health
    _dd_title "Door Overview"
    if not _dd_has_cmd jq
        echo "jq missing (cannot parse doorctl JSON dashboard)"
        return
    end

    printf "%s\n" $argv | jq -r '
      "Counts (pending): potential=\(.counts.potential)  plan=\(.counts.plan)  production=\(.counts.production)  profit=\(.counts.profit)",
      "Health: doors=\(.health.summary.total // 0)  healthy=\(.health.summary.healthy // 0)  attention=\(.health.summary.attention // 0)  stalled=\(.health.summary.stalled // 0)"
    ' 2>/dev/null
end

function _dd_render_phase_dirs
    _dd_title "Door Phase Folders"
    set -l root (_dd_door_vault_root)
    set -l p1 "$root/1-Potential"
    set -l p2 "$root/2-Plan"
    set -l p3 "$root/3-Production"
    set -l p4 "$root/4-Profit"

    printf "1-Potential  %s%s\n" "$p1" (test -d "$p1"; and echo ""; or echo "  (missing)")
    printf "2-Plan       %s%s\n" "$p2" (test -d "$p2"; and echo ""; or echo "  (missing)")
    printf "3-Production %s%s\n" "$p3" (test -d "$p3"; and echo ""; or echo "  (missing)")
    printf "4-Profit     %s%s\n" "$p4" (test -d "$p4"; and echo ""; or echo "  (missing)")
end

function _dd_render_hotlist
    _dd_title "Potential / Hot List (active)"
    if not _dd_has_cmd jq
        echo "jq missing"
        return
    end

    set -l count (printf "%s\n" $argv | jq -r '.hotlist | length' 2>/dev/null)
    if test -z "$count" -o "$count" = "0"
        echo "No active hotlist entries"
        return
    end

    printf "%s\n" $argv | jq -r '
      .hotlist[:8][] |
      (
        ("#" + ((.hot_index // 0)|tostring))
        + " | "
        + ((.idea // .title // "Untitled") | tostring | gsub("[\r\n]+";" ") | .[0:68])
        + " | "
        + ((.status // "active") | tostring)
        + " | "
        + ((.tw_uuid // "") | if length > 0 then .[0:8] else "-" end)
      )
    ' 2>/dev/null

    if test "$count" -gt 8
        echo "Showing 8 of $count (full list: doorctl hot list / doorctl hot json all)"
    end
end

function _dd_render_plan
    _dd_title "Plan / Door War"
    set -l out (_dd_doorctl doorwar list 2>/dev/null)
    if test $status -ne 0
        echo "Door War list unavailable"
        return
    end
    if test (count $out) -eq 0
        echo "No plan items"
        return
    end
    printf "%s\n" $out | _dd_trim_lines 12
end

function _dd_render_focus
    _dd_title "Production / Focus (Top 3 hits)"
    if not _dd_has_cmd jq
        echo "jq missing"
        return
    end
    set -l count (printf "%s\n" $argv | jq -r '.focus | length' 2>/dev/null)
    if test -z "$count" -o "$count" = "0"
        echo "No pending hits"
        return
    end
    printf "%s\n" $argv | jq -r '
      .focus[] |
      (
        ((.id // "") | tostring)
        + " | "
        + ((.description // "Untitled") | tostring | gsub("[\r\n]+";" ") | .[0:72])
        + " | "
        + ((.door_name // .project // "-") | tostring)
      )
    ' 2>/dev/null
end

function _dd_render_profit
    _dd_title "Profit / Review Snapshot"
    set -l out (_dd_doorctl review 2>/dev/null)
    if test $status -ne 0
        echo "Review unavailable"
        return
    end
    printf "%s\n" $out | _dd_trim_lines 14
end

function _dd_render_chapters_hint
    _dd_title "Door Chapters"
    echo "Reader available via: [c] chapters (blueprints 25-31), [C] alphaos chapter"
    if _dd_has_cmd jq
        set -l count (_dd_doorctl --json chapters 2>/dev/null | jq -r '.chapters|length' 2>/dev/null)
        if test -n "$count"
            echo "Blueprint chapters found: $count"
        end
    end
end

function _dd_render_snapshot
    if status is-interactive
        printf '\033c'
    end

    _dd_title "Door Dashboard (fish / real backends)"
    echo "doorctl: $DOOR_DOORCTL"
    echo "vault:   "(_dd_door_vault_root)
    echo "time:    "(date '+%Y-%m-%d %H:%M:%S')
    echo ""

    set -l json_lines (_dd_dashboard_json)
    if test $status -ne 0 -o (count $json_lines) -eq 0
        _dd_title "Backend Status"
        echo "doorctl --json dashboard unavailable"
        echo "Try: doorctl doctor"
        echo ""
        _dd_render_phase_dirs
        echo ""
        _dd_render_chapters_hint
    else
        _dd_render_counts_and_health $json_lines
        echo ""
        _dd_render_phase_dirs
        echo ""
        _dd_render_hotlist $json_lines
        echo ""
        _dd_render_plan
        echo ""
        _dd_render_focus $json_lines
        echo ""
        _dd_render_profit
        echo ""
        _dd_render_chapters_hint
    end

    echo ""
    _dd_title "Hotkeys"
    echo "[r/Enter] refresh   [a] add hot   [h] hot UI    [o] hot list"
    echo "[w] doorwar list    [f] focus     [p] profit    [v] review"
    echo "[c] chapters        [C] alphaos   [m] menu      [d] bash dashboard"
    echo "[q] quit"
end

function _dd_hot_add
    echo ""
    read -P "Hot idea: " idea
    if test -z (string trim -- "$idea")
        return
    end
    _dd_doorctl hot add "$idea"
    echo ""
    read -P "Enter to continue..." _
end

function _dd_run_cmd_screen --argument-names title
    printf '\033c'
    _dd_title "$title"
    _dd_doorctl $argv[2..-1]
    echo ""
    read -P "Enter to continue..." _
end

function main
    if not status is-interactive
        _dd_render_snapshot
        return 0
    end

    while true
        _dd_render_snapshot
        read -n 1 -P "> " key
        echo ""
        switch "$key"
            case "" \r \n r R
                continue
            case q Q
                return 0
            case a A
                _dd_hot_add
            case h H
                _dd_doorctl hot
            case o O
                _dd_run_cmd_screen "Hot List" hot list
            case w W
                _dd_run_cmd_screen "Door War" doorwar list
            case f F
                _dd_run_cmd_screen "Focus" focus
            case p P
                _dd_run_cmd_screen "Profit" profit review
            case v V
                _dd_run_cmd_screen "Review" review
            case m M
                _dd_doorctl menu
            case d D
                _dd_doorctl dashboard
            case c
                _dd_doorctl chapters
            case C
                _dd_doorctl chapters alphaos
            case '*'
                continue
        end
    end
end

main $argv
