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
# PROFIT - General's Tent (Kapitel 30: Profit, Kapitel 41: General's Tent)
# Weekly Review & Analysis
# ============================================================================

function alphaos_profit_review
    echo "🏕️ GENERAL'S TENT - WEEKLY REVIEW"
    echo "═══════════════════════════════════════════"
    echo "Week: $ALPHAOS_WEEK"
    echo ""
    echo "\"In the relentless pursuit of your vision, amid the vast"
    echo "battlefields of life, there exists a sacred space.\""
    echo ""
    
    # Component #1: Return and Report
    echo "📊 COMPONENT #1: RETURN AND REPORT"
    echo "─────────────────────────────────────────"
    
    # Freedom Maps Status (Annual)
    read -P "Annual Freedom Game Status (On Track/Off Track): " freedom_status
    
    # Focus Maps Status (Monthly) 
    read -P "Monthly Mission Status (Gaining/Losing momentum): " focus_status
    
    # Fire Maps Status (Weekly)
    alphaos_fire_status > /tmp/fire_status.txt
    set fire_summary (grep "Total:" /tmp/fire_status.txt)
    echo "Fire Map: $fire_summary"
    
    # Alpha Score (Daily Core)
    set core_stats (alphaos_core_weekly)
    echo "Core Score: $core_stats"
    
    # Component #2: Lessons Learned
    echo ""
    echo "📚 COMPONENT #2: LESSONS LEARNED"
    echo "─────────────────────────────────────────"
    read -P "What worked this week? " what_worked
    read -P "What didn't work? " what_didnt_work
    read -P "Key lesson for exponential growth: " key_lesson
    
    # Component #3: Course Correction
    echo ""
    echo "🎯 COMPONENT #3: COURSE CORRECTION"
    echo "─────────────────────────────────────────"
    read -P "What needs adjustment to get back on track? " course_correction
    read -P "How will you apply lessons across domains? " cross_domain_application
    
    # Component #4: New Targets
    echo ""
    echo "🎯 COMPONENT #4: NEW TARGETS"
    echo "─────────────────────────────────────────"
    read -P "Next week's primary focus: " next_week_focus
    read -P "Specific targets aligned with Monthly Mission: " specific_targets
    
    # Speichere Review
    set review_data "{
  \"week\": \"$ALPHAOS_WEEK\",
  \"date\": \"$(date -Iseconds)\",
  \"return_report\": {
    \"freedom_status\": \"$freedom_status\",
    \"focus_status\": \"$focus_status\",
    \"fire_summary\": \"$fire_summary\",
    \"core_stats\": \"$core_stats\"
  },
  \"lessons_learned\": {
    \"what_worked\": \"$what_worked\",
    \"what_didnt_work\": \"$what_didnt_work\",
    \"key_lesson\": \"$key_lesson\"
  },
  \"course_correction\": {
    \"adjustments\": \"$course_correction\",
    \"cross_domain\": \"$cross_domain_application\"
  },
  \"new_targets\": {
    \"next_week_focus\": \"$next_week_focus\",
    \"specific_targets\": \"$specific_targets\"
  }
}"
    
    set review_file "$ALPHAOS_HOME/data/profit/reviews/$ALPHAOS_WEEK.json"
    mkdir -p (dirname $review_file)
    echo $review_data | jq . > $review_file
    
    # Erstelle Obsidian Review Note
    set review_content "# General's Tent Review - $ALPHAOS_WEEK

*\"Here, you sit at a sturdy table covered in maps, symbols of the week's battles. Across from you sits the most important of allies: GOD.\"*

## 📊 Return and Report

**Annual Freedom Game:** $freedom_status  
**Monthly Mission:** $focus_status  
**Weekly Fire Map:** $fire_summary  
**Daily Core Score:** $core_stats

## 📚 Lessons Learned

**What Worked:** $what_worked

**What Didn't Work:** $what_didnt_work

**Key Lesson:** $key_lesson

## 🎯 Course Correction

**Adjustments Needed:** $course_correction

**Cross-Domain Application:** $cross_domain_application

## 🎯 New Targets

**Next Week Focus:** $next_week_focus

**Specific Targets:** $specific_targets

---
*\"What happens in The General's Tent is more than a review; it's a commitment.\"*  
*Alpha OS - Week $ALPHAOS_WEEK Review*
"
    
    set obsidian_review "$ALPHAOS_OBSIDIAN/Reviews/Week-$ALPHAOS_WEEK.md"
    mkdir -p (dirname $obsidian_review)
    echo $review_content > $obsidian_review
    
    echo ""
    echo "✅ WEEKLY REVIEW COMPLETED"
    echo "📁 Obsidian: $obsidian_review"
    echo "💾 Data: $review_file"
    echo ""
    echo "🎯 Ready for next week's War Stack!"
end

