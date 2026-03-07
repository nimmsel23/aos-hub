#!/usr/bin/env fish

#============================================================================
# GENERAL'S TENT - Strategic Weekly Review (Fish)
# Hardened local prototype aligned with Game/Tent snapshot + history outputs
#============================================================================

function __tent_usage
    printf '%s\n' \
        'Usage:' \
        '  fish generals_tent.fish [--week YYYY-Www] [--vault DIR] [--home DIR] [--no-obsidian]' \
        '' \
        'Environment (optional):' \
        '  ALPHAOS_WEEK         ISO week, e.g. 2026-W08' \
        '  ALPHAOS_HOME         repo/home base used for profit lookup fallback' \
        '  AOS_VAULT_DIR        preferred vault root' \
        '  ALPHAOS_VAULT_DIR    fallback vault root' \
        '  ALPHAOS_OBSIDIAN     optional Obsidian root for mirrored Markdown note'
end

function __tent_script_dir
    set -l f (status filename)
    if test -n "$f"
        cd (dirname -- "$f") >/dev/null 2>&1
        pwd
    else
        pwd
    end
end

function __tent_repo_root
    set -l d (__tent_script_dir)
    cd "$d/../.." >/dev/null 2>&1
    pwd
end

function __tent_require_cmd --argument-names cmd
    if not command -sq "$cmd"
        echo "ERROR: required command not found: $cmd" >&2
        return 1
    end
end

function __tent_iso_week
    date +%G-W%V
end

function __tent_kw_label --argument-names week
    if string match -rq '^\d{4}-W\d{2}$' -- "$week"
        set -l kw (string replace -r '^\d{4}-W' '' -- "$week")
        echo "KW$kw"
    else
        echo "KW00"
    end
end

function __tent_stamp_utc
    date -u +"%Y%m%dT%H%M%SZ"
end

function __tent_is_int --argument-names value
    string match -rq '^[0-9]+$' -- "$value"
end

function __tent_is_number --argument-names value
    string match -rq '^[0-9]+([.][0-9]+)?$' -- "$value"
end

function __tent_prompt_text --argument-names prompt
    set -l value
    if not read -l -P "$prompt" value
        echo "Aborted." >&2
        return 130
    end
    echo (string trim -- "$value")
end

function __tent_prompt_int
    set -l prompt $argv[1]
    set -l min $argv[2]
    set -l max $argv[3]

    while true
        set -l raw
        if not read -l -P "$prompt" raw
            echo "Aborted." >&2
            return 130
        end
        set raw (string trim -- "$raw")
        if __tent_is_int "$raw"
            if test "$raw" -ge "$min"; and test "$raw" -le "$max"
                echo "$raw"
                return 0
            end
        end
        echo "Please enter a number between $min and $max." >&2
    end
end

function __tent_prompt_enum
    set -l prompt $argv[1]
    set -l options $argv[2..-1]
    if test (count $options) -eq 0
        echo "ERROR: __tent_prompt_enum needs options" >&2
        return 2
    end

    while true
        set -l raw
        if not read -l -P "$prompt" raw
            echo "Aborted." >&2
            return 130
        end
        set -l value (string upper -- (string trim -- "$raw"))
        for opt in $options
            if test "$value" = "$opt"
                echo "$value"
                return 0
            end
        end
        echo "Please enter one of: "(string join " | " -- $options) >&2
    end
end

function __tent_write_text --argument-names path content
    mkdir -p -- (dirname -- "$path")
    printf '%s\n' "$content" > "$path"
end

function __tent_write_pair --argument-names canonical_path history_path content
    __tent_write_text "$history_path" "$content"
    __tent_write_text "$canonical_path" "$content"
end

function __tent_load_profit --argument-names profit_file
    if not test -f "$profit_file"
        return 1
    end
    if not jq empty "$profit_file" >/dev/null 2>&1
        echo "WARN: invalid JSON in profit file: $profit_file" >&2
        return 1
    end

    set -g __tent_profit_execution (jq -r '.execution.percentage // 0' "$profit_file" 2>/dev/null)
    set -g __tent_profit_door_status (jq -r '.door_status // "unknown"' "$profit_file" 2>/dev/null)
    set -g __tent_profit_grade (jq -r '.profit_grade // "-"' "$profit_file" 2>/dev/null)

    if not __tent_is_int "$__tent_profit_execution"
        set -g __tent_profit_execution 0
    end

    return 0
end

function __tent_load_core4_week --argument-names week vault_root
    set -l file_name "core4_week_"$week".json"
    set -l candidates

    if set -q AOS_CORE4_LOCAL_DIR
        set candidates $candidates "$AOS_CORE4_LOCAL_DIR/$file_name"
    end
    set candidates $candidates "$HOME/.core4/$file_name" "$vault_root/Core4/$file_name" "$vault_root/Alpha_HQ/$file_name"

    for core4_file in $candidates
        if not test -f "$core4_file"
            continue
        end
        if not jq empty "$core4_file" >/dev/null 2>&1
            echo "WARN: invalid Core4 week JSON: $core4_file" >&2
            continue
        end

        # Prefer habit-based sums (filters out non-core4 domains like "test"),
        # fall back to by_domain if habit totals are unavailable.
        set -l parsed (jq -r '
            def h($k): ((.totals.by_habit // {})[$k] // 0);
            def d($k): ((.totals.by_domain // {})[$k] // 0);
            (h("body:fitness") + h("body:fuel")) as $body
            | (h("being:meditation") + h("being:memoirs")) as $being
            | (h("balance:partner") + h("balance:posterity") + h("balance:person1") + h("balance:person2")) as $balance
            | (h("business:discover") + h("business:declare") + h("business:action")) as $business
            | if ($body + $being + $balance + $business) > 0
              then "habit|\($body)|\($being)|\($balance)|\($business)"
              else "domain|\(d("body"))|\(d("being"))|\(d("balance"))|\(d("business"))"
              end
        ' "$core4_file" 2>/dev/null)
        set -l parts (string split '|' -- "$parsed")
        if test (count $parts) -ne 5
            continue
        end

        set -l source_mode "$parts[1]"
        set -l body "$parts[2]"
        set -l being "$parts[3]"
        set -l balance "$parts[4]"
        set -l business "$parts[5]"

        if not __tent_is_number "$body"
            continue
        end
        if not __tent_is_number "$being"
            continue
        end
        if not __tent_is_number "$balance"
            continue
        end
        if not __tent_is_number "$business"
            continue
        end

        set -g __tent_core4_source "$core4_file"
        set -g __tent_core4_mode "$source_mode"
        set -g __tent_core4_body "$body"
        set -g __tent_core4_being "$being"
        set -g __tent_core4_balance "$balance"
        set -g __tent_core4_business "$business"
        return 0
    end

    return 1
end

function alphaos_generals_tent
    __tent_require_cmd jq; or return $status

    set -l cli_week ""
    set -l cli_vault ""
    set -l cli_home ""
    set -l no_obsidian 0

    while test (count $argv) -gt 0
        switch $argv[1]
            case -h --help help
                __tent_usage
                return 0
            case --week
                if test (count $argv) -lt 2
                    echo "ERROR: --week requires YYYY-Www" >&2
                    return 2
                end
                set cli_week $argv[2]
                set -e argv[1..2]
                continue
            case --vault
                if test (count $argv) -lt 2
                    echo "ERROR: --vault requires a path" >&2
                    return 2
                end
                set cli_vault $argv[2]
                set -e argv[1..2]
                continue
            case --home
                if test (count $argv) -lt 2
                    echo "ERROR: --home requires a path" >&2
                    return 2
                end
                set cli_home $argv[2]
                set -e argv[1..2]
                continue
            case --no-obsidian
                set no_obsidian 1
            case '*'
                echo "ERROR: unknown argument: $argv[1]" >&2
                __tent_usage
                return 2
        end
        set -e argv[1]
    end

    set -l repo_root (__tent_repo_root)

    set -l alphaos_home
    if test -n "$cli_home"
        set alphaos_home "$cli_home"
    else if set -q ALPHAOS_HOME
        set alphaos_home "$ALPHAOS_HOME"
    else
        set alphaos_home "$repo_root"
    end

    set -l vault_root
    if test -n "$cli_vault"
        set vault_root "$cli_vault"
    else if set -q AOS_VAULT_DIR
        set vault_root "$AOS_VAULT_DIR"
    else if set -q ALPHAOS_VAULT_DIR
        set vault_root "$ALPHAOS_VAULT_DIR"
    else
        set vault_root "$HOME/vault"
    end

    set -l week
    if test -n "$cli_week"
        set week "$cli_week"
    else if set -q ALPHAOS_WEEK
        set week "$ALPHAOS_WEEK"
    else
        set week (__tent_iso_week)
    end
    if not string match -rq '^\d{4}-W\d{2}$' -- "$week"
        echo "ERROR: week must match YYYY-Www (got: $week)" >&2
        return 2
    end

    set -l week_year (string sub -s 1 -l 4 -- "$week")
    set -l kw_label (__tent_kw_label "$week")
    set -l tent_week_label "$week_year-$kw_label"
    set -l stamp_utc (__tent_stamp_utc)

    set -l tent_dir "$vault_root/Game/Tent"
    set -l tent_history_dir "$tent_dir/_history"
    set -l tent_generals_json_dir "$tent_dir/generals_tent"
    set -l tent_generals_json_history_dir "$tent_generals_json_dir/_history"

    set -l tent_md_filename "generalstent_"$tent_week_label".md"
    set -l tent_md_canonical "$tent_dir/$tent_md_filename"
    set -l tent_md_history "$tent_history_dir/generalstent_"$tent_week_label"__"$stamp_utc".md"
    set -l tent_json_rel "generals_tent/generalstent_"$week".json"
    set -l tent_json_canonical "$tent_generals_json_dir/generalstent_"$week".json"
    set -l tent_json_history "$tent_generals_json_history_dir/generalstent_"$week"__"$stamp_utc".json"
    set -l core4_csv_canonical "$tent_dir/weekly_core4score.csv"
    set -l core4_csv_history "$tent_history_dir/weekly_core4score_"$kw_label"__"$stamp_utc".csv"

    set -l obsidian_note ""
    set -l obsidian_note_history ""
    if test "$no_obsidian" -ne 1
        if set -q ALPHAOS_OBSIDIAN
            set obsidian_note "$ALPHAOS_OBSIDIAN/Generals_Tent/$tent_md_filename"
            set obsidian_note_history "$ALPHAOS_OBSIDIAN/Generals_Tent/_history/generalstent_"$tent_week_label"__"$stamp_utc".md"
        end
    end

    echo "🏕️ THE GENERAL'S TENT - STRATEGIC SANCTUARY"
    echo "═══════════════════════════════════════════════════"
    echo "Week: $week ($kw_label)"
    echo "Tent Dir: $tent_dir"
    echo ""
    echo '"In the relentless pursuit of your vision, amid the vast'
    echo 'battlefields of life, there exists a sacred space."'
    echo ""
    echo '"Here, you sit at a sturdy table covered in maps, symbols'
    echo 'of the week\'s battles. Across from you sits the most'
    echo 'important of allies: GOD."'
    echo ""

    echo "📊 COMPONENT #1: RETURN AND REPORT"
    echo "─────────────────────────────────────────"
    echo '"With brutal honesty, assess your progress:"'
    echo ""

    echo "🗺️ ANNUAL FREEDOM GAME (Long-term Vision):"
    set -l freedom_status (__tent_prompt_enum "Are you ON TRACK or OFF TRACK with your yearly goals? " "ON TRACK" "OFF TRACK"); or return $status
    set -l freedom_deviation ""
    if test "$freedom_status" = "OFF TRACK"
        set freedom_deviation (__tent_prompt_text "What's causing the deviation? "); or return $status
    end

    echo ""
    echo "🎯 MONTHLY MISSION (Focus Map):"
    set -l focus_momentum (__tent_prompt_enum "Are you GAINING or LOSING momentum this month? " "GAINING" "LOSING"); or return $status
    set -l monthly_score (__tent_prompt_int "Rate your monthly progress (1-10): " 1 10); or return $status

    echo ""
    echo "🔥 WEEKLY FIRE MAP (This Week's Battle):"
    set -l profit_file "$alphaos_home/data/profit/execution/$week.json"
    set -l weekly_status ""
    set -l execution_percent 0
    set -l door_status "unknown"
    set -l profit_grade "-"

    if __tent_load_profit "$profit_file"
        set execution_percent "$__tent_profit_execution"
        set door_status "$__tent_profit_door_status"
        set profit_grade "$__tent_profit_grade"
        echo "   Profit file: $profit_file"
        echo "   Execution Score: $execution_percent%"
        echo "   Door Status: $door_status"
        echo "   Grade: $profit_grade"
        if test "$execution_percent" -ge 70
            set weekly_status WIN
        else
            set weekly_status LOSS
        end
    else
        echo "   Profit file: not found/invalid ($profit_file)"
        set weekly_status (__tent_prompt_enum "Did you WIN or LOSE this week's battle? " WIN LOSE); or return $status
        set execution_percent (__tent_prompt_int "Weekly execution score (0-100%): " 0 100); or return $status
    end

    echo ""
    echo "🎯 ALPHA SCORE (Daily Game Performance):"
    echo '"Dive into the details of the Daily Game:"'
    echo ""

    echo "--- THE CORE (Daily Commitments) ---"
    set -l core4_source ""
    set -l core4_mode ""
    set -l core_body 0
    set -l core_being 0
    set -l core_balance 0
    set -l core_business 0
    if __tent_load_core4_week "$week" "$vault_root"
        set core4_source "$__tent_core4_source"
        set core4_mode "$__tent_core4_mode"
        set core_body "$__tent_core4_body"
        set core_being "$__tent_core4_being"
        set core_balance "$__tent_core4_balance"
        set core_business "$__tent_core4_business"
        echo "   Core4 source: $core4_source ($core4_mode sums)"
    else
        echo "   Core4 source: not found -> manual fallback"
        set core_body (__tent_prompt_int "Body commitments completed this week (0-7): " 0 7); or return $status
        set core_being (__tent_prompt_int "Being commitments completed this week (0-7): " 0 7); or return $status
        set core_balance (__tent_prompt_int "Balance commitments completed this week (0-7): " 0 7); or return $status
        set core_business (__tent_prompt_int "Business commitments completed this week (0-7): " 0 7); or return $status
    end

    set -l total_core (math "$core_body + $core_being + $core_balance + $core_business")
    set -l core_percentage (math "round($total_core / 28 * 100)")
    echo "   CORE TOTAL: $total_core/28 ($core_percentage%)"

    echo ""
    echo "--- THE VOICE (Daily Connection) ---"
    set -l voice_score (__tent_prompt_int "Voice sessions completed this week (0-7): " 0 7); or return $status
    set -l voice_percentage (math "round($voice_score / 7 * 100)")
    echo "   VOICE TOTAL: $voice_score/7 ($voice_percentage%)"

    echo ""
    echo "--- THE DOOR (Daily Priority Execution) ---"
    set -l door_daily_score (__tent_prompt_int "Daily priority actions completed (0-21): " 0 21); or return $status
    set -l door_daily_percentage (math "round($door_daily_score / 21 * 100)")
    echo "   DOOR DAILY TOTAL: $door_daily_score/21 ($door_daily_percentage%)"

    set -l alpha_total (math "$total_core + $voice_score + $door_daily_score")
    set -l alpha_percentage (math "round($alpha_total / 56 * 100)")
    echo ""
    echo "🏆 OVERALL ALPHA SCORE: $alpha_total/56 ($alpha_percentage%)"

    echo ""
    echo "📚 COMPONENT #2: LESSONS LEARNED"
    echo "─────────────────────────────────────────"
    echo '"The week isn\'t just about numbers or metrics.'
    echo 'Every day brings lessons."'
    echo ""

    set -l what_worked (__tent_prompt_text "What WORKED exceptionally well this week? "); or return $status
    echo ""
    set -l what_failed (__tent_prompt_text "What DIDN'T WORK or failed this week? "); or return $status
    echo ""
    set -l key_lesson (__tent_prompt_text "What is the KEY LESSON for exponential growth? "); or return $status
    echo ""
    set -l cross_domain_lesson (__tent_prompt_text "How can you apply this lesson across all four domains? "); or return $status

    echo ""
    echo "🎯 COMPONENT #3: COURSE CORRECTION"
    echo "─────────────────────────────────────────"
    echo '"Mistakes happen. What matters is how you respond."'
    echo ""

    set -l correction_needed 0
    if test "$freedom_status" = "OFF TRACK"
        set correction_needed 1
        echo "🚨 ANNUAL DRIFT DETECTED"
    end
    if test "$focus_momentum" = "LOSING"
        set correction_needed 1
        echo "⚠️ MONTHLY MOMENTUM LOSS"
    end
    if test "$alpha_percentage" -lt 70
        set correction_needed 1
        echo "📉 ALPHA SCORE BELOW STANDARD"
    end

    set -l strategic_adjustments ""
    set -l stop_doing ""
    set -l start_doing ""
    set -l continue_doing ""
    if test "$correction_needed" -eq 1
        echo ""
        set strategic_adjustments (__tent_prompt_text "What specific ADJUSTMENTS will get you back on track? "); or return $status
        set stop_doing (__tent_prompt_text "What will you STOP doing that's not serving you? "); or return $status
        set start_doing (__tent_prompt_text "What will you START doing to accelerate progress? "); or return $status
        set continue_doing (__tent_prompt_text "What will you CONTINUE doing that's working? "); or return $status
    else
        echo "✅ NO MAJOR COURSE CORRECTION NEEDED"
        echo "Continue current trajectory with minor optimizations."
        set -l minor_optimizations (__tent_prompt_text "What minor optimizations will you make? "); or return $status
        set strategic_adjustments "$minor_optimizations"
        set stop_doing "No major stops needed"
        set start_doing "No major starts needed"
        set continue_doing "Current successful patterns"
    end

    echo ""
    echo "🎯 COMPONENT #4: NEW TARGETS"
    echo "─────────────────────────────────────────"
    echo '"With the wisdom of the past week and a clear view'
    echo 'of the path ahead, set new targets."'
    echo ""

    set -l next_week_door (__tent_prompt_text "What is next week's PRIMARY FOCUS (the new Door)? "); or return $status
    echo ""
    set -l monthly_targets (__tent_prompt_text "What specific TARGETS align with your Monthly Mission? "); or return $status
    echo ""
    set -l habit_targets (__tent_prompt_text "What HABITS will you strengthen or build? "); or return $status
    echo ""

    echo "🔥 COMMITMENT LEVEL"
    set -l commitment_level (__tent_prompt_int "On a scale of 1-10, how committed are you to next week? " 1 10); or return $status
    set -l commitment_boost "Already at high commitment"
    if test "$commitment_level" -lt 8
        echo "⚠️ Low commitment detected."
        set commitment_boost (__tent_prompt_text "What would increase your commitment to a 9 or 10? "); or return $status
    else
        echo "🔥 HIGH COMMITMENT! Ready for battle!"
    end

    echo ""
    echo "🙏 DIVINE COMMUNION"
    echo "─────────────────────"
    echo '"A moment of communion with the divine..."'
    echo ""

    set -l divine_lesson (__tent_prompt_text "What is God teaching you through this week's challenges? "); or return $status
    set -l gratitude (__tent_prompt_text "What are you most grateful for this week? "); or return $status
    set -l prayer_intention (__tent_prompt_text "What prayer/intention do you set for next week? "); or return $status

    echo ""
    echo "🏕️ TENT ASSESSMENT"
    echo "─────────────────────"

    set -l alignment_factors 0
    if test "$freedom_status" = "ON TRACK"
        set alignment_factors (math "$alignment_factors + 25")
    end
    if test "$focus_momentum" = "GAINING"
        set alignment_factors (math "$alignment_factors + 25")
    else if test "$monthly_score" -ge 7
        set alignment_factors (math "$alignment_factors + 15")
    else if test "$monthly_score" -ge 5
        set alignment_factors (math "$alignment_factors + 10")
    end
    if test "$weekly_status" = "WIN"
        set alignment_factors (math "$alignment_factors + 25")
    else if test "$execution_percent" -ge 60
        set alignment_factors (math "$alignment_factors + 15")
    end
    if test "$alpha_percentage" -ge 80
        set alignment_factors (math "$alignment_factors + 25")
    else if test "$alpha_percentage" -ge 70
        set alignment_factors (math "$alignment_factors + 20")
    else if test "$alpha_percentage" -ge 60
        set alignment_factors (math "$alignment_factors + 15")
    else if test "$alpha_percentage" -ge 50
        set alignment_factors (math "$alignment_factors + 10")
    end

    set -l strategic_grade F
    if test "$alignment_factors" -ge 90
        set strategic_grade A+
        echo "🏆 STRATEGIC MASTERY! On track across all domains!"
    else if test "$alignment_factors" -ge 80
        set strategic_grade A
        echo "🥇 EXCELLENT ALIGNMENT! Strong strategic position!"
    else if test "$alignment_factors" -ge 70
        set strategic_grade B
        echo "💪 GOOD ALIGNMENT! Minor course corrections needed!"
    else if test "$alignment_factors" -ge 60
        set strategic_grade C
        echo "⚠️ MODERATE DRIFT! Strategic realignment required!"
    else if test "$alignment_factors" -ge 50
        set strategic_grade D
        echo "🚨 SIGNIFICANT DRIFT! Major course correction needed!"
    else
        set strategic_grade F
        echo "🔴 STRATEGIC CRISIS! Complete realignment required!"
    end

    set -l correction_needed_json false
    set -l correction_needed_label no
    if test "$correction_needed" -eq 1
        set correction_needed_json true
        set correction_needed_label yes
    end

    set -l tent_data (jq -n \
        --arg week "$week" \
        --arg kw "$kw_label" \
        --arg tent_week_label "$tent_week_label" \
        --arg tent_md_name "$tent_md_filename" \
        --arg tent_json_rel "$tent_json_rel" \
        --arg sealed_at "$stamp_utc" \
        --arg date_iso (date -Iseconds) \
        --arg freedom_status "$freedom_status" \
        --arg focus_momentum "$focus_momentum" \
        --arg weekly_status "$weekly_status" \
        --arg door_status "$door_status" \
        --arg profit_grade "$profit_grade" \
        --arg freedom_deviation "$freedom_deviation" \
        --arg what_worked "$what_worked" \
        --arg what_failed "$what_failed" \
        --arg key_lesson "$key_lesson" \
        --arg cross_domain_lesson "$cross_domain_lesson" \
        --arg strategic_adjustments "$strategic_adjustments" \
        --arg stop_doing "$stop_doing" \
        --arg start_doing "$start_doing" \
        --arg continue_doing "$continue_doing" \
        --arg next_week_door "$next_week_door" \
        --arg monthly_targets "$monthly_targets" \
        --arg habit_targets "$habit_targets" \
        --arg commitment_boost "$commitment_boost" \
        --arg divine_lesson "$divine_lesson" \
        --arg gratitude "$gratitude" \
        --arg prayer_intention "$prayer_intention" \
        --arg strategic_grade "$strategic_grade" \
        --argjson monthly_score "$monthly_score" \
        --argjson execution_percent "$execution_percent" \
        --argjson core_body "$core_body" \
        --argjson core_being "$core_being" \
        --argjson core_balance "$core_balance" \
        --argjson core_business "$core_business" \
        --argjson total_core "$total_core" \
        --argjson core_percentage "$core_percentage" \
        --argjson voice_score "$voice_score" \
        --argjson voice_percentage "$voice_percentage" \
        --argjson door_daily_score "$door_daily_score" \
        --argjson door_daily_percentage "$door_daily_percentage" \
        --argjson alpha_total "$alpha_total" \
        --argjson alpha_percentage "$alpha_percentage" \
        --argjson commitment_level "$commitment_level" \
        --argjson alignment_factors "$alignment_factors" \
        --argjson correction_needed "$correction_needed_json" \
        '{
          week: $week,
          kw: $kw,
          sealed_at: $sealed_at,
          date: $date_iso,
          return_report: {
            freedom_status: $freedom_status,
            freedom_deviation: (if $freedom_status == "OFF TRACK" then $freedom_deviation else null end),
            focus_momentum: $focus_momentum,
            monthly_score: $monthly_score,
            weekly_status: $weekly_status,
            execution_percent: $execution_percent,
            door_status: $door_status,
            profit_grade: $profit_grade
          },
          alpha_score: {
            core: {
              body: $core_body,
              being: $core_being,
              balance: $core_balance,
              business: $core_business,
              total: $total_core,
              percentage: $core_percentage
            },
            voice: {
              score: $voice_score,
              percentage: $voice_percentage
            },
            door_daily: {
              score: $door_daily_score,
              percentage: $door_daily_percentage
            },
            total: $alpha_total,
            percentage: $alpha_percentage
          },
          lessons_learned: {
            what_worked: $what_worked,
            what_failed: $what_failed,
            key_lesson: $key_lesson,
            cross_domain_lesson: $cross_domain_lesson
          },
          course_correction: {
            correction_needed: $correction_needed,
            strategic_adjustments: $strategic_adjustments,
            stop_doing: $stop_doing,
            start_doing: $start_doing,
            continue_doing: $continue_doing
          },
          new_targets: {
            next_week_door: $next_week_door,
            monthly_targets: $monthly_targets,
            habit_targets: $habit_targets,
            commitment_level: $commitment_level,
            commitment_boost: (if $commitment_level < 8 then $commitment_boost else null end)
          },
          divine_communion: {
            divine_lesson: $divine_lesson,
            gratitude: $gratitude,
            prayer_intention: $prayer_intention
          },
          strategic_assessment: {
            alignment_score: $alignment_factors,
            strategic_grade: $strategic_grade
          },
          bundle_seal: {
            core4_csv: "weekly_core4score.csv",
            tent_markdown: $tent_md_name,
            generals_tent_json: $tent_json_rel,
            sealed_at: $sealed_at
          }
        }' | string collect)

    set -l tent_json_pretty (printf '%s\n' "$tent_data" | jq . | string collect)

    set -l core4_csv "week,domain,score,max
$week,BODY,$core_body,7
$week,BEING,$core_being,7
$week,BALANCE,$core_balance,7
$week,BUSINESS,$core_business,7
$week,TOTAL,$total_core,28"

    set -l tent_content "# General's Tent - $kw_label ($week)

*\"Here, you sit at a sturdy table covered in maps, symbols of the week's battles. Across from you sits the most important of allies: GOD.\"*

## 📊 Return and Report

**Annual Freedom Game:** $freedom_status
**Monthly Mission:** $focus_momentum (Score: $monthly_score/10)
**Weekly Fire Map:** $weekly_status ($execution_percent% execution)
**Door Status:** $door_status
**Profit Grade:** $profit_grade

### 🎯 Alpha Score Breakdown
- **Core Total:** $total_core/28 ($core_percentage%)
  - Body: $core_body/7 | Being: $core_being/7 | Balance: $core_balance/7 | Business: $core_business/7
- **Voice:** $voice_score/7 ($voice_percentage%)
- **Door Daily:** $door_daily_score/21 ($door_daily_percentage%)
- **Overall Alpha:** $alpha_total/56 ($alpha_percentage%)

## 📚 Lessons Learned

**What Worked:** $what_worked

**What Failed:** $what_failed

**Key Lesson:** $key_lesson

**Cross-Domain Application:** $cross_domain_lesson

## 🎯 Course Correction

**Correction Needed:** $correction_needed_label

**Strategic Adjustments:** $strategic_adjustments

**Stop Doing:** $stop_doing

**Start Doing:** $start_doing

**Continue Doing:** $continue_doing

## 🎯 New Targets

**Next Week's Door:** $next_week_door

**Monthly Targets:** $monthly_targets

**Habit Targets:** $habit_targets

**Commitment Level:** $commitment_level/10

## 🙏 Divine Communion

**Divine Lesson:** $divine_lesson

**Gratitude:** $gratitude

**Prayer/Intention:** $prayer_intention

## 🏕️ Strategic Assessment

**Alignment Score:** $alignment_factors/100
**Strategic Grade:** $strategic_grade

## 🔒 Bundle / Files

- Canonical Tent: $tent_md_filename
- Canonical Core4 CSV: weekly_core4score.csv
- Canonical Tent JSON: $tent_json_rel
- Sealed At (UTC): $stamp_utc
- History copies written: yes

---
*Week $week Strategic Review*"

    __tent_write_pair "$tent_json_canonical" "$tent_json_history" "$tent_json_pretty"
    __tent_write_pair "$tent_md_canonical" "$tent_md_history" "$tent_content"
    __tent_write_pair "$core4_csv_canonical" "$core4_csv_history" "$core4_csv"

    if test -n "$obsidian_note"
        __tent_write_pair "$obsidian_note" "$obsidian_note_history" "$tent_content"
    end

    echo ""
    echo "✅ GENERAL'S TENT SESSION COMPLETE"
    echo "═══════════════════════════════════════════"
    echo "📁 Tent MD (canonical): $tent_md_canonical"
    echo "🕘 Tent MD (history):   $tent_md_history"
    echo "💾 Tent JSON:           $tent_json_canonical"
    echo "🕘 JSON history:        $tent_json_history"
    echo "📊 Core4 CSV:           $core4_csv_canonical"
    echo "🕘 Core4 CSV history:   $core4_csv_history"
    if test -n "$obsidian_note"
        echo "🧠 Obsidian mirror:     $obsidian_note"
    end
    echo "🎯 Strategic Grade:     $strategic_grade"
    echo "📊 Alignment Score:     $alignment_factors/100"
    echo ""
    echo "🚪 NEXT: Plan next week's War Stack with '$next_week_door'"
end

if not status is-interactive
    alphaos_generals_tent $argv
end
