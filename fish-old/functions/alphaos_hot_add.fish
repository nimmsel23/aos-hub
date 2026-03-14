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
# POTENTIAL - Hot List (Kapitel 26: Possibilities)
# "Guardian of Ideas" - Capture all possibilities
# ============================================================================

function alphaos_hot_add
    set idea $argv[1]
    if test -z "$idea"
        read -P "💡 Idee: " idea
    end
    
    if test -z "$idea"
        echo "❌ Keine Idee eingegeben"
        return 1
    end
    
    # Eisenhower Matrix - Simple Yes/No Questions
    echo ""
    echo "🎯 EISENHOWER MATRIX KLASSIFIZIERUNG"
    read -P "🚨 Ist das URGENT? (y/n): " urgent
    read -P "⭐ Ist das IMPORTANT? (y/n): " important
    
    # Quadrant berechnen
    set quadrant 4  # Default: Waste
    if test "$urgent" = "y" -a "$important" = "y"
        set quadrant 1  # Crisis
    else if test "$urgent" != "y" -a "$important" = "y"
        set quadrant 2  # Focus Zone (ALPHA TARGET!)
    else if test "$urgent" = "y" -a "$important" != "y"
        set quadrant 3  # Distractions
    end
    
    # Beschreibung der Quadranten
    switch $quadrant
        case 1
            set q_desc "🚨 Q1: Urgent + Important (Crisis)"
        case 2
            set q_desc "⭐ Q2: Important, Not Urgent (FOCUS ZONE)"
        case 3
            set q_desc "⚡ Q3: Urgent, Not Important (Distractions)"
        case 4
            set q_desc "💤 Q4: Not Urgent + Not Important (Waste)"
    end
    
    # JSON Entry für Hot List
    set today (date -Iseconds)
    set id (date +%s)
    
    set hot_entry "{
  \"id\": $id,
  \"idea\": \"$idea\",
  \"urgent\": $(test $urgent = y; and echo true; or echo false),
  \"important\": $(test $important = y; and echo true; or echo false),
  \"quadrant\": $quadrant,
  \"created\": \"$today\",
  \"status\": \"active\"
}"
    
    # Speichern in Hot List JSON
    set hot_file "$ALPHAOS_HOME/data/hotlist/ideas.json"
    mkdir -p (dirname $hot_file)
    
    if test -f $hot_file
        # Bestehende JSON erweitern
        set temp_file (mktemp)
        jq ". += [$hot_entry]" $hot_file > $temp_file
        mv $temp_file $hot_file
    else
        # Neue JSON erstellen
        echo "[$hot_entry]" > $hot_file
    end
    
    echo "✅ Idee gespeichert: $q_desc"
    
    # TaskWarrior Integration
    if command -v task >/dev/null
        set priority L
        if test $quadrant -eq 2
            set priority H  # Q2 ist Alpha Focus
        end
        
        set task_id (task add "$idea" project:HotList priority:$priority +q$quadrant | grep -o 'Created task [0-9]*' | grep -o '[0-9]*')
        if test -n "$task_id"
            echo "📋 TaskWarrior Task #$task_id erstellt"
        end
    end
    
    # Obsidian Hot List Note aktualisieren
    alphaos_update_obsidian_hotlist
end


