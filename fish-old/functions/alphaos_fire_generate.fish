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

function alphaos_fire_generate
    # Hole aktuelle War Stack
    set war_files (ls $ALPHAOS_HOME/data/warstacks/*.json 2>/dev/null)
    
    if test (count $war_files) -eq 0
        echo "❌ Keine War Stack gefunden. Erstelle zuerst einen mit 'alphaos war create'"
        return 1
    end
    
    # Neueste War Stack als aktiv betrachten
    set latest_war (ls -t $ALPHAOS_HOME/data/warstacks/*.json | head -1)
    set war_data (cat $latest_war | jq .)
    set war_title (echo $war_data | jq -r '.title')
    
    echo "🔥 FIRE MAP GENERATION - PRODUCTION PHASE"
    echo "═══════════════════════════════════════════"
    echo "Source War Stack: $war_title"
    echo "Week: $ALPHAOS_WEEK"
    echo ""
    
    # Fire Map: 4 Hits from War Stack + 12 Core Actions
    set fire_data "{
  \"id\": $(date +%s),
  \"week\": \"$ALPHAOS_WEEK\",
  \"war_stack_id\": $(echo $war_data | jq '.id'),
  \"war_stack_title\": \"$war_title\",
  \"big_rocks\": [],
  \"little_rocks\": [],
  \"sand\": [],
  \"created\": \"$(date -Iseconds)\",
  \"status\": \"active\"
}"
    
    # Big Rocks: The 4 Hits from War Stack
    echo "🗿 BIG ROCKS (4 Strategic Hits)"
    echo "─────────────────────────────────"
    set big_rocks (echo $war_data | jq '.hits')
    set fire_data (echo $fire_data | jq ".big_rocks = $big_rocks")
    
    echo $big_rocks | jq -r '.[] | "  \(.day): \(.fact)"'
    
    # Little Rocks: 12 Supporting Actions (3 per domain)
    echo ""
    echo "🪨 LITTLE ROCKS (12 Supporting Actions)"
    echo "─────────────────────────────────────────"
    echo "3 actions per Core domain to support the big rocks..."
    
    set little_rocks "[]"
    set domains "Body" "Being" "Balance" "Business"
    
    for domain in $domains
        echo ""
        echo "--- $domain Domain ---"
        for i in (seq 1 3)
            read -P "$domain Action $i: " action
            if test -n "$action"
                set little_rock "{
          \"domain\": \"$domain\",
          \"action\": \"$action\",
          \"completed\": false
        }"
                set little_rocks (echo $little_rocks | jq ". += [$little_rock]")
            end
        end
    end
    
    set fire_data (echo $fire_data | jq ".little_rocks = $little_rocks")
    
    # Sand: Daily routine tasks (optional)
    echo ""
    echo "🏖️ SAND (Daily Routines - Optional)"
    echo "───────────────────────────────────"
    read -P "Add daily routine tasks? (y/n): " add_sand
    
    set sand "[]"
    if test "$add_sand" = "y"
        echo "Enter routine tasks (empty to finish):"
        set task_num 1
        while true
            read -P "Routine $task_num: " routine
            if test -z "$routine"
                break
            end
            
            set sand_item "{
        \"task\": \"$routine\",
        \"frequency\": \"daily\"
      }"
            set sand (echo $sand | jq ". += [$sand_item]")
            set task_num (math $task_num + 1)
        end
    end
    
    set fire_data (echo $fire_data | jq ".sand = $sand")
    
    # Speichere Fire Map
    set fire_file "$ALPHAOS_HOME/data/maps/fire/$ALPHAOS_WEEK.json"
    mkdir -p (dirname $fire_file)
    echo $fire_data | jq . > $fire_file
    
    # TaskWarrior Integration für Big Rocks
    if command -v task >/dev/null
        echo ""
        echo "📋 TaskWarrior Integration..."
        
        echo $big_rocks | jq -r '.[] | "task add \"\(.fact) (\(.day))\" project:alpha.fire priority:H +bigrock +week$(echo '$ALPHAOS_WEEK' | tr -d -)"' | fish
    end
    
    # Erstelle Obsidian Fire Map
    alphaos_create_fire_map_note $fire_data
    
    echo ""
    echo "✅ FIRE MAP GENERATED!"
    echo "📁 Data: $fire_file"
    echo "🎯 Ready for weekly execution!"
end
