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

function alphaos_create_fire_map_note
    set fire_data $argv[1]
    set war_title (echo $fire_data | jq -r '.war_stack_title')
    
    set fire_note "$ALPHAOS_OBSIDIAN/Fire_Maps/Week-$ALPHAOS_WEEK.md"
    mkdir -p (dirname $fire_note)
    
    set content "# Fire Map - Week $ALPHAOS_WEEK

**Campaign:** $war_title  
**Week:** $ALPHAOS_WEEK

*\"The Fire Map is your detailed plan for the week, guided by your Monthly Mission's Focus Map.\"*

## 🗿 Big Rocks (4 Strategic Hits)
*\"These are the big rocks you put in the jar first because they form the foundation of your weekly success.\"*

"
    
    set big_rocks (echo $fire_data | jq '.big_rocks')
    set content "$content$(echo $big_rocks | jq -r '.[] | \"### \(.day) - Hit \(.id)\n- **Fact:** \(.fact)\n- **Obstacle:** \(.obstacle)\n- **Strike:** \(.strike)\n- **Responsible:** \(.responsibility)\n- **Status:** ⭕ Pending\n\"')"
    
    set content "$content

## 🪨 Little Rocks (12 Supporting Actions)
*\"After the Big Rocks are in place, it's time to add the 16 smaller hits.\"*

"
    
    set little_rocks (echo $fire_data | jq '.little_rocks')
    for domain in "Body" "Being" "Balance" "Business"
        set content "$content
### $domain Domain
"
        set domain_actions (echo $little_rocks | jq -r ".[] | select(.domain == \"$domain\") | \"- [ ] \" + .action")
        set content "$content$domain_actions
"
    end
    
    set content "$content

## Progress Tracking

- [ ] Monday Big Rock
- [ ] Tuesday Big Rock  
- [ ] Wednesday Big Rock
- [ ] Thursday Big Rock

### Weekly Assessment
- **Doors Opened:** 
- **Key Wins:**
- **Lessons Learned:**
- **Next Week Focus:**

---
*\"The essence of the Alpha's battle isn't just about facing external challenges; it's about mastering the art of time.\"*
"
    
    echo $content > $fire_note
end
