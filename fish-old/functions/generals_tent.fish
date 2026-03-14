#!/usr/bin/env fish

#============================================================================
# GENERAL'S TENT - Strategic Weekly Review (Bin ich auf Kurs?)
# Kapitel 41: "Strategic reflection, recalibrate, and reignite"
#============================================================================

function alphaos_generals_tent
    echo "🏕️ THE GENERAL'S TENT - STRATEGIC SANCTUARY"
    echo "═══════════════════════════════════════════════════"
    echo "Week: $ALPHAOS_WEEK"
    echo ""
    echo "\"In the relentless pursuit of your vision, amid the vast"
    echo "battlefields of life, there exists a sacred space.\""
    echo ""
    echo "\"Here, you sit at a sturdy table covered in maps, symbols"
    echo "of the week's battles. Across from you sits the most"
    echo "important of allies: GOD.\""
    echo ""

    # ============================================================================
    # COMPONENT #1: RETURN AND REPORT
    # Strategic Alignment Assessment
    # ============================================================================
    
    echo "📊 COMPONENT #1: RETURN AND REPORT"
    echo "─────────────────────────────────────────"
    echo "\"With brutal honesty, assess your progress:\""
    echo ""

    # Annual Freedom Game Status
    echo "🗺️ ANNUAL FREEDOM GAME (Long-term Vision):"
    read -P "Are you ON TRACK or OFF TRACK with your yearly goals? " freedom_status
    if test "$freedom_status" = "OFF TRACK"
        read -P "What's causing the deviation? " freedom_deviation
    end

    # Monthly Mission Status  
    echo ""
    echo "🎯 MONTHLY MISSION (Focus Map):"
    read -P "Are you GAINING or LOSING momentum this month? " focus_momentum
    read -P "Rate your monthly progress (1-10): " monthly_score

    # Weekly Fire Map Results
    echo ""
    echo "🔥 WEEKLY FIRE MAP (This Week's Battle):"
    
    # Load profit data if available
    set profit_file "$ALPHAOS_HOME/data/profit/execution/$ALPHAOS_WEEK.json"
    if test -f $profit_file
        set profit_data (cat $profit_file)
        set execution_percent (echo $profit_data | jq '.execution.percentage')
        set door_status (echo $profit_data | jq -r '.door_status')
        set profit_grade (echo $profit_data | jq -r '.profit_grade')
        
        echo "   Execution Score: $execution_percent%"
        echo "   Door Status: $door_status"
        echo "   Grade: $profit_grade"
        
        if test $execution_percent -ge 70
            set weekly_status "WIN"
        else
            set weekly_status "LOSS"
        end
    else
        read -P "Did you WIN or LOSE this week's battle? " weekly_status
        read -P "Weekly execution score (0-100%): " execution_percent
    end

    # Alpha Score - Daily Game Performance
    echo ""
    echo "🎯 ALPHA SCORE (Daily Game Performance):"
    echo "\"Dive into the details of the Daily Game:\""
    
    # The Core Score (Body, Being, Balance, Business)
    echo ""
    echo "--- THE CORE (Daily Commitments) ---"
    read -P "Body commitments completed this week (0-7): " core_body
    read -P "Being commitments completed this week (0-7): " core_being  
    read -P "Balance commitments completed this week (0-7): " core_balance
    read -P "Business commitments completed this week (0-7): " core_business
    
    set total_core (math $core_body + $core_being + $core_balance + $core_business)
    set core_percentage (math "round($total_core / 28 * 100)")
    echo "   CORE TOTAL: $total_core/28 ($core_percentage%)"

    # The Voice Score (Daily Reflection/Prayer)
    echo ""
    echo "--- THE VOICE (Daily Connection) ---"
    read -P "Voice sessions completed this week (0-7): " voice_score
    set voice_percentage (math "round($voice_score / 7 * 100)")
    echo "   VOICE TOTAL: $voice_score/7 ($voice_percentage%)"

    # The Door Score (Daily Priority Actions)  
    echo ""
    echo "--- THE DOOR (Daily Priority Execution) ---"
    read -P "Daily priority actions completed (0-21): " door_daily_score
    set door_daily_percentage (math "round($door_daily_score / 21 * 100)")
    echo "   DOOR DAILY TOTAL: $door_daily_score/21 ($door_daily_percentage%)"

    # Overall Alpha Score
    set alpha_total (math $total_core + $voice_score + $door_daily_score)
    set alpha_percentage (math "round($alpha_total / 56 * 100)")
    echo ""
    echo "🏆 OVERALL ALPHA SCORE: $alpha_total/56 ($alpha_percentage%)"

    # ============================================================================
    # COMPONENT #2: LESSONS LEARNED  
    # Strategic Intelligence Gathering
    # ============================================================================
    
    echo ""
    echo "📚 COMPONENT #2: LESSONS LEARNED"
    echo "─────────────────────────────────────────"
    echo "\"The week isn't just about numbers or metrics."
    echo "Every day brings lessons.\""
    echo ""

    read -P "What WORKED exceptionally well this week? " what_worked
    echo ""
    read -P "What DIDN'T WORK or failed this week? " what_failed
    echo ""
    read -P "What is the KEY LESSON for exponential growth? " key_lesson
    echo ""
    read -P "How can you apply this lesson across all four domains? " cross_domain_lesson

    # ============================================================================
    # COMPONENT #3: COURSE CORRECTION
    # Strategic Realignment  
    # ============================================================================
    
    echo ""
    echo "🎯 COMPONENT #3: COURSE CORRECTION"
    echo "─────────────────────────────────────────"
    echo "\"Mistakes happen. What matters is how you respond.\""
    echo ""

    # Identify drift areas
    set correction_needed "false"
    
    if test "$freedom_status" = "OFF TRACK"
        set correction_needed "true"
        echo "🚨 ANNUAL DRIFT DETECTED"
    end
    
    if test "$focus_momentum" = "LOSING"
        set correction_needed "true"
        echo "⚠️ MONTHLY MOMENTUM LOSS"
    end
    
    if test $alpha_percentage -lt 70
        set correction_needed "true"
        echo "📉 ALPHA SCORE BELOW STANDARD"
    end

    if test "$correction_needed" = "true"
        echo ""
        read -P "What specific ADJUSTMENTS will get you back on track? " strategic_adjustments
        read -P "What will you STOP doing that's not serving you? " stop_doing
        read -P "What will you START doing to accelerate progress? " start_doing
        read -P "What will you CONTINUE doing that's working? " continue_doing
    else
        echo "✅ NO MAJOR COURSE CORRECTION NEEDED"
        echo "Continue current trajectory with minor optimizations."
        read -P "What minor optimizations will you make? " minor_optimizations
        set strategic_adjustments $minor_optimizations
        set stop_doing "No major stops needed"
        set start_doing "No major starts needed"  
        set continue_doing "Current successful patterns"
    end

    # ============================================================================
    # COMPONENT #4: NEW TARGETS
    # Strategic Target Setting
    # ============================================================================
    
    echo ""
    echo "🎯 COMPONENT #4: NEW TARGETS"
    echo "─────────────────────────────────────────"
    echo "\"With the wisdom of the past week and a clear view"
    echo "of the path ahead, set new targets.\""
    echo ""

    # Next week's primary focus
    read -P "What is next week's PRIMARY FOCUS (the new Door)? " next_week_door
    echo ""
    read -P "What specific TARGETS align with your Monthly Mission? " monthly_targets
    echo ""
    read -P "What HABITS will you strengthen or build? " habit_targets
    echo ""
    
    # Commitment level
    echo "🔥 COMMITMENT LEVEL"
    read -P "On a scale of 1-10, how committed are you to next week? " commitment_level
    
    if test $commitment_level -lt 8
        echo "⚠️ Low commitment detected."
        read -P "What would increase your commitment to a 9 or 10? " commitment_boost
    else
        echo "🔥 HIGH COMMITMENT! Ready for battle!"
        set commitment_boost "Already at high commitment"
    end

    # ============================================================================
    # DIVINE COMMUNION & REFLECTION
    # Strategic Spiritual Alignment
    # ============================================================================
    
    echo ""
    echo "🙏 DIVINE COMMUNION"
    echo "─────────────────────"
    echo "\"A moment of communion with the divine...\""
    echo ""
    
    read -P "What is God teaching you through this week's challenges? " divine_lesson
    read -P "What are you most grateful for this week? " gratitude
    read -P "What prayer/intention do you set for next week? " prayer_intention

    # ============================================================================
    # TENT ASSESSMENT & GRADE
    # Strategic Performance Evaluation
    # ============================================================================
    
    echo ""
    echo "🏕️ TENT ASSESSMENT"
    echo "─────────────────────"
    
    # Calculate Strategic Alignment Score
    set alignment_factors 0
    
    # Freedom alignment (25%)
    if test "$freedom_status" = "ON TRACK"
        set alignment_factors (math $alignment_factors + 25)
    end
    
    # Monthly momentum (25%) 
    if test "$focus_momentum" = "GAINING"
        set alignment_factors (math $alignment_factors + 25)
    else if test $monthly_score -ge 7
        set alignment_factors (math $alignment_factors + 15)
    else if test $monthly_score -ge 5
        set alignment_factors (math $alignment_factors + 10)
    end
    
    # Weekly execution (25%)
    if test "$weekly_status" = "WIN"
        set alignment_factors (math $alignment_factors + 25)
    else if test $execution_percent -ge 60
        set alignment_factors (math $alignment_factors + 15)
    end
    
    # Alpha Score (25%)
    if test $alpha_percentage -ge 80
        set alignment_factors (math $alignment_factors + 25)
    else if test $alpha_percentage -ge 70
        set alignment_factors (math $alignment_factors + 20)
    else if test $alpha_percentage -ge 60
        set alignment_factors (math $alignment_factors + 15)
    else if test $alpha_percentage -ge 50
        set alignment_factors (math $alignment_factors + 10)
    end

    # Strategic Alignment Grade
    if test $alignment_factors -ge 90
        set strategic_grade "A+"
        echo "🏆 STRATEGIC MASTERY! On track across all domains!"
    else if test $alignment_factors -ge 80
        set strategic_grade "A"
        echo "🥇 EXCELLENT ALIGNMENT! Strong strategic position!"
    else if test $alignment_factors -ge 70
        set strategic_grade "B"
        echo "💪 GOOD ALIGNMENT! Minor course corrections needed!"
    else if test $alignment_factors -ge 60
        set strategic_grade "C"
        echo "⚠️ MODERATE DRIFT! Strategic realignment required!"
    else if test $alignment_factors -ge 50
        set strategic_grade "D"
        echo "🚨 SIGNIFICANT DRIFT! Major course correction needed!"
    else
        set strategic_grade "F"
        echo "🔴 STRATEGIC CRISIS! Complete realignment required!"
    end

    # ============================================================================
    # SAVE TENT DATA
    # ============================================================================
    
    set tent_data "{
  \"week\": \"$ALPHAOS_WEEK\",
  \"date\": \"$(date -Iseconds)\",
  \"return_report\": {
    \"freedom_status\": \"$freedom_status\",
    \"focus_momentum\": \"$focus_momentum\",
    \"monthly_score\": $monthly_score,
    \"weekly_status\": \"$weekly_status\",
    \"execution_percent\": $execution_percent
  },
  \"alpha_score\": {
    \"core\": {
      \"body\": $core_body,
      \"being\": $core_being,
      \"balance\": $core_balance,
      \"business\": $core_business,
      \"total\": $total_core,
      \"percentage\": $core_percentage
    },
    \"voice\": {
      \"score\": $voice_score,
      \"percentage\": $voice_percentage
    },
    \"door_daily\": {
      \"score\": $door_daily_score,
      \"percentage\": $door_daily_percentage
    },
    \"total\": $alpha_total,
    \"percentage\": $alpha_percentage
  },
  \"lessons_learned\": {
    \"what_worked\": \"$what_worked\",
    \"what_failed\": \"$what_failed\",
    \"key_lesson\": \"$key_lesson\",
    \"cross_domain_lesson\": \"$cross_domain_lesson\"
  },
  \"course_correction\": {
    \"correction_needed\": \"$correction_needed\",
    \"strategic_adjustments\": \"$strategic_adjustments\",
    \"stop_doing\": \"$stop_doing\",
    \"start_doing\": \"$start_doing\",
    \"continue_doing\": \"$continue_doing\"
  },
  \"new_targets\": {
    \"next_week_door\": \"$next_week_door\",
    \"monthly_targets\": \"$monthly_targets\",
    \"habit_targets\": \"$habit_targets\",
    \"commitment_level\": $commitment_level
  },
  \"divine_communion\": {
    \"divine_lesson\": \"$divine_lesson\",
    \"gratitude\": \"$gratitude\",
    \"prayer_intention\": \"$prayer_intention\"
  },
  \"strategic_assessment\": {
    \"alignment_score\": $alignment_factors,
    \"strategic_grade\": \"$strategic_grade\"
  }
}"

    # Add conditional fields
    if test "$freedom_status" = "OFF TRACK"
        set tent_data (echo $tent_data | jq ".return_report.freedom_deviation = \"$freedom_deviation\"")
    end
    
    if test $commitment_level -lt 8
        set tent_data (echo $tent_data | jq ".new_targets.commitment_boost = \"$commitment_boost\"")
    end

    set tent_file "$ALPHAOS_HOME/data/tent/reviews/$ALPHAOS_WEEK.json"
    mkdir -p (dirname $tent_file)
    echo $tent_data | jq . > $tent_file

    # ============================================================================
    # CREATE OBSIDIAN TENT NOTE
    # ============================================================================
    
    set tent_note "$ALPHAOS_OBSIDIAN/Generals_Tent/Week-$ALPHAOS_WEEK.md"
    mkdir -p (dirname $tent_note)
    
    set tent_content "# General's Tent - Week $ALPHAOS_WEEK

*\"Here, you sit at a sturdy table covered in maps, symbols of the week's battles. Across from you sits the most important of allies: GOD.\"*

## 📊 Return and Report

**Annual Freedom Game:** $freedom_status
**Monthly Mission:** $focus_momentum (Score: $monthly_score/10)
**Weekly Fire Map:** $weekly_status ($execution_percent% execution)

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

**Correction Needed:** $correction_needed

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

---
*\"What happens in The General's Tent is more than a review; it's a commitment.\"*
*Week $ALPHAOS_WEEK Strategic Review*
"

    echo $tent_content > $tent_note

    # ============================================================================
    # CLOSING CEREMONY
    # ============================================================================
    
    echo ""
    echo "✅ GENERAL'S TENT SESSION COMPLETE"
    echo "═══════════════════════════════════════════"
    echo "📁 Obsidian: $tent_note"
    echo "💾 Data: $tent_file"
    echo "🎯 Strategic Grade: $strategic_grade"
    echo "📊 Alignment Score: $alignment_factors/100"
    echo ""
    echo "\"With the wisdom of the past week and divine guidance,"
    echo "you are prepared for the battles ahead.\""
    echo ""
    echo "🚪 NEXT: Plan next week's War Stack with '$next_week_door'"
end
