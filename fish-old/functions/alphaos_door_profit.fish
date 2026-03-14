#!/usr/bin/env fish

#============================================================================
# DOOR PROFIT - Execution Results Review (Was wurde erreicht?)
# Kapitel 30: "Did you open the Door? What got done?"
#============================================================================

function alphaos_door_profit
    set fire_file "$ALPHAOS_HOME/data/maps/fire/$ALPHAOS_WEEK.json"
    
    echo "🏆 DOOR PROFIT - EXECUTION HARVEST"
    echo "═══════════════════════════════════════════"
    echo "Week: $ALPHAOS_WEEK"
    echo ""
    echo "\"It's time to take stock of what you've accomplished.\""
    echo "\"Winners keep score.\""
    echo ""

    # ============================================================================
    # CORE QUESTION: Did you open the Door?
    # ============================================================================
    
    echo "🚪 THE CENTRAL QUESTION"
    echo "─────────────────────────"
    read -P "Did you open this week's Door? (y/n): " door_opened
    
    if test "$door_opened" = "y"
        echo "🎉 VICTORY! The Door is open!"
        set door_status "opened"
    else
        echo "🔄 The Door remains closed. Learning opportunity ahead."
        set door_status "closed"
        read -P "What prevented you from opening the Door? " door_obstacle
    end

    # ============================================================================
    # HIT LIST ASSESSMENT - Big Rocks (War Stack Hits)
    # ============================================================================
    
    echo ""
    echo "🗿 BIG ROCKS ASSESSMENT (War Stack Hits)"
    echo "─────────────────────────────────────────"
    
    if not test -f $fire_file
        echo "❌ No Fire Map found for this week."
        echo "Creating manual assessment..."
        
        set big_rocks_completed 0
        for i in (seq 1 4)
            set days "Monday" "Tuesday" "Wednesday" "Thursday"
            set day $days[$i]
            read -P "Hit $i ($day) - Completed? (y/n): " hit_completed
            if test "$hit_completed" = "y"
                set big_rocks_completed (math $big_rocks_completed + 1)
            end
        end
        set total_big_rocks 4
    else
        # Load from Fire Map
        set fire_data (cat $fire_file)
        set big_rocks (echo $fire_data | jq '.big_rocks')
        set total_big_rocks (echo $big_rocks | jq 'length')
        set big_rocks_completed 0
        
        echo "Checking Big Rocks completion..."
        for i in (seq 1 $total_big_rocks)
            set hit_index (math "$i - 1")
            set hit (echo $big_rocks | jq -r ".[$hit_index]")
            set day (echo $hit | jq -r '.day')
            set fact (echo $hit | jq -r '.fact')
            
            read -P "✓ $day: $fact - Completed? (y/n): " hit_completed
            if test "$hit_completed" = "y"
                set big_rocks_completed (math $big_rocks_completed + 1)
                echo "   ✅ COMPLETED"
            else
                echo "   ⭕ PENDING"
            end
        end
    end

    # ============================================================================
    # LITTLE ROCKS ASSESSMENT 
    # ============================================================================
    
    echo ""
    echo "🪨 LITTLE ROCKS ASSESSMENT (Supporting Actions)"
    echo "─────────────────────────────────────────────"
    
    set little_rocks_completed 0
    set total_little_rocks 0
    
    if test -f $fire_file
        set little_rocks (echo $fire_data | jq '.little_rocks')
        set total_little_rocks (echo $little_rocks | jq 'length')
        
        for domain in "Body" "Being" "Balance" "Business"
            echo ""
            echo "--- $domain Domain ---"
            set domain_actions (echo $little_rocks | jq -r ".[] | select(.domain == \"$domain\") | .action")
            
            echo $domain_actions | while read -l action
                if test -n "$action"
                    read -P "✓ $action - Completed? (y/n): " action_completed
                    if test "$action_completed" = "y"
                        set little_rocks_completed (math $little_rocks_completed + 1)
                        echo "   ✅ DONE"
                    else
                        echo "   ⭕ PENDING"
                    end
                end
            end
        end
    else
        echo "Manual Little Rocks assessment..."
        read -P "How many supporting actions did you complete this week? " little_rocks_completed
        read -P "How many supporting actions were planned? " total_little_rocks
    end

    # ============================================================================
    # ACHIEVED LIST - Major Wins
    # ============================================================================
    
    echo ""
    echo "🏆 ACHIEVED LIST - Major Wins"
    echo "─────────────────────────────"
    echo "List your significant accomplishments this week:"
    
    set achieved_list "[]"
    set achievement_num 1
    
    while true
        read -P "Achievement $achievement_num (empty to finish): " achievement
        if test -z "$achievement"
            break
        end
        
        set achievement_entry "{\"achievement\": \"$achievement\", \"domain\": \"unknown\"}"
        set achieved_list (echo $achieved_list | jq ". += [$achievement_entry]")
        set achievement_num (math $achievement_num + 1)
    end

    # ============================================================================
    # DONE LIST - All Completed Tasks
    # ============================================================================
    
    echo ""
    echo "📝 DONE LIST - Tasks Completed"
    echo "─────────────────────────────"
    read -P "How many total tasks/actions did you complete this week? " total_done
    echo "✅ $total_done tasks completed this week"

    # ============================================================================
    # PROFIT CALCULATION & SCORE
    # ============================================================================
    
    echo ""
    echo "📊 WEEKLY PROFIT CALCULATION"
    echo "════════════════════════════"
    
    # Big Rocks Score (Primary)
    if test $total_big_rocks -gt 0
        set big_rocks_percent (math "round($big_rocks_completed / $total_big_rocks * 100)")
    else
        set big_rocks_percent 0
    end
    
    # Little Rocks Score (Secondary)  
    if test $total_little_rocks -gt 0
        set little_rocks_percent (math "round($little_rocks_completed / $total_little_rocks * 100)")
    else
        set little_rocks_percent 0
    end
    
    # Overall Execution Score
    set total_planned (math $total_big_rocks + $total_little_rocks)
    set total_completed (math $big_rocks_completed + $little_rocks_completed)
    
    if test $total_planned -gt 0
        set execution_percent (math "round($total_completed / $total_planned * 100)")
    else
        set execution_percent 0
    end

    echo "🗿 Big Rocks: $big_rocks_completed/$total_big_rocks ($big_rocks_percent%)"
    echo "🪨 Little Rocks: $little_rocks_completed/$total_little_rocks ($little_rocks_percent%)"
    echo "🎯 Overall Execution: $total_completed/$total_planned ($execution_percent%)"
    echo "📝 Total Tasks Done: $total_done"
    
    # Visual Progress Bar
    set bar_length 20
    set filled_length (math "round($execution_percent / 100 * $bar_length)")
    set bar (string repeat -n $filled_length "█")(string repeat -n (math $bar_length - $filled_length) "░")
    echo "   [$bar] $execution_percent%"

    # ============================================================================
    # PROFIT ASSESSMENT
    # ============================================================================
    
    echo ""
    echo "🏆 PROFIT ASSESSMENT"
    echo "───────────────────"
    
    if test "$door_opened" = "y" -a $big_rocks_percent -ge 75
        echo "🥇 CHAMPION WEEK! Door opened + Strong execution!"
        set profit_grade "A+"
    else if test $execution_percent -ge 80
        echo "🏆 EXCELLENT! Outstanding execution this week!"
        set profit_grade "A"
    else if test $execution_percent -ge 60
        echo "💪 SOLID! Good progress made this week!"
        set profit_grade "B"
    else if test $execution_percent -ge 40
        echo "📈 BUILDING! Room for improvement but momentum present!"
        set profit_grade "C"
    else
        echo "🔄 RESET! Time to reassess and recommit!"
        set profit_grade "D"
    end

    # ============================================================================
    # SAVE PROFIT DATA
    # ============================================================================
    
    set profit_data "{
  \"week\": \"$ALPHAOS_WEEK\",
  \"date\": \"$(date -Iseconds)\",
  \"door_status\": \"$door_status\",
  \"big_rocks\": {
    \"completed\": $big_rocks_completed,
    \"total\": $total_big_rocks,
    \"percentage\": $big_rocks_percent
  },
  \"little_rocks\": {
    \"completed\": $little_rocks_completed,
    \"total\": $total_little_rocks,
    \"percentage\": $little_rocks_percent
  },
  \"execution\": {
    \"completed\": $total_completed,
    \"total\": $total_planned,
    \"percentage\": $execution_percent
  },
  \"total_done\": $total_done,
  \"achieved_list\": $achieved_list,
  \"profit_grade\": \"$profit_grade\"
}"

    if test "$door_opened" != "y"
        set profit_data (echo $profit_data | jq ".door_obstacle = \"$door_obstacle\"")
    end

    set profit_file "$ALPHAOS_HOME/data/profit/execution/$ALPHAOS_WEEK.json"
    mkdir -p (dirname $profit_file)
    echo $profit_data | jq . > $profit_file

    # ============================================================================
    # CLOSING
    # ============================================================================
    
    echo ""
    echo "✅ DOOR PROFIT ASSESSMENT COMPLETE"
    echo "📁 Data saved: $profit_file"
    echo "🎯 Grade: $profit_grade"
    echo ""
    echo "\"The Door system isn't just about the score; it's about"
    echo "understanding your rhythm and pace of work.\""
    echo ""
    echo "🏕️ NEXT: General's Tent for strategic reflection"
end
