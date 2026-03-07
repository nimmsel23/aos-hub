# Custom aos dashboard entries (bash)
# Loaded by aos when present.

# Core4 Taskwarrior reports
aos_dashboard_register "t" "Core4" "Core4 today" "Taskwarrior Core4 done today" \
  task core4.today

aos_dashboard_register "w" "Core4" "Core4 week" "Taskwarrior Core4 done this week" \
  task core4.week

aos_dashboard_register "x" "Core4" "Core4 done" "Taskwarrior Core4 completed" \
  task core4.done

aos_dashboard_register "p" "Core4" "Core4 pending" "Taskwarrior Core4 pending" \
  task +core4 status:pending
