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
# HELPER FUNCTIONS
# ============================================================================

function alphaos_update_obsidian_hotlist
    set hot_file "$ALPHAOS_HOME/data/hotlist/ideas.json"
    
    if not test -f $hot_file
        return
    end
    
    set hotlist_note "$ALPHAOS_OBSIDIAN/Hot_List.md"
    mkdir -p (dirname $hotlist_note)
    
    set content "# Hot List - Captured Potential

*\"The Hot List is your tool to capture these fleeting thoughts, your treasure chest for keeping those gems safe.\"*

## 🔥 Current Ideas by Quadrant
"
    
    for q in 2 1 3 4  # Q2 first (Alpha Focus)
        set count (jq "[.[] | select(.quadrant == $q and .status == \"active\")] | length" $hot_file)
        
        if test $count -gt 0
            switch $q
                case 1
                    set content "$content

### 🚨 Q1: Urgent & Important (Crisis)
"
                case 2
                    set content "$content

### ⭐ Q2: Important, Not Urgent (FOCUS ZONE)
*This is where the magic happens! 80% of your time should be here.*
"
                case 3
                    set content "$content

### ⚡ Q3: Urgent, Not Important (Distractions)
"
                case 4
                    set content "$content

### 💤 Q4: Not Urgent + Not Important (Waste)
"
            end
            
            set ideas (jq -r ".[] | select(.quadrant == $q and .status == \"active\") | \"- \" + .idea + \" (\" + (.created | split(\"T\")[0]) + \")\"" $hot_file)
            set content "$content$ideas
"
        end
    end
    
    set content "$content

---
*Updated: $(date)*  
*Alpha OS Hot List - Potential Phase*
"
    
    echo $content > $hotlist_note
end

