# Alpha OS Fish Abbreviations
abbr -a Heute	     "ta due:today"
abbr -a Morgen	     "ta due:tomorrow wait:tomorrow"
abbr -a Montag       "ta due:monday wait:monday"
abbr -a Dienstag     "ta due:tuesday wait:tuesday"
abbr -a Mittwoch     "ta due:wednesday wait:wednesday"
abbr -a Donnerstag   "ta due:thursday wait:thursday"
abbr -a Freitag      "ta due:friday wait:friday"

alias workout="project:BODY.Workout +Training pillar:game domain:body due:tuesday wait:monday"
abbr -a Training "task add workout" 

# --- Git Quick ---
abbr -a gs "git status"
abbr -a ga "git add ."
abbr -a gc "git commit -m"
abbr -a gp "git push"
abbr -a gl "git log --oneline --graph"

# --- Taskwarrior-Sync / Score (wenn du core4_score.py etc. nutzt) ---
abbr -a tscore "core4_score.py"
abbr -a tsend "task export | tee ~/task_export.json | wl-clip -sel clip"

# --- Terminal Quicknav / AlphaOS ---
abbr -a dev "cd ~/dev && ls"
abbr -a bin "cd ~/bin && ls"
#abbr -a alpha_ "cd ~/.alpha_os && ls"
#abbr -a syncos "bash ~/bin/sync_alpha_os_gdrive.sh"

