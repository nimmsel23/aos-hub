# THE GAME ---------------------------------------
#everything FIRE
alias tF "task add +fire"  #add Fire Task

# view maps (custom reports ~/.taskrc)
abbr -a Doorlist	"task door"
abbr -a Hotlist     "task hotlist"
abbr -a Hitlist     "task hits"
abbr -a Strikes     "task strikes"
abbr -a Firemap 	"task fire"      #view Fire Map
abbr -a fireweek "t fire && t firew"
abbr -a firemap  "task core && task fire" 
abbr -a core4    "task fire && task core"

# THE DOOR --------------------------------------
# add Potential
abbr -a ahot       "ta +hotlist"
# add Plan
abbr -a adoor      "ta +DOOR"
# add Production
abbr -a afire       "ta +fire"

abbr -a Fbody     "task add due:+2d +fire project:BODY"
abbr -a Fbeing    "task add due:+2d +fire project:BEING"
abbr -a Fbalance  "ta due:+2d +fire project:BALANCE"
abbr -a Fbusiness "ta due:+2d +fire project:BUSINESS"
abbr -a Ftraining "ta add +fire project:BODY +fitness " 
abbr -a Fmeditation "ta +fire project:BEING +meditation"
# add Profit

# THE CORE FOUR --------------------------
# add Task by Domain for next week!
abbr -a Body "ta Body nw Training"
abbr -a Being "ta Being nw Meditate" 
abbr -a Balance "ta Balance nw Socialize"
abbr -a Business "ta Business nw Working"

# --- Taskwarrior The Core Four-Kontexte ---
abbr -a CORE "task context CORE4 && t fire"
abbr -a BODY     "BODY  && t fire"
abbr -a BEING    "task context BEING  && t fire"
abbr -a BALANCE  "task context BALANCE && t fire"
abbr -a BUSINESS "task context BUSINESS && t fire"
abbr -a NONE     "task context none && uff"

# --- Core4 Beispiel-Tasks ---
abbr -a tafitness "task add project:BODY  +fitness  due:+7d wait:monday did you sweat today?"
abbr -a tafuel    "task add project:BODY  +fuel   due:+7d wait:monday did you nourish your body?"
abbr -a tamedi    "task add project:BEING +meditation due:+7d wait:monday did you meditate today?"
abbr -a tamemo    "task add project:BEING   +memoirs  due:+7d wait:monday did you write today?"
abbr -a tapartner  "task add project:BALANCE +partner  due:+7d wait:monday did you text somebody?"
abbr -a tadeclare  "task add project:BUSINESS +declare  due:+7d wait:monday"
abbr -a tadiscover "task add project:BUSINESS +discover due:+7d wait:monday"

# --- Tasks schnell erstellen ----
abbr -a ta   "task add"
abbr -a td   "task done"
abbr -a te   "task edit"
abbr -a tn   "task next"
abbr -a tdel 	"task del"

