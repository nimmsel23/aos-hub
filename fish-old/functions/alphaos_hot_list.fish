#!/usr/bin/env fish

# ============================================================================
# ALPHA OS DOOR SYSTEM - Fish Implementation
# Kapitel 25-30: The Door (Potential → Plan → Production → Profit)
# ============================================================================

# Konfiguration
set -g ALPHAOS_HOME "$HOME/AlphaOS-Valt"
set -g ALPHAOS_OBSIDIAN "$HOME/Door"  # Anpassen an dein Vault
set -g ALPHAOS_WEEK (date +%G-W%V)  # ISO Week (2024-W01)

function alphaos_hot_list
    set hot_file "$ALPHAOS_HOME/1-Potential/ideas.json"
    
    if not test -f $hot_file
        echo "📝 Hot List ist leer. Nutze 'alphaos_hot_add' um Ideen zu sammeln."
        return
    end
    
    echo "🔥 HOT LIST - DEINE POTENTIALE"
    echo "═══════════════════════════════════════════"
    
    # Quadranten aufteilen und anzeigen
    for q in 1 2 3 4
        set count (jq "[.[] | select(.quadrant == $q and .status == \"active\")] | length" $hot_file)
        
        if test $count -gt 0
            switch $q
                case 1
                    echo ""
                    echo "🚨 Q1: URGENT & IMPORTANT (Crisis) - $count items"
                case 2
                    echo ""
                    echo "⭐ Q2: IMPORTANT, NOT URGENT (Focus Zone) - $count items"
                case 3
                    echo ""
                    echo "⚡ Q3: URGENT, NOT IMPORTANT (Distractions) - $count items"
                case 4
                    echo ""
                    echo "💤 Q4: NOT URGENT + NOT IMPORTANT (Waste) - $count items"
            end
            
            jq -r ".[] | select(.quadrant == $q and .status == \"active\") | \"   • \" + .idea + \" (\" + (.created | split(\"T\")[0]) + \")\"" $hot_file
        end
    end
    
    # Alpha Recommendation
    set q2_count (jq "[.[] | select(.quadrant == 2 and .status == \"active\")] | length" $hot_file)
    set total_count (jq "[.[] | select(.status == \"active\")] | length" $hot_file)
    
    if test $q2_count -gt 0
        set q2_percent (math "round($q2_count / $total_count * 100)")
        echo ""
        echo "💡 ALPHA EMPFEHLUNG: $q2_percent% deiner Ideen sind Q2 (Target: 80%)"
        if test $q2_percent -ge 80
            echo "🏆 PERFEKT! Du denkst strategisch."
        else
            echo "🎯 Fokussiere mehr auf Q2: Important but Not Urgent."
        end
    end
end

