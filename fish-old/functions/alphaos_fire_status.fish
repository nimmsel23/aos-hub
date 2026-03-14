#!/usr/bin/env fish

# ============================================================================
# ALPHA OS DOOR SYSTEM - Fish Implementation
# Kapitel 25-30: The Door (Potential → Plan → Production → Profit)
# ============================================================================

# Konfiguration
set -g ALPHAOS_HOME "$HOME/.alphaos"
set -g ALPHAOS_OBSIDIAN "$HOME/Obsidian/Alpha_OS"  # Anpassen an dein Vault
set -g ALPHAOS_WEEK (date +%G-W%V)  # ISO Week (2024-W01)

# ============================================================================
# PRODUCTION - Fire Map (Kapitel 29: Production)
# Weekly 16 Actions (4×4 Structure)
# ============================================================================

function alphaos_fire_status
    set fire_file "$ALPHAOS_HOME/data/maps/fire/$ALPHAOS_WEEK.json"
    
    if not test -f $fire_file
        echo "❌ Keine Fire Map für $ALPHAOS_WEEK gefunden."
        echo "Generiere eine mit 'alphaos fire generate'"
        return 1
    end
    
    set fire_data (cat $fire_file | jq .)
    set war_title (echo $fire_data | jq -r '.war_stack_title')
    
    echo "🔥 FIRE MAP STATUS - Week $ALPHAOS_WEEK"
    echo "═══════════════════════════════════════════"
    echo "Campaign: $war_title"
    echo ""
    
    # Big Rocks Status
    echo "🗿 BIG ROCKS (Strategic Hits):"
    set big_rocks (echo $fire_data | jq '.big_rocks')
    set completed_big (echo $big_rocks | jq '[.[] | select(.completed == true)] | length')
    set total_big (echo $big_rocks | jq 'length')
    
    echo $big_rocks | jq -r '.[] | if .completed then "   ✅ \(.day): \(.fact)" else "   ⭕ \(.day): \(.fact)" end'
    
    # Little Rocks Status
    echo ""
    echo "🪨 LITTLE ROCKS (Supporting Actions):"
    set little_rocks (echo $fire_data | jq '.little_rocks')
    set completed_little (echo $little_rocks | jq '[.[] | select(.completed == true)] | length')
    set total_little (echo $little_rocks | jq 'length')
    
    for domain in "Body" "Being" "Balance" "Business"
        echo "  $domain:"
        echo $little_rocks | jq -r ".[] | select(.domain == \"$domain\") | if .completed then \"     ✅ \(.action)\" else \"     ⭕ \(.action)\" end"
    end
    
    # Progress Summary
    echo ""
    echo "📊 WEEKLY PROGRESS:"
    set total_actions (math $total_big + $total_little)
    set completed_actions (math $completed_big + $completed_little)
    set progress_percent (math "round($completed_actions / $total_actions * 100)")
    
    echo "   Big Rocks: $completed_big/$total_big"
    echo "   Little Rocks: $completed_little/$total_little"
    echo "   Total: $completed_actions/$total_actions ($progress_percent%)"
    
    # Progress Bar
    set bar_length 20
    set filled_length (math "round($progress_percent / 100 * $bar_length)")
    set bar (string repeat -n $filled_length "█")(string repeat -n (math $bar_length - $filled_length) "░")
    echo "   [$bar] $progress_percent%"
    
    # Assessment
    if test $progress_percent -ge 80
        echo "🏆 DOMINATING! Keep crushing it!"
    else if test $progress_percent -ge 60
        echo "💪 STRONG progress. Push for excellence!"
    else if test $progress_percent -ge 40
        echo "🎯 BUILDING momentum. Focus on big rocks!"
    else
        echo "⚠️ ACCELERATION needed. Prioritize ruthlessly!"
    end
end

