#!/usr/bin/env fish

# ============================================================================
# ALPHA OS DOOR SYSTEM - Fish Implementation
# Kapitel 25-30: The Door (Potential → Plan → Production → Profit)
# ============================================================================

# Konfiguration
set -g ALPHAOS_HOME "$HOME/AlphaOS-Vault"
set -g ALPHAOS_OBSIDIAN "$HOME/Door/3-Production"  # Anpassen an dein Vault
set -g ALPHAOS_WEEK (date +%G-W%V)  # ISO Week (2024-W01)

# ============================================================================
# PLAN - War Stack (Kapitel 27-28: Door War, War Stack)
# Strategic Weekly Planning
# ============================================================================

function alphaos_war_create
    set today (date +%Y-%m-%d)
    set war_id (date +%s)
    set war_dir "$ALPHAOS_OBSIDIAN/War_Stacks/$ALPHAOS_WEEK"
    
    mkdir -p $war_dir
    
    echo "⚔️ WAR STACK CREATION - PLAN PHASE"
    echo "═══════════════════════════════════════════"
    echo "Week: $ALPHAOS_WEEK"
    echo ""
    
    # War Stack Questions (Kapitel 28)
    read -P "📋 War Stack Title: " title
    read -P "🎯 Domain (Body/Being/Balance/Business): " domain
    read -P "🔧 Sub-Domain: " subdomain
    
    echo ""
    echo "🚪 THE DOMINO DOOR"
    read -P "What specific Door are you aiming to unlock? " door
    
    echo ""
    echo "⚡ THE TRIGGER"
    read -P "What person or event sparked your desire to open this Door? " trigger
    
    echo ""
    echo "📖 THE NARRATIVE"
    read -P "What story are you telling yourself about this Door? " narrative
    
    echo ""
    echo "✅ VALIDATION"
    read -P "Why does opening this Door feel necessary? " validation
    
    echo ""
    echo "💥 IMPACT OF OPENING"
    read -P "How would opening this Door change your situation? " impact
    
    echo ""
    echo "⚠️ CONSEQUENCES OF INACTION"
    read -P "What happens if this Door stays closed? " consequences
    
    # The 4 Hits (Fact-Obstacle-Strike)
    echo ""
    echo "🎯 THE 4 HITS (Mon-Thu Execution)"
    echo "═══════════════════════════════════"
    
    set hits "[]"
    for i in (seq 1 4)
        set days "Monday" "Tuesday" "Wednesday" "Thursday"
        set day $days[$i]
        
        echo ""
        echo "--- HIT $i ($day) ---"
        read -P "📊 FACT $i (measurable result): " fact
        read -P "🚧 OBSTACLE $i: " obstacle  
        read -P "⚔️ STRIKE $i (strategy): " strike
        read -P "👤 RESPONSIBILITY: " responsibility
        
        set hit "{
      \"id\": $i,
      \"day\": \"$day\",
      \"fact\": \"$fact\",
      \"obstacle\": \"$obstacle\", 
      \"strike\": \"$strike\",
      \"responsibility\": \"$responsibility\",
      \"completed\": false
    }"
        
        set hits (echo $hits | jq ". += [$hit]")
    end
    
    # Closing Questions
    echo ""
    echo "🎓 CLOSING REFLECTION"
    read -P "💡 Key insights from this process: " insights
    read -P "📚 Most important lesson learned: " lessons
    
    # War Stack Data Structure
    set war_data "{
  \"id\": $war_id,
  \"title\": \"$title\",
  \"domain\": \"$domain\",
  \"subdomain\": \"$subdomain\",
  \"week\": \"$ALPHAOS_WEEK\",
  \"door\": \"$door\",
  \"trigger\": \"$trigger\",
  \"narrative\": \"$narrative\",
  \"validation\": \"$validation\",
  \"impact\": \"$impact\",
  \"consequences\": \"$consequences\",
  \"hits\": $hits,
  \"insights\": \"$insights\",
  \"lessons\": \"$lessons\",
  \"created\": \"$today\",
  \"status\": \"active\"
}"
    
    # Speichere JSON
    set war_file "$ALPHAOS_HOME/data/warstacks/$war_id.json"
    mkdir -p (dirname $war_file)
    echo $war_data | jq . > $war_file
    
    # Erstelle Obsidian War Stack Note
    set md_content "# War Stack: $title

**Week:** $ALPHAOS_WEEK  
**Domain:** $domain > $subdomain  
**Created:** $today

## 🚪 The Domino Door
$door

## ⚡ Trigger
$trigger

## 📖 Current Narrative
$narrative

## ✅ Why Necessary
$validation

## 💥 Impact of Opening
$impact

## ⚠️ Consequences of Inaction
$consequences

## 🎯 The 4 Hits (Mon-Thu)
"

    for i in (seq 1 4)
        set hit (echo $hits | jq -r ".[$((i-1))]")
        set day (echo $hit | jq -r '.day')
        set fact (echo $hit | jq -r '.fact')
        set obstacle (echo $hit | jq -r '.obstacle')
        set strike (echo $hit | jq -r '.strike')
        set responsibility (echo $hit | jq -r '.responsibility')
        
        set md_content "$md_content

### Hit $i - $day
- **Fact:** $fact
- **Obstacle:** $obstacle
- **Strike:** $strike
- **Responsible:** $responsibility
- **Status:** ⭕ Pending
"
    end
    
    set md_content "$md_content

## 💡 Key Insights
$insights

## 📚 Lessons Learned
$lessons

---
*War Stack ID: $war_id*  
*Alpha OS - The Door System*
"
    
    echo $md_content > "$war_dir/war-stack-$title.md"
    
    echo ""
    echo "✅ WAR STACK CREATED!"
    echo "📁 Obsidian: $war_dir/war-stack-$title.md"
    echo "💾 JSON: $war_file"
    echo ""
    echo "🎯 NEXT: Generiere Fire Map mit 'alphaos fire generate'"
end

